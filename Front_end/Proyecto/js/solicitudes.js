/* =========================================================
   SOLICITUDES - GESTIÓN CON FLUJO OPERADOR
   ========================================================= */

let validSolicitudId = null;
let filtroActual = "todas";
let todasLasSolicitudes = [];
let solicitudEnTrabajo = null; // solicitud que el operador está gestionando

// Variables para el mapa del modal
let modalMap = null;
let routingControl = null;
let originMarker = null;
let destinationMarker = null;
let originCoords = null;
let destinationCoords = null;

function getBaseUrl() {
    return typeof CONFIG !== 'undefined' && CONFIG.API_URL ? CONFIG.API_URL : 'http://127.0.0.1:8000';
}

function getHeaders() {
    const token = localStorage.getItem("authToken");
    let headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

/**
 * Obtiene el usuario actual desde localStorage
 */
function getCurrentUser() {
    try {
        const userStr = localStorage.getItem("user");
        if (userStr) return JSON.parse(userStr);
    } catch (e) {
        console.error("Error parseando usuario:", e);
    }
    return null;
}

/**
 * Verifica si el usuario actual puede tomar solicitudes (admin u operador)
 */
function puedeTomarSolicitudes() {
    const user = getCurrentUser();
    if (!user) return false;
    const role = (user.role || "").toLowerCase();
    return role === "admin" || role === "operador";
}

/**
 * Verifica si el usuario actual es el operador asignado a una solicitud
 */
function esOperadorAsignado(solicitud) {
    const user = getCurrentUser();
    if (!user) return false;
    return solicitud.user_id === user.id;
}

/* =========================================================
   CARGAR SOLICITUDES
   ========================================================= */

async function cargarSolicitudes() {
    const tbody = document.getElementById("listaSolicitudesBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm" role="status"></div><span class="ms-2 text-muted">Cargando solicitudes...</span></td></tr>`;

    try {
        const response = await fetch(`${getBaseUrl()}/request/`, {
            method: 'GET',
            headers: getHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            todasLasSolicitudes = data;
            aplicarFiltro();
        } else {
            console.error("Error cargando solicitudes:", response.statusText);
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Error cargando las solicitudes</td></tr>`;
        }
    } catch (e) {
        console.error("Error de red:", e);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Error de conexión al servidor</td></tr>`;
    }
}

/* =========================================================
   FILTROS POR ESTADO
   ========================================================= */

function aplicarFiltro() {
    let filtradas = todasLasSolicitudes;
    if (filtroActual !== "todas") {
        filtradas = todasLasSolicitudes.filter(s =>
            (s.estado || "").toLowerCase() === filtroActual
        );
    }
    renderTablaSolicitudes(filtradas);
}

function initFiltros() {
    const grupo = document.getElementById("filtroEstadoSolicitudes");
    if (!grupo) return;

    grupo.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", function () {
            grupo.querySelectorAll("button").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            filtroActual = this.dataset.filtro;
            aplicarFiltro();
        });
    });
}

/* =========================================================
   RENDERIZAR TABLA
   ========================================================= */

function renderTablaSolicitudes(solicitudes) {
    const tbody = document.getElementById("listaSolicitudesBody");
    if (!tbody) return;

    if (!solicitudes || solicitudes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No hay solicitudes registradas</td></tr>`;
        return;
    }

    const canTake = puedeTomarSolicitudes();

    tbody.innerHTML = "";
    solicitudes.forEach(s => {
        const estadoBadgeClass = getEstadoBadgeClass(s.estado);
        const prioridadBadgeClass = getPrioridadBadgeClass(s.prioridad);
        const estado = (s.estado || "").toLowerCase();

        // Determinar acciones disponibles
        let accionesHTML = "";

        // Botón TOMAR: visible si el usuario es admin/operador y la solicitud está pendiente
        if (canTake && estado === "pendiente") {
            accionesHTML += `
                <button class="btn btn-sm btn-success border me-1" onclick='tomarSolicitud(${s.request_id})' title="Tomar Solicitud">
                    <i class="bi bi-hand-index-thumb me-1"></i>Tomar
                </button>
            `;
        }

        // Botón GESTIONAR: visible para el operador asignado cuando está en proceso
        if (estado === "en_proceso" && esOperadorAsignado(s)) {
            accionesHTML += `
                <button class="btn btn-sm btn-primary border me-1" onclick='abrirPanelTrabajo(${s.request_id})' title="Gestionar Solicitud">
                    <i class="bi bi-pencil-square me-1"></i>Gestionar
                </button>
            `;
        }

        // Botón EDITAR: visible siempre (o según rol, aquí siempre por facilidad)
        accionesHTML += `
            <button class="btn btn-sm btn-light border me-1" onclick="abrirModalEditarSolicitud(${s.request_id})" title="Editar">
                <i class="bi bi-pencil pe-none"></i>
            </button>
        `;

        // Botón ELIMINAR: visible siempre
        accionesHTML += `
            <button class="btn btn-sm btn-light border text-danger" onclick="eliminarSolicitud(${s.request_id})" title="Eliminar">
                <i class="bi bi-trash pe-none"></i>
            </button>
        `;

        // Operador asignado
        let operadorHTML = "";
        if (s.operador_nombre) {
            operadorHTML = `<span class="badge bg-info text-dark"><i class="bi bi-person-fill me-1"></i>${s.operador_nombre}</span>`;
        } else {
            operadorHTML = `<span class="text-muted small">Sin asignar</span>`;
        }

        // Recursos asignados info
        let vehiculoHTML = `<span class="text-capitalize">${s.tipo_vehiculo || "—"}</span>`;
        if (s.vehicle_info) {
            vehiculoHTML += `<br><small class="text-muted">${s.vehicle_info}</small>`;
        }
        if (s.driver_nombre) {
            vehiculoHTML += `<br><small class="text-success"><i class="bi bi-person-check me-1"></i>${s.driver_nombre}</small>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>#${s.request_id}</td>
            <td class="fw-bold">${s.cliente}</td>
            <td>${s.fecha}</td>
            <td>${s.origen} <i class="bi bi-arrow-right mx-1 text-muted"></i> ${s.destino}</td>
            <td>${vehiculoHTML}</td>
            <td>
                <span class="badge ${estadoBadgeClass} mb-1">${formatEstado(s.estado)}</span><br>
                <span class="badge ${prioridadBadgeClass}">Relevancia: ${s.prioridad}</span>
            </td>
            <td>${operadorHTML}</td>
            <td class="text-end">${accionesHTML}</td>
        `;
        tbody.appendChild(tr);
    });
}

function formatEstado(estado) {
    switch ((estado || "").toLowerCase()) {
        case "pendiente": return "Pendiente";
        case "en_proceso": return "En Proceso";
        case "completada": return "Completada";
        default: return estado || "—";
    }
}

function getEstadoBadgeClass(estado) {
    switch ((estado || "").toLowerCase()) {
        case "completada": return "bg-success";
        case "en_proceso": return "bg-primary";
        default: return "bg-warning text-dark";
    }
}

function getPrioridadBadgeClass(prioridad) {
    switch ((prioridad || "").toLowerCase()) {
        case "alta": return "bg-danger";
        case "media": return "bg-info text-dark";
        default: return "bg-secondary";
    }
}

/* =========================================================
   TOMAR SOLICITUD (Operador / Admin)
   ========================================================= */

window.tomarSolicitud = async function (id) {
    const user = getCurrentUser();
    if (!user) { Toast.error("No se pudo identificar al usuario"); return; }
    if (!confirm("¿Deseas tomar esta solicitud y asignarte como responsable?")) return;

    try {
        const response = await fetch(`${getBaseUrl()}/request/${id}/tomar`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
                user_id: user.id
            })
        });

        if (response.ok) {
            Toast.success("¡Solicitud tomada! Ahora eres el responsable.");
            cargarSolicitudes();
        } else {
            const err = await response.json();
            Toast.error(err.detail || "Error al tomar la solicitud");
        }
    } catch (e) {
        console.error("Error de red:", e);
        Toast.error("Error de conexión");
    }
};

/* =========================================================
   PANEL DE TRABAJO DEL OPERADOR
   ========================================================= */

/**
 * Carga vehículos disponibles desde la API
 */
async function cargarVehiculosSelect() {
    const select = document.getElementById("op-vehicle-id");
    if (!select) return;

    select.innerHTML = '<option value="">Cargando...</option>';

    try {
        const response = await fetch(`${getBaseUrl()}/vehicles/`, {
            method: 'GET',
            headers: getHeaders()
        });

        if (response.ok) {
            const vehicles = await response.json();
            select.innerHTML = '<option value="">Sin asignar</option>';
            vehicles.forEach(v => {
                const opt = document.createElement("option");
                opt.value = v.vehicle_id;
                opt.textContent = `${v.marca} ${v.modelo} - ${v.plate_number} (${v.estado})`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Error cargando vehículos:", e);
        select.innerHTML = '<option value="">Error cargando</option>';
    }
}

/**
 * Carga conductores disponibles desde la API
 */
async function cargarConductoresSelect() {
    const select = document.getElementById("op-driver-id");
    if (!select) return;

    select.innerHTML = '<option value="">Cargando...</option>';

    try {
        const response = await fetch(`${getBaseUrl()}/drivers/`, {
            method: 'GET',
            headers: getHeaders()
        });

        if (response.ok) {
            const drivers = await response.json();
            select.innerHTML = '<option value="">Sin asignar</option>';
            drivers.forEach(d => {
                if ((d.estado || "").toLowerCase() === 'inactivo') return;
                const opt = document.createElement("option");
                opt.value = d.driver_id;
                opt.textContent = `${d.nombre} - ${d.numero_licencia} (${d.estado})`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Error cargando conductores:", e);
        select.innerHTML = '<option value="">Error cargando</option>';
    }
}

/**
 * Carga clientes desde la API para el formulario de solicitudes
 */
async function cargarClientesSelect() {
    const select = document.getElementById("solicitud-cliente");
    if (!select) return;

    select.innerHTML = '<option value="">Cargando...</option>';

    try {
        const response = await fetch(`${getBaseUrl()}/clients/`, {
            method: 'GET',
            headers: getHeaders()
        });

        if (response.ok) {
            const clients = await response.json();
            select.innerHTML = '<option value="">Seleccione un cliente...</option>';
            clients.forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.nombre; // Usamos el nombre como valor para compatibilidad con el backend actual
                opt.textContent = c.nombre;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Error cargando clientes:", e);
        select.innerHTML = '<option value="">Error al cargar clientes</option>';
    }
}

/**
 * Abre el panel de trabajo para una solicitud en proceso
 */
window.abrirPanelTrabajo = async function (requestId) {
    const modal = document.getElementById("modalTrabajoOperador");
    if (!modal) return;

    // Buscar la solicitud en los datos cargados
    let solicitud = todasLasSolicitudes.find(s => s.request_id === requestId);

    // Si no la encontramos localmente, pedir al servidor
    if (!solicitud) {
        try {
            const response = await fetch(`${getBaseUrl()}/request/${requestId}`, {
                method: 'GET',
                headers: getHeaders()
            });
            if (response.ok) {
                solicitud = await response.json();
            }
        } catch (e) {
            console.error("Error cargando solicitud:", e);
        }
    }

    if (!solicitud) {
        Toast.error("No se pudo cargar la solicitud");
        return;
    }

    solicitudEnTrabajo = solicitud;

    // Cargar dropdowns de vehículos y conductores
    await Promise.all([cargarVehiculosSelect(), cargarConductoresSelect()]);

    // Llenar info de resumen
    document.getElementById("op-solicitud-id").textContent = `#${solicitud.request_id}`;
    document.getElementById("op-info-cliente").textContent = solicitud.cliente;
    document.getElementById("op-info-fecha").textContent = solicitud.fecha;
    document.getElementById("op-info-estado").textContent = formatEstado(solicitud.estado);

    // Llenar sección 1: Revisar y validar
    document.getElementById("op-origen").value = solicitud.origen || "";
    document.getElementById("op-destino").value = solicitud.destino || "";
    document.getElementById("op-prioridad").value = solicitud.prioridad || "media";
    document.getElementById("op-tipo-vehiculo").value = solicitud.tipo_vehiculo || "";
    document.getElementById("op-descripcion").value = solicitud.descripcion || "";

    // Llenar sección 2: Recursos
    const vehicleSelect = document.getElementById("op-vehicle-id");
    if (vehicleSelect && solicitud.vehicle_id) {
        vehicleSelect.value = solicitud.vehicle_id;
    }

    const driverSelect = document.getElementById("op-driver-id");
    if (driverSelect && solicitud.driver_id) {
        driverSelect.value = solicitud.driver_id;
    }

    // Llenar sección 3: Notas
    document.getElementById("op-notas").value = solicitud.notas_operador || "";

    // Mostrar modal
    modal.style.display = "flex";
};

/**
 * Guarda los cambios del operador en la solicitud
 */
async function guardarTrabajoOperador(e) {
    e.preventDefault();

    if (!solicitudEnTrabajo) {
        Toast.error("No hay solicitud seleccionada");
        return;
    }

    const user = getCurrentUser();
    if (!user) {
        Toast.error("No se pudo identificar al usuario");
        return;
    }

    const data = {
        user_id: user.id,
        origen: document.getElementById("op-origen").value,
        destino: document.getElementById("op-destino").value,
        descripcion: document.getElementById("op-descripcion").value,
        prioridad: document.getElementById("op-prioridad").value,
        tipo_vehiculo: document.getElementById("op-tipo-vehiculo").value,
        notas_operador: document.getElementById("op-notas").value
    };

    // Solo incluir vehicle_id y driver_id si tienen valor
    const vehicleVal = document.getElementById("op-vehicle-id").value;
    if (vehicleVal) data.vehicle_id = parseInt(vehicleVal);

    const driverVal = document.getElementById("op-driver-id").value;
    if (driverVal) data.driver_id = parseInt(driverVal);

    try {
        const response = await fetch(`${getBaseUrl()}/request/${solicitudEnTrabajo.request_id}/actualizar`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });

        if (response.ok) {
            Toast.success("¡Solicitud actualizada correctamente!");
            cargarSolicitudes();
        } else {
            const err = await response.json();
            Toast.error(err.detail || "Error al actualizar");
        }
    } catch (e) {
        console.error("Error de red:", e);
        Toast.error("Error de conexión");
    }
}

/**
 * Completar solicitud desde el panel de trabajo
 */
async function completarDesdePanel() {
    if (!solicitudEnTrabajo) {
        Toast.error("No hay solicitud seleccionada");
        return;
    }

    const user = getCurrentUser();
    if (!user) {
        Toast.error("No se pudo identificar al usuario");
        return;
    }

    if (!confirm("¿Marcar esta solicitud como completada? Esta acción no se puede deshacer.")) return;

    // Primero guardamos los datos actuales para asegurar que no se pierda el conductor/vehículo asignado
    const dataActualizar = {
        user_id: user.id,
        origen: document.getElementById("op-origen").value,
        destino: document.getElementById("op-destino").value,
        descripcion: document.getElementById("op-descripcion").value,
        prioridad: document.getElementById("op-prioridad").value,
        tipo_vehiculo: document.getElementById("op-tipo-vehiculo").value,
        notas_operador: document.getElementById("op-notas").value
    };

    const vehicleVal = document.getElementById("op-vehicle-id").value;
    if (vehicleVal) dataActualizar.vehicle_id = parseInt(vehicleVal);

    const driverVal = document.getElementById("op-driver-id").value;
    if (driverVal) dataActualizar.driver_id = parseInt(driverVal);

    try {
        // Enviar PATCH para actualizar info
        await fetch(`${getBaseUrl()}/request/${solicitudEnTrabajo.request_id}/actualizar`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(dataActualizar)
        });

        // Luego marcar como completada
        const response = await fetch(`${getBaseUrl()}/request/${solicitudEnTrabajo.request_id}/completar`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ user_id: user.id })
        });

        if (response.ok) {
            Toast.success("¡Solicitud completada exitosamente!");
            document.getElementById("modalTrabajoOperador").style.display = "none";
            solicitudEnTrabajo = null;
            cargarSolicitudes();
        } else {
            const err = await response.json();
            Toast.error(err.detail || "Error al completar");
        }
    } catch (e) {
        console.error("Error de red:", e);
        Toast.error("Error de conexión");
    }
}

/* =========================================================
   MODALES: Crear / Editar Solicitud
   ========================================================= */

function initSolicitudModals() {
    const btnOpen = document.querySelector(".btn-open-modal-solicitud");
    const btnsClose = document.querySelectorAll(".btn-close-modal-solicitud");
    const modal = document.getElementById("modalSolicitud");
    const form = document.getElementById("form-solicitud");

    if (btnOpen) {
        btnOpen.addEventListener("click", () => {
            validSolicitudId = null;
            document.getElementById("tituloModalSolicitud").innerText = "Nueva Solicitud de Viaje";
            if (form) form.reset();
            cargarClientesSelect(); // Cargamos los clientes reales
            modal.style.display = "flex";
            
            // Inicializar el mapa después de mostrar el modal
            setTimeout(() => {
                initModalMap();
                resetMapMarkers();
            }, 300);
        });
    }

    btnsClose.forEach(btn => {
        btn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    });

    if (form) {
        form.onsubmit = submitSolicitud;
    }

    // ── Modal de Trabajo del Operador ──
    const modalTrabajo = document.getElementById("modalTrabajoOperador");
    const btnCerrar1 = document.getElementById("btnCerrarTrabajoOp");
    const btnCerrar2 = document.getElementById("btnCerrarTrabajoOp2");
    const formTrabajo = document.getElementById("form-trabajo-operador");
    const btnCompletar = document.getElementById("btnCompletarDesdePanel");

    if (btnCerrar1) {
        btnCerrar1.addEventListener("click", () => {
            modalTrabajo.style.display = "none";
            solicitudEnTrabajo = null;
        });
    }

    if (btnCerrar2) {
        btnCerrar2.addEventListener("click", () => {
            modalTrabajo.style.display = "none";
            solicitudEnTrabajo = null;
        });
    }

    if (formTrabajo) {
        formTrabajo.onsubmit = guardarTrabajoOperador;
    }

    if (btnCompletar) {
        btnCompletar.addEventListener("click", completarDesdePanel);
    }
}

window.abrirModalEditarSolicitud = function (id) {
    const s = todasLasSolicitudes.find(sol => sol.request_id === id);
    if (!s) return;

    const modal = document.getElementById("modalSolicitud");
    const form = document.getElementById("form-solicitud");
    document.getElementById("tituloModalSolicitud").innerText = "Editar Solicitud";

    if (form) {
        validSolicitudId = s.request_id;
        
        // Cargar clientes y luego asignar el valor
        cargarClientesSelect().then(() => {
            document.getElementById("solicitud-cliente").value = s.cliente;
        });

        document.getElementById("solicitud-fecha").value = s.fecha;
        document.getElementById("solicitud-origen").value = s.origen;
        document.getElementById("solicitud-destino").value = s.destino;
        document.getElementById("solicitud-descripcion").value = s.descripcion;
        document.getElementById("solicitud-tipo-vehiculo").value = s.tipo_vehiculo;
        document.getElementById("solicitud-prioridad").value = s.prioridad;
    }

    modal.style.display = "flex";
};

window.eliminarSolicitud = async function (id) {
    if (!confirm("¿Está seguro de eliminar esta solicitud?")) return;

    try {
        const response = await fetch(`${getBaseUrl()}/request/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        if (response.ok) {
            Toast.success("Solicitud eliminada");
            cargarSolicitudes();
        } else {
            Toast.error("Error al eliminar");
        }
    } catch (e) {
        console.error("Error de red:", e);
        Toast.error("Error de red");
    }
};

/* =========================================================
   SUBMIT - CREAR / EDITAR SOLICITUD
   ========================================================= */

async function submitSolicitud(e) {
    e.preventDefault();

    const data = {
        cliente: document.getElementById('solicitud-cliente').value,
        fecha: document.getElementById('solicitud-fecha').value,
        origen: document.getElementById('solicitud-origen').value,
        destino: document.getElementById('solicitud-destino').value,
        descripcion: document.getElementById('solicitud-descripcion').value,
        tipo_vehiculo: document.getElementById('solicitud-tipo-vehiculo').value,
        prioridad: document.getElementById('solicitud-prioridad').value
    };

    try {
        let method = 'POST';
        let url = `${getBaseUrl()}/request/`;

        if (validSolicitudId) {
            method = 'PUT';
            url = `${url}${validSolicitudId}`;
        }

        const response = await fetch(url, {
            method: method,
            headers: getHeaders(),
            body: JSON.stringify(data)
        });

        if (response.ok) {
            Toast.success("Solicitud guardada");
            document.getElementById("modalSolicitud").style.display = "none";
            document.getElementById('form-solicitud').reset();
            cargarSolicitudes();
        } else {
            const err = await response.json();
            Toast.error(err.detail || "Error al guardar");
        }
    } catch (error) {
        console.error("Error de red:", error);
        Toast.error("Error de conexión");
    }
}

/* =========================================================
   AUTOCOMPLETE - BÚSQUEDA DE PUNTOS DE REFERENCIA
   ========================================================= */

function setupAutocompleteLocations(inputId, resultsId) {
    const input = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    let debounceTimer;

    if (!input || !results) return;

    input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim();

        if (query.length < 3) {
            results.classList.remove("active");
            return;
        }

        debounceTimer = setTimeout(async () => {
            // Usamos Photon API (basado en OSM) restringido a RD para velocidad
            // bbox=[-72.0, 17.5, -68.3, 20.0] aprox para Rep. Dom.
            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&bbox=-72,17.4,-68.3,20&limit=5`;
            
            try {
                const res = await fetch(url);
                const data = await res.json();
                renderAutocompleteResults(data.features, results, input, inputId);
            } catch (err) {
                console.error("Error fetching suggestions:", err);
            }
        }, 300);
    });

    // Cerrar lista al hacer click fuera
    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.classList.remove("active");
        }
    });
}

function renderAutocompleteResults(features, container, input, inputId) {
    if (!features || features.length === 0) {
        container.classList.remove("active");
        return;
    }

    container.innerHTML = "";
    container.classList.add("active");

    features.forEach(f => {
        const props = f.properties;
        const name = props.name || props.street || "Punto de referencia";
        const city = props.city || props.state || "RD";
        const country = props.country || "República Dominicana";
        const address = `${city}, ${country}`;

        const item = document.createElement("div");
        item.className = "autocomplete-item";
        item.innerHTML = `
            <i class="bi bi-geo-alt-fill"></i>
            <div class="poi-info">
                <span class="poi-name">${name}</span>
                <span class="poi-address">${address}</span>
            </div>
        `;

        item.onclick = () => {
            input.value = name;
            container.classList.remove("active");
            
            // Si tenemos coordenadas de Photon, actualizar mapa
            if (f.geometry && f.geometry.coordinates) {
                const coords = {
                    lat: f.geometry.coordinates[1],
                    lng: f.geometry.coordinates[0]
                };
                
                if (inputId === "solicitud-origen") {
                    originCoords = coords;
                    updateOriginMarker(coords);
                } else {
                    destinationCoords = coords;
                    updateDestinationMarker(coords);
                }
                
                if (originCoords && destinationCoords) {
                    calculateOptimalRoute();
                    fitMapToRoute();
                } else {
                    modalMap.setView(coords, 16);
                }
            }
        };

        container.appendChild(item);
    });
}

/* =========================================================
   LÓGICA DEL MAPA DEL MODAL
   ========================================================= */

function initModalMap() {
    const mapDiv = document.getElementById("modal-map-solicitud");
    if (!mapDiv) return;

    if (modalMap) {
        modalMap.remove();
        modalMap = null;
    }

    const boundsDR = L.latLngBounds(
        L.latLng(17.47, -72.0),
        L.latLng(19.95, -68.32)
    );

    modalMap = L.map("modal-map-solicitud", {
        center: [18.4861, -69.9312],
        zoom: 12,
        minZoom: 8,
        maxBounds: boundsDR,
        maxBoundsViscosity: 1.0,
        zoomControl: true
    });

    const isDark = document.body.classList.contains("dark-mode");
    // Usar la capa estándar de OpenStreetMap que tiene más detalle de POIs (Megacentro, etc.)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 20
    }).addTo(modalMap);

    modalMap.on("click", (e) => {
        handleModalMapClick(e.latlng);
    });
}

function resetMapMarkers() {
    originCoords = null;
    destinationCoords = null;
    if (originMarker) modalMap.removeLayer(originMarker);
    if (destinationMarker) modalMap.removeLayer(destinationMarker);
    if (routingControl) modalMap.removeControl(routingControl);
    originMarker = null;
    destinationMarker = null;
    routingControl = null;
}

function handleModalMapClick(latlng) {
    if (!originCoords) {
        originCoords = latlng;
        updateOriginMarker(latlng);
        reverseGeocode(latlng, "solicitud-origen");
        modalMap.setView(latlng, 16);
    } else if (!destinationCoords) {
        destinationCoords = latlng;
        updateDestinationMarker(latlng);
        reverseGeocode(latlng, "solicitud-destino");
        calculateOptimalRoute();
    } else {
        resetMapMarkers();
        originCoords = latlng;
        updateOriginMarker(latlng);
        reverseGeocode(latlng, "solicitud-origen");
        modalMap.setView(latlng, 16);
    }
}

function updateOriginMarker(coords) {
    if (originMarker) modalMap.removeLayer(originMarker);
    originMarker = L.marker(coords, {
        icon: L.divIcon({
            className: "custom-div-icon",
            html: "<div style='background-color:#3b82f6; width:12px; height:12px; border-radius:50%; border:2px solid white;'></div>",
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        })
    }).addTo(modalMap).bindPopup("<b>Origen</b>").openPopup();
}

function updateDestinationMarker(coords) {
    if (destinationMarker) modalMap.removeLayer(destinationMarker);
    destinationMarker = L.marker(coords, {
        icon: L.divIcon({
            className: "custom-div-icon",
            html: "<div style='background-color:#ef4444; width:12px; height:12px; border-radius:50%; border:2px solid white;'></div>",
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        })
    }).addTo(modalMap).bindPopup("<b>Destino</b>").openPopup();
}

async function calculateOptimalRoute() {
    if (!originCoords || !destinationCoords) return;

    if (routingControl) {
        modalMap.removeControl(routingControl);
    }

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(originCoords.lat, originCoords.lng),
            L.latLng(destinationCoords.lat, destinationCoords.lng)
        ],
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1'
        }),
        lineOptions: {
            styles: [{ color: '#3b82f6', opacity: 0.8, weight: 6 }]
        },
        addWaypoints: false,
        draggableWaypoints: false,
        show: false,
        createMarker: function() { return null; }
    }).addTo(modalMap);
}

function fitMapToRoute() {
    if (originCoords && destinationCoords) {
        const group = new L.featureGroup([L.marker(originCoords), L.marker(destinationCoords)]);
        modalMap.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
}

async function reverseGeocode(latlng, inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        
        // Priorizar el nombre del lugar (Megacentro, etc) si existe
        let displayName = data.name;
        
        if (!displayName) {
            // Si no tiene nombre el punto, usar calle o lo más cercano
            displayName = data.address.road || data.address.suburb || data.address.city || "Punto seleccionado";
            if (data.address.house_number && data.address.road) {
                displayName = data.address.house_number + " " + data.address.road;
            }
        }
        
        input.value = displayName;
    } catch (err) {
        console.error("Geocoding error", err);
    }
}

window.clearSolicitudField = function(type) {
    if (type === 'origen') {
        originCoords = null;
        if (originMarker) modalMap.removeLayer(originMarker);
        originMarker = null;
        document.getElementById("solicitud-origen").value = "";
    } else {
        destinationCoords = null;
        if (destinationMarker) modalMap.removeLayer(destinationMarker);
        destinationMarker = null;
        document.getElementById("solicitud-destino").value = "";
    }

    if (routingControl) {
        modalMap.removeControl(routingControl);
        routingControl = null;
    }

    // Si queda un punto, centrar mapa en él. Si no, restaurar vista inicial.
    if (originCoords) {
        modalMap.setView(originCoords, 16);
    } else if (destinationCoords) {
        modalMap.setView(destinationCoords, 16);
    } else {
        modalMap.setView([18.4861, -69.9312], 12);
    }
};

/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

function initSolicitudes() {
    initFiltros();
    initSolicitudModals();
    cargarSolicitudes();
    
    // Inicializar autocompletados
    setupAutocompleteLocations("solicitud-origen", "results-origen");
    setupAutocompleteLocations("solicitud-destino", "results-destino");
}
