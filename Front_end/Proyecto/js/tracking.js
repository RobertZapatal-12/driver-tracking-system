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

let originMarker = null;
let destinationMarker = null;
let routingControl = null;

function placeTrackingMarkers(data) {
    if (!trackingMap) return;

    // Limpiar anteriores
    if (originMarker) trackingMap.removeLayer(originMarker);
    if (destinationMarker) trackingMap.removeLayer(destinationMarker);
    if (trackingMarker) trackingMap.removeLayer(trackingMarker);
    if (routingControl) {
        try { trackingMap.removeControl(routingControl); } catch(e){}
    }

    const bounds = L.latLngBounds();

    // 1. Origen
    if (data.origen && data.origen.lat) {
        originMarker = L.marker([data.origen.lat, data.origen.lng], {
            icon: L.divIcon({ 
                className: 'custom-div-icon', 
                html: '<div style="background:#3b82f6; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>', 
                iconSize: [12,12],
                iconAnchor: [6,6]
            })
        }).addTo(trackingMap).bindPopup(`<b>Origen:</b> ${data.origen.nombre}`);
        bounds.extend([data.origen.lat, data.origen.lng]);
    }

    // 2. Destino
    if (data.destino && data.destino.lat) {
        destinationMarker = L.marker([data.destino.lat, data.destino.lng], {
            icon: L.divIcon({ 
                className: 'custom-div-icon', 
                html: '<div style="background:#ef4444; width:12px; height:12px; border-radius:50%; border:2px solid white;"></div>', 
                iconSize: [12,12],
                iconAnchor: [6,6]
            })
        }).addTo(trackingMap).bindPopup(`<b>Destino:</b> ${data.destino.nombre}`);
        bounds.extend([data.destino.lat, data.destino.lng]);
    }

    // 3. Conductor (Ubicación real)
    if (data.conductor && data.conductor.lat) {
        trackingMarker = L.marker([data.conductor.lat, data.conductor.lng], { icon: trackCarIcon })
            .addTo(trackingMap)
            .bindPopup(`<b>${data.conductor.nombre}</b><br>${data.conductor.velocidad} km/h`);
        bounds.extend([data.conductor.lat, data.conductor.lng]);

        // 4. Ruteo dinámico según estado
        let targetPoint = null;
        let routeColor = '#3b82f6';

        if (data.sub_estado === "con_cliente") {
            // Fase 2: Al destino
            targetPoint = L.latLng(data.destino.lat, data.destino.lng);
            routeColor = '#10b981'; // Verde
        } else {
            // Fase 1: Al origen (buscando cliente)
            targetPoint = L.latLng(data.origen.lat, data.origen.lng);
            routeColor = '#3b82f6'; // Azul
        }

        if (targetPoint) {
            routingControl = L.Routing.control({
                waypoints: [
                    L.latLng(data.conductor.lat, data.conductor.lng),
                    targetPoint
                ],
                show: false,
                addWaypoints: false,
                draggableWaypoints: false,
                createMarker: () => null,
                lineOptions: { styles: [{ color: routeColor, opacity: 0.7, weight: 8 }] }
            }).addTo(trackingMap);
        }
    }

    if (!bounds.isValid()) {
        trackingMap.setView([18.4861, -69.9312], 12);
    } else {
        trackingMap.fitBounds(bounds, { padding: [80, 80] });
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
