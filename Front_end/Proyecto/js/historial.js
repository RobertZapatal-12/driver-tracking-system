/* =========================================================
   ESTADO GLOBAL DEL HISTORIAL
   ========================================================= */
let historialCompleto = [];
let historialFiltrado = [];
let paginaActualHistorial = 1;
const historialPorPagina = 10;
let filtroInicialConductor = null; // Para cuando se redirige desde otra pantalla

/* =========================================================
   INICIALIZACIÓN
   ========================================================= */
window.initHistorial = async function() {
    // Revisar si venimos redirigidos con un filtro de conductor
    if (window.filtroDriversActual && typeof window.filtroDriversActual === 'object' && window.filtroDriversActual.filterDriver) {
        filtroInicialConductor = window.filtroDriversActual.filterDriver.toString();
        // Limpiamos la variable global para no afectar futuras navegaciones
        window.filtroDriversActual = null;
    }

    await cargarSelectConductores();
    await cargarDatosHistorial();
    configurarEventosFiltros();
};

/* =========================================================
   CARGAR OPCIONES DE CONDUCTORES EN EL SELECT
   ========================================================= */
async function cargarSelectConductores() {
    try {
        const res = await CONFIG.fetchAuth("/drivers/");
        if (!res.ok) throw new Error("Error loading drivers");
        const drivers = await res.json();
        
        const select = document.getElementById("filtroDriverHistorial");
        if (!select) return;
        
        // Mantener la primera opción "Todos los conductores"
        const primeraOpcion = select.options[0];
        select.innerHTML = "";
        select.appendChild(primeraOpcion);
        
        drivers.forEach(d => {
            const option = document.createElement("option");
            option.value = d.driver_id;
            option.textContent = d.nombre;
            select.appendChild(option);
        });

        // Si venimos redirigidos, seleccionar automáticamente el conductor
        if (filtroInicialConductor) {
            select.value = filtroInicialConductor;
        }
        
    } catch (e) {
        console.error("Error al cargar conductores para el filtro:", e);
    }
}

/* =========================================================
   CARGAR DATOS DEL HISTORIAL DESDE LA API
   ========================================================= */
async function cargarDatosHistorial() {
    const tbody = document.querySelector("#tablaHistorial tbody");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;
    }

    try {
        const res = await CONFIG.fetchAuth("/request/");
        if (!res.ok) throw new Error("Error loading requests");
        const requests = await res.json();
        
        // Filtrar solo los completados
        historialCompleto = requests.filter(r => r.estado === "completada" || r.sub_estado === "completada");
        
        // Ordenar por fecha descendente (más recientes primero)
        historialCompleto.sort((a, b) => {
            const dateA = new Date(a.fecha.replace(" ", "T"));
            const dateB = new Date(b.fecha.replace(" ", "T"));
            return dateB - dateA;
        });

        aplicarFiltrosHistorial();
        
    } catch (e) {
        console.error("Error cargando el historial completo:", e);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Error al cargar los datos.</td></tr>`;
        }
    }
}

/* =========================================================
   FILTROS Y BÚSQUEDA
   ========================================================= */
function configurarEventosFiltros() {
    const buscador = document.getElementById("buscadorHistorial");
    const driverSelect = document.getElementById("filtroDriverHistorial");
    const desdeInput = document.getElementById("filtroDesdeHistorial");
    const hastaInput = document.getElementById("filtroHastaHistorial");

    const eventos = [buscador, driverSelect, desdeInput, hastaInput];
    
    eventos.forEach(el => {
        if (el) {
            el.addEventListener("input", () => {
                paginaActualHistorial = 1;
                aplicarFiltrosHistorial();
            });
            el.addEventListener("change", () => {
                paginaActualHistorial = 1;
                aplicarFiltrosHistorial();
            });
        }
    });
}

window.limpiarFiltrosHistorial = function() {
    document.getElementById("buscadorHistorial").value = "";
    document.getElementById("filtroDriverHistorial").value = "";
    document.getElementById("filtroDesdeHistorial").value = "";
    document.getElementById("filtroHastaHistorial").value = "";
    filtroInicialConductor = null;
    
    paginaActualHistorial = 1;
    aplicarFiltrosHistorial();
};

function aplicarFiltrosHistorial() {
    const texto = (document.getElementById("buscadorHistorial")?.value || "").toLowerCase();
    const driverId = document.getElementById("filtroDriverHistorial")?.value || "";
    const desde = document.getElementById("filtroDesdeHistorial")?.value || "";
    const hasta = document.getElementById("filtroHastaHistorial")?.value || "";

    const desdeDate = desde ? new Date(desde + "T00:00:00") : null;
    const hastaDate = hasta ? new Date(hasta + "T23:59:59") : null;

    historialFiltrado = historialCompleto.filter(h => {
        // Filtro de texto (ruta, código, etc)
        const origen = (h.origen || "").toLowerCase();
        const destino = (h.destino || "").toLowerCase();
        const tracking = (h.tracking_code || "").toLowerCase();
        const descripcion = (h.descripcion || "").toLowerCase();
        
        const matchTexto = origen.includes(texto) || destino.includes(texto) || tracking.includes(texto) || descripcion.includes(texto);

        // Filtro de conductor
        const matchDriver = driverId === "" || h.driver_id.toString() === driverId;

        // Filtro de fecha
        let matchFecha = true;
        if (h.fecha && (desdeDate || hastaDate)) {
            const hDate = new Date(h.fecha.replace(" ", "T"));
            if (!isNaN(hDate)) {
                if (desdeDate && hDate < desdeDate) matchFecha = false;
                if (hastaDate && hDate > hastaDate) matchFecha = false;
            }
        }

        return matchTexto && matchDriver && matchFecha;
    });

    renderTablaHistorial();
    renderPaginacionHistorial();
}

/* =========================================================
   RENDERIZAR TABLA Y PAGINACIÓN
   ========================================================= */
function renderTablaHistorial() {
    const tbody = document.querySelector("#tablaHistorial tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (historialFiltrado.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No se encontraron viajes con los filtros aplicados.</td></tr>`;
        return;
    }

    const inicio = (paginaActualHistorial - 1) * historialPorPagina;
    const fin = inicio + historialPorPagina;
    const items = historialFiltrado.slice(inicio, fin);

    items.forEach(h => {
        let fechaStr = "N/A";
        if (h.fecha && h.fecha !== "None") {
            const f = new Date(h.fecha.replace(" ", "T"));
            if (!isNaN(f)) {
                fechaStr = `${f.toLocaleDateString()} ${f.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            }
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="badge badge-date"><i class="bi bi-calendar3 me-1"></i>${fechaStr}</span></td>
            <td class="fw-bold text-primary">${h.driver_nombre || 'Conductor Desconocido'}</td>
            <td class="small" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${h.origen}"><i class="bi bi-geo-alt-fill text-danger me-1"></i>${h.origen}</td>
            <td class="small" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${h.destino}"><i class="bi bi-geo-alt-fill text-success me-1"></i>${h.destino}</td>
            <td><code>${h.tracking_code || 'N/A'}</code></td>
            <td class="small text-muted" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${h.notas_operador || ''}">
                ${h.notas_operador ? `<i class="bi bi-sticky me-1 text-warning"></i>${h.notas_operador}` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPaginacionHistorial() {
    const contenedor = document.getElementById("paginacionHistorial");
    if (!contenedor) return;

    contenedor.innerHTML = "";
    const totalPaginas = Math.ceil(historialFiltrado.length / historialPorPagina);

    if (totalPaginas <= 1) return;

    // Botón Anterior
    const btnAnterior = document.createElement("button");
    btnAnterior.className = "btn btn-outline-primary btn-sm";
    btnAnterior.textContent = "Anterior";
    btnAnterior.disabled = paginaActualHistorial === 1;
    btnAnterior.onclick = () => {
        if (paginaActualHistorial > 1) {
            paginaActualHistorial--;
            renderTablaHistorial();
            renderPaginacionHistorial();
        }
    };
    contenedor.appendChild(btnAnterior);

    // Páginas
    for (let i = 1; i <= totalPaginas; i++) {
        // Solo mostrar un rango de páginas para no saturar si hay muchas
        if (i === 1 || i === totalPaginas || (i >= paginaActualHistorial - 2 && i <= paginaActualHistorial + 2)) {
            const btn = document.createElement("button");
            btn.className = `btn btn-sm ${i === paginaActualHistorial ? 'btn-primary' : 'btn-outline-primary'}`;
            btn.textContent = i;
            btn.onclick = () => {
                paginaActualHistorial = i;
                renderTablaHistorial();
                renderPaginacionHistorial();
            };
            contenedor.appendChild(btn);
        } else if (i === paginaActualHistorial - 3 || i === paginaActualHistorial + 3) {
            const dots = document.createElement("span");
            dots.className = "mx-1 mt-1 text-muted";
            dots.textContent = "...";
            contenedor.appendChild(dots);
        }
    }

    // Botón Siguiente
    const btnSiguiente = document.createElement("button");
    btnSiguiente.className = "btn btn-outline-primary btn-sm";
    btnSiguiente.textContent = "Siguiente";
    btnSiguiente.disabled = paginaActualHistorial === totalPaginas;
    btnSiguiente.onclick = () => {
        if (paginaActualHistorial < totalPaginas) {
            paginaActualHistorial++;
            renderTablaHistorial();
            renderPaginacionHistorial();
        }
    };
    contenedor.appendChild(btnSiguiente);
}
