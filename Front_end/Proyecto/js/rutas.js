/* =========================================================
   MÓDULO DE RUTAS — Con mapa interactivo y geocodificación
   ========================================================= */
const ROUTES_ENDPOINT = "/route";

let editandoRutaId = null;

// ── Variables de coordenadas ───────────────────────────────
let rutaOrigenCoords   = null; // { lat, lng }
let rutaDestinoCoords  = null; // { lat, lng }

// ── Variables del mapa modal ───────────────────────────────
let rutaModalMap       = null;
let rutaOriginMarker   = null;
let rutaDestMarker     = null;
let rutaRoutingControl = null;
let rutaClickMode      = null; // 'origen' | 'destino' | null

// ─────────────────────────────────────────────────────────
// MODAL: abrir / cerrar / reset
// ─────────────────────────────────────────────────────────
function abrirModalRuta() {
    const modal = document.querySelector(".modal-overlay");
    if (modal) {
        modal.style.display = "flex";
        // Inicializar mapa después de que el modal sea visible
        setTimeout(() => {
            initRutaModalMap();
            resetRutaMapMarkers();
        }, 300);
    }
}

function cerrarModalRuta() {
    const modal = document.querySelector(".modal-overlay");
    if (modal) modal.style.display = "none";
}

function resetRouteForm() {
    const form = document.getElementById("routeForm");
    if (form) form.reset();

    const routeIdInput = document.getElementById("route_id");
    const modalTitle   = document.getElementById("routeModalTitle");
    const submitBtn    = document.getElementById("routeSubmitBtn");

    if (routeIdInput) routeIdInput.value = "";
    if (modalTitle)   modalTitle.textContent = "Generar Orden de Servicio";
    if (submitBtn)    submitBtn.innerHTML = '<i class="bi bi-send-check me-2"></i>Publicar Servicio';

    editandoRutaId    = null;
    rutaOrigenCoords  = null;
    rutaDestinoCoords = null;
    rutaClickMode     = null;

    resetRutaMapMarkers();

    // Ocultar badges de coordenadas
    const badgeO = document.getElementById("ruta-origen-coord-badge");
    const badgeD = document.getElementById("ruta-destino-coord-badge");
    if (badgeO) badgeO.classList.add("d-none");
    if (badgeD) badgeD.classList.add("d-none");

    // Limpiar coordenadas ocultas
    ["ruta-lat-origen","ruta-lon-origen","ruta-lat-destino","ruta-lon-destino"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    // Cerrar dropdowns de autocomplete
    document.querySelectorAll(".autocomplete-dropdown").forEach(d => d.classList.remove("active"));
}

// ─────────────────────────────────────────────────────────
// MAPA MODAL
// ─────────────────────────────────────────────────────────
function initRutaModalMap() {
    if (rutaModalMap) {
        rutaModalMap.invalidateSize();
        return;
    }

    const el = document.getElementById("ruta-modal-map");
    if (!el) return;

    rutaModalMap = L.map("ruta-modal-map", {
        center: [18.4861, -69.9312],
        zoom: 11,
        zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
    }).addTo(rutaModalMap);

    // Click en mapa para fijar puntos
    rutaModalMap.on("click", (e) => {
        if (!rutaClickMode) return;
        const { lat, lng } = e.latlng;
        if (rutaClickMode === "origen") {
            setRutaOrigen(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } else if (rutaClickMode === "destino") {
            setRutaDestino(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        rutaClickMode = null;
        rutaModalMap.getContainer().style.cursor = "";
        // Quitar modo activo de botones
        document.getElementById("ruta-btn-set-origen")?.classList.remove("active");
        document.getElementById("ruta-btn-set-destino")?.classList.remove("active");
    });

    // Botón "Fijar Origen"
    document.getElementById("ruta-btn-set-origen")?.addEventListener("click", () => {
        rutaClickMode = "origen";
        rutaModalMap.getContainer().style.cursor = "crosshair";
        document.getElementById("ruta-btn-set-origen").classList.add("active");
        document.getElementById("ruta-btn-set-destino")?.classList.remove("active");
        Toast.info?.("Haz clic en el mapa para fijar el ORIGEN") || console.info("Haz clic en el mapa para fijar el ORIGEN");
    });

    // Botón "Fijar Destino"
    document.getElementById("ruta-btn-set-destino")?.addEventListener("click", () => {
        rutaClickMode = "destino";
        rutaModalMap.getContainer().style.cursor = "crosshair";
        document.getElementById("ruta-btn-set-destino").classList.add("active");
        document.getElementById("ruta-btn-set-origen")?.classList.remove("active");
        Toast.info?.("Haz clic en el mapa para fijar el DESTINO") || console.info("Haz clic en el mapa para fijar el DESTINO");
    });

    // Botón "Calcular Ruta"
    document.getElementById("ruta-btn-calcular")?.addEventListener("click", calcularRutaEnMapa);
}

function resetRutaMapMarkers() {
    if (rutaOriginMarker && rutaModalMap) {
        rutaModalMap.removeLayer(rutaOriginMarker);
        rutaOriginMarker = null;
    }
    if (rutaDestMarker && rutaModalMap) {
        rutaModalMap.removeLayer(rutaDestMarker);
        rutaDestMarker = null;
    }
    if (rutaRoutingControl && rutaModalMap) {
        try { rutaModalMap.removeControl(rutaRoutingControl); } catch(_) {}
        rutaRoutingControl = null;
    }
}

function setRutaOrigen(lat, lng, label) {
    rutaOrigenCoords = { lat, lng };

    // Guardar en inputs ocultos
    document.getElementById("ruta-lat-origen").value = lat;
    document.getElementById("ruta-lon-origen").value = lng;

    // Actualizar badge
    const badge = document.getElementById("ruta-origen-coord-badge");
    if (badge) badge.classList.remove("d-none");

    // Marcador en mapa
    if (rutaOriginMarker && rutaModalMap) rutaModalMap.removeLayer(rutaOriginMarker);
    if (rutaModalMap) {
        rutaOriginMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: "custom-div-icon",
                html: '<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>',
                iconSize: [14, 14], iconAnchor: [7, 7],
            }),
        }).addTo(rutaModalMap).bindPopup(`<b>Origen:</b> ${label}`);
        rutaModalMap.panTo([lat, lng]);
    }
}

function setRutaDestino(lat, lng, label) {
    rutaDestinoCoords = { lat, lng };

    // Guardar en inputs ocultos
    document.getElementById("ruta-lat-destino").value = lat;
    document.getElementById("ruta-lon-destino").value = lng;

    // Actualizar badge
    const badge = document.getElementById("ruta-destino-coord-badge");
    if (badge) badge.classList.remove("d-none");

    // Marcador en mapa
    if (rutaDestMarker && rutaModalMap) rutaModalMap.removeLayer(rutaDestMarker);
    if (rutaModalMap) {
        rutaDestMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: "custom-div-icon",
                html: '<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>',
                iconSize: [14, 14], iconAnchor: [7, 7],
            }),
        }).addTo(rutaModalMap).bindPopup(`<b>Destino:</b> ${label}`);
        rutaModalMap.panTo([lat, lng]);
    }
}

function calcularRutaEnMapa() {
    if (!rutaOrigenCoords || !rutaDestinoCoords) {
        Toast.warning?.("Define el Origen y el Destino antes de calcular la ruta") ||
            alert("Define el Origen y el Destino antes de calcular la ruta");
        return;
    }
    if (!rutaModalMap) return;

    // Limpiar ruta anterior
    if (rutaRoutingControl) {
        try { rutaModalMap.removeControl(rutaRoutingControl); } catch(_) {}
        rutaRoutingControl = null;
    }

    // Dibujar con Leaflet Routing Machine si está disponible, si no: OSRM fetch
    if (typeof L.Routing !== "undefined") {
        rutaRoutingControl = L.Routing.control({
            waypoints: [
                L.latLng(rutaOrigenCoords.lat, rutaOrigenCoords.lng),
                L.latLng(rutaDestinoCoords.lat, rutaDestinoCoords.lng),
            ],
            show: false,
            addWaypoints: false,
            draggableWaypoints: false,
            createMarker: () => null,
            lineOptions: { styles: [{ color: "#3b82f6", opacity: 0.75, weight: 6 }] },
        }).addTo(rutaModalMap);

        // Ajustar vista
        const bounds = L.latLngBounds(
            [rutaOrigenCoords.lat, rutaOrigenCoords.lng],
            [rutaDestinoCoords.lat, rutaDestinoCoords.lng]
        );
        rutaModalMap.fitBounds(bounds, { padding: [40, 40] });
    } else {
        // Fallback: dibujar línea directa
        const line = L.polyline([
            [rutaOrigenCoords.lat, rutaOrigenCoords.lng],
            [rutaDestinoCoords.lat, rutaDestinoCoords.lng],
        ], { color: "#3b82f6", weight: 5, dashArray: "8 6" }).addTo(rutaModalMap);

        rutaModalMap.fitBounds(line.getBounds(), { padding: [40, 40] });
        rutaRoutingControl = line; // guardamos para poder limpiar
    }
}

// ─────────────────────────────────────────────────────────
// AUTOCOMPLETADO (Photon API — República Dominicana)
// ─────────────────────────────────────────────────────────
function setupRutaAutocomplete(inputId, resultsId, tipo) {
    const input   = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    let timer;

    if (!input || !results) return;

    input.addEventListener("input", () => {
        clearTimeout(timer);
        const q = input.value.trim();
        if (q.length < 3) { results.classList.remove("active"); return; }

        timer = setTimeout(async () => {
            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&bbox=-72,17.4,-68.3,20&limit=5`;
            try {
                const res  = await fetch(url);
                const data = await res.json();
                renderRutaAutocomplete(data.features, results, input, tipo);
            } catch(e) {
                console.error("Error Photon:", e);
            }
        }, 350);
    });

    // Cerrar al hacer clic fuera
    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.classList.remove("active");
        }
    });
}

function renderRutaAutocomplete(features, container, input, tipo) {
    if (!features || features.length === 0) {
        container.classList.remove("active");
        return;
    }

    container.innerHTML  = "";
    container.classList.add("active");

    features.forEach(f => {
        const props   = f.properties;
        const name    = props.name || props.street || "Punto";
        const city    = props.city || props.state || "";
        const country = props.country || "República Dominicana";
        const address = [city, country].filter(Boolean).join(", ");

        const item    = document.createElement("div");
        item.className = "autocomplete-item";
        item.innerHTML = `
            <i class="bi bi-geo-alt-fill"></i>
            <div class="poi-info">
                <span class="poi-name">${name}</span>
                <span class="poi-address">${address}</span>
            </div>
        `;

        item.addEventListener("click", () => {
            input.value = name;
            container.classList.remove("active");

            if (f.geometry && f.geometry.coordinates) {
                const lng = f.geometry.coordinates[0];
                const lat = f.geometry.coordinates[1];

                if (tipo === "origen") {
                    setRutaOrigen(lat, lng, name);
                } else {
                    setRutaDestino(lat, lng, name);
                }

                // Si ambos puntos están definidos, calcular ruta automáticamente
                if (rutaOrigenCoords && rutaDestinoCoords) {
                    setTimeout(calcularRutaEnMapa, 200);
                }
            }
        });

        container.appendChild(item);
    });
}

// ─────────────────────────────────────────────────────────
// CARGAR RUTAS
// ─────────────────────────────────────────────────────────
async function cargarRutas() {
    try {
        const response = await CONFIG.fetchAuth(`${ROUTES_ENDPOINT}/`);

        if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

        const rutas = await response.json();
        const tbody = document.getElementById("routes-table-body");

        if (!tbody) { console.error("No se encontró routes-table-body"); return; }

        tbody.innerHTML = "";

        if (!Array.isArray(rutas) || rutas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">No hay rutas registradas</td>
                </tr>
            `;
            return;
        }

        rutas.forEach(route => {
            // Indicador de coordenadas
            const coordIcon = (route.lat_destino && route.lon_destino)
                ? `<i class="bi bi-geo-fill text-success ms-1" title="Con coordenadas de navegación"></i>`
                : `<i class="bi bi-geo text-warning ms-1" title="Sin coordenadas (el conductor no podrá navegar)"></i>`;

            tbody.innerHTML += `
                <tr>
                    <td class="ps-3">#${route.route_id ?? ""}</td>
                    <td>${route.vehicle_id ?? "—"}</td>
                    <td>${route.driver_nombre ?? "Sin conductor"}</td>
                    <td>
                        <span class="text-primary fw-semibold">${route.origen ?? ""}</span>
                        <i class="bi bi-arrow-right mx-1 text-muted"></i>
                        <span class="text-danger fw-semibold">${route.destino ?? ""}</span>
                        ${coordIcon}
                    </td>
                    <td>${route.fecha ? new Date(route.fecha).toLocaleString() : "—"}</td>
                    <td>
                        <span class="badge ${getEstadoBadgeRuta(route.estado)}">${route.estado ?? "Sin estado"}</span>
                    </td>
                    <td class="text-end pe-3">
                        <div class="d-flex gap-2 justify-content-end">
                            <button class="btn btn-sm btn-warning" onclick="editarRuta(${route.route_id})">
                                <i class="bi bi-pencil me-1"></i>Editar
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="eliminarRuta(${route.route_id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error("Error cargando rutas:", error);
        Toast.error("No se pudieron cargar las rutas.");
    }

    cargarVehiculosRutas();
}

function getEstadoBadgeRuta(estado) {
    switch ((estado || "").toLowerCase()) {
        case "pendiente":  return "bg-warning text-dark";
        case "aceptado":   return "bg-info text-dark";
        case "en camino":  return "bg-primary";
        case "completado": return "bg-success";
        default:           return "bg-secondary";
    }
}

// ─────────────────────────────────────────────────────────
// CARGAR VEHÍCULOS PARA EL SELECT
// ─────────────────────────────────────────────────────────
async function cargarVehiculosRutas() {
    try {
        const response = await CONFIG.fetchAuth("/vehicles/");
        if (response.ok) {
            const vehiculos = await response.json();
            const select    = document.getElementById("vehicle_id");
            if (select) {
                select.innerHTML = '<option value="">Selecciona un vehículo</option>';
                vehiculos.forEach(v => {
                    select.innerHTML += `<option value="${v.vehicle_id}">${v.marca} ${v.modelo} — ${v.plate_number}</option>`;
                });
            }
        }
    } catch (error) {
        console.error("Error cargando vehículos para rutas:", error);
    }
}

// ─────────────────────────────────────────────────────────
// GUARDAR (crear o actualizar)
// ─────────────────────────────────────────────────────────
async function guardarRuta() {
    if (editandoRutaId) {
        await actualizarRuta();
    } else {
        await crearRuta();
    }
}

async function crearRuta() {
    const vehicleId = parseInt(document.getElementById("vehicle_id").value);
    const origen    = document.getElementById("origen").value.trim();
    const destino   = document.getElementById("destino").value.trim();

    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const userId   = userData.user_id || userData.id;

    if (!vehicleId || !origen || !destino) {
        Toast.warning("Completa vehículo, origen y destino");
        return;
    }

    if (!userId) {
        Toast.error("No se encontró el usuario logeado");
        return;
    }

    const data = {
        user_id:     userId,
        vehicle_id:  vehicleId,
        origen,
        destino,
        lat_origen:  rutaOrigenCoords  ? rutaOrigenCoords.lat  : null,
        lon_origen:  rutaOrigenCoords  ? rutaOrigenCoords.lng  : null,
        lat_destino: rutaDestinoCoords ? rutaDestinoCoords.lat : null,
        lon_destino: rutaDestinoCoords ? rutaDestinoCoords.lng : null,
    };

    if (!data.lat_destino) {
        const ok = await Toast.confirm?.(
            "No se definieron coordenadas de destino. El conductor NO podrá navegar por el mapa. ¿Continuar de todos modos?"
        );
        if (!ok) return;
    }

    try {
        const response = await CONFIG.fetchAuth(`${ROUTES_ENDPOINT}/`, {
            method: "POST",
            body: JSON.stringify(data),
        });

        const result = await response.json();
        if (!response.ok) {
            Toast.error(result.detail || "No se pudo crear la ruta");
            return;
        }

        Toast.success("Ruta creada correctamente ✅");
        resetRouteForm();
        cerrarModalRuta();
        await cargarRutas();

    } catch (error) {
        console.error("Error de conexión:", error);
        Toast.error("No se pudo conectar con el backend");
    }
}

async function editarRuta(routeId) {
    try {
        const response = await CONFIG.fetchAuth(`${ROUTES_ENDPOINT}/${routeId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const route = await response.json();
        editandoRutaId = route.route_id;

        document.getElementById("route_id").value  = route.route_id ?? "";
        document.getElementById("vehicle_id").value = route.vehicle_id ?? "";
        document.getElementById("origen").value     = route.origen ?? "";
        document.getElementById("destino").value    = route.destino ?? "";

        const modalTitle = document.getElementById("routeModalTitle");
        const submitBtn  = document.getElementById("routeSubmitBtn");
        if (modalTitle) modalTitle.textContent = "Editar Orden de Servicio";
        if (submitBtn)  submitBtn.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Actualizar Servicio';

        // Restaurar coordenadas si existen
        if (route.lat_origen && route.lon_origen) {
            rutaOrigenCoords = { lat: route.lat_origen, lng: route.lon_origen };
            document.getElementById("ruta-lat-origen").value = route.lat_origen;
            document.getElementById("ruta-lon-origen").value = route.lon_origen;
            document.getElementById("ruta-origen-coord-badge")?.classList.remove("d-none");
        }
        if (route.lat_destino && route.lon_destino) {
            rutaDestinoCoords = { lat: route.lat_destino, lng: route.lon_destino };
            document.getElementById("ruta-lat-destino").value = route.lat_destino;
            document.getElementById("ruta-lon-destino").value = route.lon_destino;
            document.getElementById("ruta-destino-coord-badge")?.classList.remove("d-none");
        }

        abrirModalRuta();

        // Colocar marcadores si hay coordenadas
        setTimeout(() => {
            if (rutaOrigenCoords)  setRutaOrigen(rutaOrigenCoords.lat,  rutaOrigenCoords.lng,  route.origen);
            if (rutaDestinoCoords) setRutaDestino(rutaDestinoCoords.lat, rutaDestinoCoords.lng, route.destino);
            if (rutaOrigenCoords && rutaDestinoCoords) calcularRutaEnMapa();
        }, 500);

    } catch (error) {
        console.error("Error cargando ruta para editar:", error);
        Toast.error("No se pudo cargar la ruta");
    }
}

async function actualizarRuta() {
    const routeId   = editandoRutaId;
    const vehicleId = parseInt(document.getElementById("vehicle_id").value);
    const origen    = document.getElementById("origen").value.trim();
    const destino   = document.getElementById("destino").value.trim();

    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const userId   = userData.user_id || userData.id;

    if (!routeId)              { Toast.warning("No se encontró la ruta a editar"); return; }
    if (!vehicleId || !origen || !destino) { Toast.warning("Completa vehículo, origen y destino"); return; }
    if (!userId)               { Toast.error("No se encontró el usuario logeado"); return; }

    const data = {
        user_id:     userId,
        vehicle_id:  vehicleId,
        origen,
        destino,
        lat_origen:  rutaOrigenCoords  ? rutaOrigenCoords.lat  : null,
        lon_origen:  rutaOrigenCoords  ? rutaOrigenCoords.lng  : null,
        lat_destino: rutaDestinoCoords ? rutaDestinoCoords.lat : null,
        lon_destino: rutaDestinoCoords ? rutaDestinoCoords.lng : null,
    };

    try {
        const response = await CONFIG.fetchAuth(`${ROUTES_ENDPOINT}/${routeId}`, {
            method: "PUT",
            body:   JSON.stringify(data),
        });

        const result = await response.json();
        if (!response.ok) {
            Toast.error(result.detail || "No se pudo actualizar la ruta");
            return;
        }

        Toast.success("Ruta actualizada correctamente ✅");
        resetRouteForm();
        cerrarModalRuta();
        await cargarRutas();

    } catch (error) {
        console.error("Error de conexión:", error);
        Toast.error("No se pudo conectar con el backend");
    }
}

async function eliminarRuta(routeId) {
    const confirmado = await Toast.confirm("¿Seguro que quieres eliminar esta ruta? Esta acción no se puede deshacer.");
    if (!confirmado) return;

    try {
        const response = await CONFIG.fetchAuth(`${ROUTES_ENDPOINT}/${routeId}`, {
            method: "DELETE",
        });

        const result = await response.json();
        if (!response.ok) {
            Toast.error(result.detail || "No se pudo eliminar la ruta");
            return;
        }

        Toast.success("Ruta eliminada correctamente");
        await cargarRutas();

    } catch (error) {
        console.error("Error de conexión:", error);
        Toast.error("No se pudo conectar con el backend");
    }
}

// ─────────────────────────────────────────────────────────
// EVENTOS DEL DOM
// ─────────────────────────────────────────────────────────
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("btn-open-modal")) {
        resetRouteForm();
        abrirModalRuta();
        // Inicializar autocomplete cuando se abra el modal
        setupRutaAutocomplete("origen",  "ruta-origen-results",  "origen");
        setupRutaAutocomplete("destino", "ruta-destino-results", "destino");
    }

    if (e.target.classList.contains("btn-close-modal")) {
        resetRouteForm();
        cerrarModalRuta();
    }
});

// ─────────────────────────────────────────────────────────
// EXPORTS GLOBALES
// ─────────────────────────────────────────────────────────
window.guardarRuta    = guardarRuta;
window.crearRuta      = crearRuta;
window.editarRuta     = editarRuta;
window.actualizarRuta = actualizarRuta;
window.eliminarRuta   = eliminarRuta;
window.cargarRutas    = cargarRutas;