/* =========================================================
   TRACKING.JS — Lógica pública de rastreo de servicios
   ========================================================= */

// Detectar origen de forma inteligente:
// - file://       → URL absoluta al backend
// - :8000         → mismo servidor FastAPI, URL relativa
// - :5500 / otro  → Live Server u otro, URL absoluta al backend
const TRACK_API_BASE = (() => {
    const proto = window.location.protocol;
    const port  = window.location.port;
    if (proto === 'file:')  return 'http://127.0.0.1:8000'; // archivo local
    if (port  === '8000')   return '';                       // mismo servidor FastAPI
    return 'http://127.0.0.1:8000';                         // Live Server u otro origen
})();

console.log('[TransFleet] API base:', TRACK_API_BASE || '(mismo origen)');

let trackingMap    = null;
let trackingMarker = null;
let trackCarIcon   = null;
let pollingInterval = null; // Para actualizaciones automáticas

/* =========================================================
   INICIALIZAR EL MAPA (Estilo Centro de Control)
   ========================================================= */
function initTrackingMap() {
    if (trackingMap) return;

    trackCarIcon = null;

    const boundsDR = L.latLngBounds(
        L.latLng(17.47, -72.0), // Suroeste
        L.latLng(19.95, -68.32) // Noreste
    );

    trackingMap = L.map("tracking-map", {
        center:   [18.4861, -69.9312],
        zoom:     11,
        minZoom:  8,
        maxZoom:  18,
        maxBounds: boundsDR,
        maxBoundsViscosity: 1.0,
        zoomControl: false // Los controles los ponemos nosotros como en Centro de Control
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom:     19
    }).addTo(trackingMap);
}

/**
 * Genera un icono circular con la foto del conductor (estilo Centro de Control)
 */
function _getDriverIcon(fotoUrl, nombre) {
    const url = fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=3b82f6&color=fff&bold=true`;
    
    return L.divIcon({
        className: 'custom-driver-icon',
        html: `
            <div class="driver-marker-container">
                <div class="driver-marker-photo">
                    <img src="${url}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=3b82f6&color=fff'">
                </div>
                <div class="driver-marker-arrow"></div>
            </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -45]
    });
}

/* =========================================================
   MOSTRAR MAPA (Sustituye el hero)
   ========================================================= */
function showMapMode(codigo) {
    // 1. Ocultar el Hero completo (texto + buscador inicial)
    const hero = document.getElementById("tf-hero");
    if (hero) hero.style.display = "none";

    // 2. Mostrar la sección del mapa full
    const section = document.getElementById("map-section");
    if (section) section.classList.add("show");

    // 3. Actualizar el código en el overlay del mapa
    const overlayLabel = document.getElementById("overlay-codigo-label");
    if (overlayLabel) overlayLabel.textContent = `Servicio #${codigo}`;

    // 4. Asegurar que las instrucciones de abajo sigan visibles
    const howSection = document.getElementById("how-section");
    if (howSection) howSection.style.display = "block";

    // 5. Inicializar y refrescar Leaflet
    initTrackingMap();
    setTimeout(() => {
        if (trackingMap) trackingMap.invalidateSize();
    }, 300);
}

/* =========================================================
   VOLVER A BUSCAR (Restaura el Hero)
   ========================================================= */
function volverABuscar() {
    // 0. Detener el polling si existe
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }

    // 1. Mostrar el Hero
    const hero = document.getElementById("tf-hero");
    if (hero) hero.style.display = "flex";

    // 2. Ocultar el mapa
    const section = document.getElementById("map-section");
    if (section) section.classList.remove("show");

    // 3. Limpiar estado y buscador
    clearStatus();
    const input = document.getElementById("service-code");
    if (input) { 
        input.value = ""; 
        setTimeout(() => input.focus(), 100);
    }
}

/* =========================================================
   BANNER DE ESTADOS
   ========================================================= */
function setStatus(type, icon, message) {
    const banner = document.getElementById("status-banner");
    if (!banner) return;
    banner.className = `tf-status-banner show ${type}`;
    banner.innerHTML = `<i class="bi ${icon} fs-5"></i><span>${message}</span>`;
}

function clearStatus() {
    const banner = document.getElementById("status-banner");
    if (banner) banner.className = "tf-status-banner";
}

/* =========================================================
   CARD DEL CONDUCTOR (Overlay)
   ========================================================= */
function updateDriverOverlay(data) {
    const img   = document.getElementById("track-driver-img");
    const name  = document.getElementById("track-driver-name");
    const meta  = document.getElementById("track-driver-meta");

    const nombre = data.nombre || "Conductor asignado";
    const foto   = data.imagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=3b82f6&color=fff&bold=true&size=128`;
    
    if (img)   img.src = foto;
    if (name)  name.textContent = nombre;
    if (meta)  meta.textContent = `ID: ${data.driver_id} · ${data.velocidad || 0} km/h`;
}

/* =========================================================
   MARCADOR EN EL MAPA
   ========================================================= */
function placeMarker(lat, lng, nombre) {
    if (trackingMarker) {
        trackingMap.removeLayer(trackingMarker);
        trackingMarker = null;
    }

    trackingMap.setView([lat, lng], 16);

    trackingMarker = L.marker([lat, lng], { icon: trackCarIcon })
        .addTo(trackingMap)
        .bindPopup(`
            <div style="font-family:'Inter',sans-serif;padding:4px;min-width:150px;">
                <strong style="color:#3b82f6;">${nombre}</strong><br>
                <small style="color:#64748b;">Posición actual · Tiempo real</small>
            </div>
        `)
        .openPopup();
}

/* =========================================================
   FUNCIÓN PRINCIPAL: RASTREAR SERVICIO
   ========================================================= */
async function rastrearServicio() {
    const input  = document.getElementById("service-code");
    const codigo = input ? input.value.trim() : "";

    if (!codigo) {
        setStatus("warning", "bi-exclamation-circle", "Por favor ingresa el código de tu servicio.");
        if (input) input.focus();
        return;
    }

    const btn = document.getElementById("search-btn");
    if (btn) btn.classList.add("loading");
    setStatus("info", "bi-arrow-repeat", "Consultando tu servicio…");

    try {
        const url = `${TRACK_API_BASE}/locations/track/${codigo}`;
        const response = await fetch(url, {
            credentials: "omit",
            headers: { "Accept": "application/json" }
        });

        const data = await response.json();

        if (data.error) {
            if (data.status === "programado") {
                setStatus("warning", "bi-clock-history", data.error);
            } else {
                setStatus("error", "bi-search", data.error);
            }
            return;
        }

        // ¡Éxito!
        clearStatus();
        showMapMode(codigo);
        
        // Actualizar overlay con info del conductor si existe
        if (data.conductor) {
            updateDriverOverlay({
                nombre: data.conductor.nombre,
                imagen: data.conductor.imagen,
                driver_id: data.request_id,
                velocidad: data.conductor.velocidad
            });
        }
        
        // Dibujar primera vez
        placeTrackingMarkers(data);

        // Iniciar POLLING para seguimiento en tiempo real
        if (!pollingInterval) {
            pollingInterval = setInterval(async () => {
                try {
                    const res = await fetch(url, { credentials: "omit" });
                    const newData = await res.json();
                    if (!newData.error) {
                        // Actualizar solo lo necesario
                        placeTrackingMarkers(newData);
                        if (newData.conductor) {
                            updateDriverOverlay({
                                nombre: newData.conductor.nombre,
                                imagen: newData.conductor.imagen,
                                driver_id: newData.request_id,
                                velocidad: newData.conductor.velocidad
                            });
                        }
                    }
                } catch (e) {
                    console.warn("Error en polling:", e);
                }
            }, 3000);
        }

    } catch (err) {
        console.error("[TransFleet] Error:", err);
        setStatus("error", "bi-wifi-off", `Error al conectar: ${err.message}`);
    } finally {
        if (btn) btn.classList.remove("loading");
    }
}

let originMarker       = null;
let destinationMarker  = null;
let driverMarker       = null;
let staticPolyline     = null; // Origen -> Destino (Verde)
let dynamicPolyline    = null; // Conductor -> Origen (Azul)

// ── Iconos reutilizables ────────────────────────────────────────────
function makeLetterIcon(letter, color) {
    return L.divIcon({
        className: '',
        html: `<div style="
            background:${color}; width:32px; height:32px;
            border-radius:50%; border:3px solid white;
            display:flex; align-items:center; justify-content:center;
            box-shadow:0 4px 14px ${color}66;
            font-size:0.9rem; color:white; font-weight:800;">${letter}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -15]
    });
}

/**
 * Dibuja los marcadores y rutas de forma atómica
 */
async function placeTrackingMarkers(data) {
    if (!trackingMap) return;

    const tieneOrigen    = data.origen  && data.origen.lat  != null && data.origen.lng  != null;
    const tieneDestino   = data.destino && data.destino.lat != null && data.destino.lng != null;
    const tieneConductor = data.conductor && data.conductor.lat != null && data.conductor.lng != null;

    // ── 1. Marcadores Estáticos (Solo se crean una vez) ───────────
    if (tieneOrigen && !originMarker) {
        originMarker = L.marker([data.origen.lat, data.origen.lng], {
            icon: makeLetterIcon('A', '#3b82f6')
        }).addTo(trackingMap).bindPopup(`<b>Origen:</b> ${data.origen.nombre}`);
    }
    if (tieneDestino && !destinationMarker) {
        destinationMarker = L.marker([data.destino.lat, data.destino.lng], {
            icon: makeLetterIcon('B', '#10b981')
        }).addTo(trackingMap).bindPopup(`<b>Destino:</b> ${data.destino.nombre}`);
    }

    // ── 2. Marcador del Conductor (Atómico) ────────────────────────
    if (tieneConductor) {
        const pos = [data.conductor.lat, data.conductor.lng];
        if (!driverMarker) {
            driverMarker = L.marker(pos, { 
                icon: _getDriverIcon(data.conductor.imagen, data.conductor.nombre) 
            }).addTo(trackingMap);
            
            // Primera vez: Centrar mapa
            trackingMap.setView(pos, 15);
        } else {
            // Mover suavemente
            driverMarker.setLatLng(pos);
            // Actualizar icono por si cambió la imagen
            driverMarker.setIcon(_getDriverIcon(data.conductor.imagen, data.conductor.nombre));
        }
    }

    // ── 3. Rutas ───────────────────────────────────────────────────
    
    // RUTA B: Origen -> Destino (Estática, se dibuja una vez)
    if (tieneOrigen && tieneDestino && !staticPolyline) {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${data.origen.lng},${data.origen.lat};${data.destino.lng},${data.destino.lat}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const routeData = await res.json();
            if (routeData.routes && routeData.routes.length > 0) {
                staticPolyline = L.geoJSON(routeData.routes[0].geometry, {
                    style: { color: '#10b981', weight: 5, opacity: 0.7, dashArray: '10, 10' }
                }).addTo(trackingMap);
            }
        } catch (e) { console.error("Error ruta estática:", e); }
    }

    // RUTA A: Conductor -> Origen (Dinámica)
    if (tieneConductor && tieneOrigen) {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${data.conductor.lng},${data.conductor.lat};${data.origen.lng},${data.origen.lat}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const routeData = await res.json();
            
            if (dynamicPolyline) trackingMap.removeLayer(dynamicPolyline);
            
            if (routeData.routes && routeData.routes.length > 0) {
                dynamicPolyline = L.geoJSON(routeData.routes[0].geometry, {
                    style: { color: '#3b82f6', weight: 6, opacity: 0.8 }
                }).addTo(trackingMap);
            }
        } catch (e) { console.error("Error ruta dinámica:", e); }
    }

    // ── 4. Estado visual del GPS ──────────────────────────────────
    const statusBannerMap = document.getElementById("map-status-banner");
    if (statusBannerMap) {
        if (!tieneConductor) {
            statusBannerMap.className = "tf-status-banner show warning";
            statusBannerMap.innerHTML = `<i class="bi bi-exclamation-circle fs-5"></i><span>El conductor aún no tiene GPS activo. Se muestra la ruta planificada.</span>`;
        } else {
            statusBannerMap.className = "tf-status-banner";
        }
    }
}

/* =========================================================
   EVENTOS
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("service-code");
    if (!input) return;

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") rastrearServicio();
    });

    input.addEventListener("input", () => {
        if (!input.value.trim()) clearStatus();
    });
});
