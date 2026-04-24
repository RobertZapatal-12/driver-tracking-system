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

/* =========================================================
   INICIALIZAR EL MAPA (Estilo Centro de Control)
   ========================================================= */
function initTrackingMap() {
    if (trackingMap) return;

    trackCarIcon = L.icon({
        iconUrl:    "https://cdn-icons-png.flaticon.com/512/743/743922.png",
        iconSize:   [44, 44],
        iconAnchor: [22, 44],
        popupAnchor:[0, -40]
    });

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
    if (img)   img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=3b82f6&color=fff&bold=true&size=128`;
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
        // Nueva lógica: Buscar por código hexadecimal
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
                driver_id: data.request_id, // Usamos request_id como ID visual
                velocidad: data.conductor.velocidad
            });
        }
        
        setTimeout(() => placeTrackingMarkers(data), 400);

    } catch (err) {
        console.error("[TransFleet] Error:", err);
        setStatus("error", "bi-wifi-off", `Error al conectar: ${err.message}`);
    } finally {
        if (btn) btn.classList.remove("loading");
    }
}

let originMarker      = null;
let destinationMarker = null;
let routingControl    = null;
let routeFallbackLines = [];

// ── Iconos reutilizables ────────────────────────────────────────────
function makeLetterIcon(letter, color) {
    return L.divIcon({
        className: '',
        html: `<div style="
            background:${color}; width:36px; height:36px;
            border-radius:50%; border:3px solid white;
            display:flex; align-items:center; justify-content:center;
            box-shadow:0 4px 14px ${color}66;
            font-size:1rem; color:white; font-weight:800;">${letter}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20]
    });
}

function placeTrackingMarkers(data) {
    if (!trackingMap) return;

    // ── Limpiar capas previas ────────────────────────────────────
    if (originMarker)      { trackingMap.removeLayer(originMarker);      originMarker = null; }
    if (destinationMarker) { trackingMap.removeLayer(destinationMarker); destinationMarker = null; }
    if (trackingMarker)    { trackingMap.removeLayer(trackingMarker);    trackingMarker = null; }
    if (routingControl)    { try { trackingMap.removeControl(routingControl); } catch(e){} routingControl = null; }
    routeFallbackLines.forEach(l => { try { trackingMap.removeLayer(l); } catch(e){} });
    routeFallbackLines = [];

    const tieneOrigen  = data.origen  && data.origen.lat  != null && data.origen.lng  != null;
    const tieneDestino = data.destino && data.destino.lat != null && data.destino.lng != null;
    const tieneConductor = data.conductor && data.conductor.lat != null && data.conductor.lng != null;

    // ── 1. Marcador del Conductor ─────────────────────────────────
    if (tieneConductor) {
        trackingMarker = L.marker([data.conductor.lat, data.conductor.lng], { icon: trackCarIcon })
            .addTo(trackingMap)
            .bindPopup(`
                <div style="font-family:'Inter',sans-serif;padding:4px;min-width:160px;">
                    <b style="color:#3b82f6;font-size:1rem;">🚗 ${data.conductor.nombre || 'Conductor'}</b><br>
                    <small style="color:#64748b;">Ubicación actual · ${data.conductor.velocidad || 0} km/h</small>
                </div>
            `).openPopup();
    }

    // ── 2. Marcador de Origen (A — Azul) ──────────────────────────
    if (tieneOrigen) {
        originMarker = L.marker([data.origen.lat, data.origen.lng], {
            icon: makeLetterIcon('A', '#3b82f6')
        }).addTo(trackingMap)
          .bindPopup(`
            <div style="font-family:'Inter',sans-serif;padding:4px;min-width:160px;">
                <b style="color:#3b82f6;">📍 Punto de Origen</b><br>
                <span style="font-size:0.88rem;color:#1e293b;">${data.origen.nombre || 'Origen del viaje'}</span><br>
                <small style="color:#64748b;">Primera parada del conductor</small>
            </div>
          `);
    }

    // ── 3. Marcador de Destino (B — Rojo) ─────────────────────────
    if (tieneDestino) {
        destinationMarker = L.marker([data.destino.lat, data.destino.lng], {
            icon: makeLetterIcon('B', '#ef4444')
        }).addTo(trackingMap)
          .bindPopup(`
            <div style="font-family:'Inter',sans-serif;padding:4px;min-width:160px;">
                <b style="color:#ef4444;">🏁 Destino Final</b><br>
                <span style="font-size:0.88rem;color:#1e293b;">${data.destino.nombre || 'Destino del viaje'}</span><br>
                <small style="color:#64748b;">Última parada del servicio</small>
            </div>
          `);
    }

    // ── 4. Ruta completa: Conductor → Origen → Destino ─────────────
    const waypoints = [];
    if (tieneConductor) waypoints.push(L.latLng(data.conductor.lat, data.conductor.lng));
    if (tieneOrigen)    waypoints.push(L.latLng(data.origen.lat, data.origen.lng));
    if (tieneDestino)   waypoints.push(L.latLng(data.destino.lat, data.destino.lng));

    if (waypoints.length >= 2) {
        routingControl = L.Routing.control({
            waypoints: waypoints,
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            lineOptions: {
                styles: [
                    { color: '#3b82f6', opacity: 0.9, weight: 7 },
                    { color: '#ffffff', opacity: 0.4, weight: 3 }
                ],
                extendToWaypoints: true,
                missingRouteTolerance: 15
            },
            show: false,
            addWaypoints: false,
            draggableWaypoints: false,
            createMarker: () => null
        }).on('routingerror', function() {
            // Fallback: línea punteada directa entre los puntos
            const poly = L.polyline(waypoints, {
                color: '#3b82f6', weight: 5, dashArray: '12, 8', opacity: 0.85
            }).addTo(trackingMap);
            routeFallbackLines.push(poly);
        }).addTo(trackingMap);
    }

    // ── 5. Ajustar bounds para mostrar todo ───────────────────────
    const allPoints = [];
    if (tieneConductor) allPoints.push([data.conductor.lat, data.conductor.lng]);
    if (tieneOrigen)    allPoints.push([data.origen.lat, data.origen.lng]);
    if (tieneDestino)   allPoints.push([data.destino.lat, data.destino.lng]);

    if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        trackingMap.fitBounds(bounds, { padding: [80, 80] });
    } else {
        trackingMap.setView([18.4861, -69.9312], 12);
    }

    // ── 6. Actualizar panel de info del conductor ─────────────────
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
