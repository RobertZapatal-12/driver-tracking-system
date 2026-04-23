/* =========================================================
   CONFIGURACIÓN GENERAL
   ========================================================= */
const DRIVERS_ENDPOINT = "/drivers";

let editandoDriverId = null;

/* =========================================================
   ESTADO GLOBAL DE LA LISTA DE CONDUCTORES
   ========================================================= */
let todosLosConductores = [];
let conductoresFiltrados = [];
let paginaActual = 1;
const conductoresPorPagina = 3;

/* =========================================================
   CARGAR CONDUCTORES DESDE LA API
   ========================================================= */
async function cargarConductores() {
    try {
        const lista = document.getElementById("listaConductores");
        if (lista) {
            lista.innerHTML = `
                <div class="col-12 text-center text-muted py-4">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    Cargando conductores...
                </div>
            `;
        }

        const res = await CONFIG.fetchAuth(`${DRIVERS_ENDPOINT}/`);
        if (!res.ok) {
            throw new Error("No se pudieron cargar los conductores");
        }

        const data = await res.json();

        todosLosConductores = data;
        paginaActual = 1;

        aplicarFiltroConductores();
        inicializarBuscadorConductores();

    } catch (error) {
        console.error("Error al cargar desde la API:", error);
        Toast.error("No se pudieron cargar los conductores. Verifica la conexión.");
    }
}

/* =========================================================
   BUSCADOR DE CONDUCTORES
   ========================================================= */
function inicializarBuscadorConductores() {
    const input = document.getElementById("buscadorConductores");
    if (!input) return;

    input.oninput = () => {
        paginaActual = 1;
        aplicarFiltroConductores();
    };
}

function aplicarFiltroConductores() {
    const input = document.getElementById("buscadorConductores");
    const texto = input ? input.value.trim().toLowerCase() : "";

    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    conductoresFiltrados = todosLosConductores.filter(driver => {
        // Filtro de texto (existente)
        const nombre = (String(driver.nombre) || "").toLowerCase();
        const cedula = (String(driver.cedula) || "").toLowerCase();
        const telefono = (String(driver.telefono) || "").toLowerCase();
        const licencia = (String(driver.numero_licencia) || "").toLowerCase();

        const coincideTexto = (
            nombre.includes(texto) ||
            cedula.includes(texto) ||
            telefono.includes(texto) ||
            licencia.includes(texto)
        );

        // Filtro de Alertas (Dashboard)
        if (filtroDriversActual === "alertas") {
            const fechas = [driver.vencimiento_licencia, driver.vencimiento_seguro];
            const tieneAlerta = fechas.some(fStr => {
                if (!fStr) return false;
                const f = new Date(fStr + "T00:00:00");
                const diff = (f - hoy) / (1000 * 60 * 60 * 24);
                return diff <= 30; // Vencido o próximo
            });
            return coincideTexto && tieneAlerta;
        }

        return coincideTexto;
    });

    // Mostrar aviso si el filtro de alertas está activo
    const buscadorContainer = input?.parentElement;
    if (buscadorContainer) {
        let alertBadge = document.getElementById("badgeFiltroAlertas");
        if (filtroDriversActual === "alertas") {
            if (!alertBadge) {
                alertBadge = document.createElement("div");
                alertBadge.id = "badgeFiltroAlertas";
                alertBadge.className = "alert alert-warning py-2 px-3 mt-2 d-flex justify-content-between align-items-center";
                alertBadge.innerHTML = `
                    <span class="small"><i class="bi bi-funnel-fill me-2"></i>Filtrando por <strong>Documentos Vencidos o Próximos</strong></span>
                    <button class="btn btn-sm btn-outline-warning border-0" onclick="filtroDriversActual=null; aplicarFiltroConductores()">Quitar filtro</button>
                `;
                buscadorContainer.appendChild(alertBadge);
            }
        } else if (alertBadge) {
            alertBadge.remove();
        }
    }

    renderPaginaConductores();
    renderPaginacionConductores();
}

/* =========================================================
   RENDER DE CONDUCTORES SEGÚN LA PÁGINA ACTUAL
   ========================================================= */
function renderPaginaConductores() {
    const lista = document.getElementById("listaConductores");

    if (!lista) {
        console.error("No existe #listaConductores");
        return;
    }

    lista.innerHTML = "";

    const inicio = (paginaActual - 1) * conductoresPorPagina;
    const fin = inicio + conductoresPorPagina;
    const conductoresPagina = conductoresFiltrados.slice(inicio, fin);

    if (conductoresPagina.length === 0) {
        lista.innerHTML = `
            <div class="col-12">
                <div class="alert alert-light border text-center py-4">
                    <strong>No se encontraron conductores.</strong><br>
                    Intenta con otro nombre, cédula, teléfono o licencia.
                </div>
            </div>
        `;
        return;
    }

    conductoresPagina.forEach(driver => {
        renderDriverCard(driver);
    });
}

/* =========================================================
   PAGINACIÓN
   ========================================================= */
function renderPaginacionConductores() {
    const contenedor = document.getElementById("paginacionConductores");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const totalPaginas = Math.ceil(conductoresFiltrados.length / conductoresPorPagina);

    if (totalPaginas <= 1) return;

    const btnAnterior = document.createElement("button");
    btnAnterior.textContent = "Anterior";
    btnAnterior.className = "btn btn-outline-primary";
    btnAnterior.disabled = paginaActual === 1;

    btnAnterior.onclick = () => {
        if (paginaActual > 1) {
            paginaActual--;
            renderPaginaConductores();
            renderPaginacionConductores();
        }
    };

    contenedor.appendChild(btnAnterior);

    for (let i = 1; i <= totalPaginas; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.className = `btn ${i === paginaActual ? "btn-primary" : "btn-outline-primary"}`;

        btn.onclick = () => {
            paginaActual = i;
            renderPaginaConductores();
            renderPaginacionConductores();
        };

        contenedor.appendChild(btn);
    }

    const btnSiguiente = document.createElement("button");
    btnSiguiente.textContent = "Siguiente";
    btnSiguiente.className = "btn btn-outline-primary";
    btnSiguiente.disabled = paginaActual === totalPaginas;

    btnSiguiente.onclick = () => {
        if (paginaActual < totalPaginas) {
            paginaActual++;
            renderPaginaConductores();
            renderPaginacionConductores();
        }
    };

    contenedor.appendChild(btnSiguiente);
}

/* =========================================================
   CREAR CONDUCTOR
   ========================================================= */
async function crearDriver(driver) {
    const res = await CONFIG.fetchAuth(`${DRIVERS_ENDPOINT}/`, {
        method: "POST",
        body: JSON.stringify(driver)
    });

    if (!res.ok) {
        throw new Error("No se pudo crear el conductor");
    }

    return await res.json();
}

/* =========================================================
   ACTUALIZAR CONDUCTOR
   ========================================================= */
async function actualizarDriver(id, driver) {
    const res = await CONFIG.fetchAuth(`${DRIVERS_ENDPOINT}/${id}`, {
        method: "PUT",
        body: JSON.stringify(driver)
    });

    if (!res.ok) {
        throw new Error("No se pudo actualizar el conductor");
    }

    return await res.json();
}

/* =========================================================
   ELIMINAR CONDUCTOR
   ========================================================= */
async function eliminarDriver(id) {
    const res = await CONFIG.fetchAuth(`${DRIVERS_ENDPOINT}/${id}`, {
        method: "DELETE"
    });

    if (!res.ok) {
        throw new Error("No se pudo eliminar el conductor");
    }

    return await res.json();
}

/* =========================================================
   CONFIRMAR ELIMINACIÓN (usa Toast.confirm)
   ========================================================= */
async function confirmarEliminacion(id) {
    const confirmado = await Toast.confirm("¿Estás seguro de que deseas eliminar a este conductor? Esta acción no se puede deshacer.");
    if (!confirmado) return;

    try {
        await eliminarDriver(id);
        await cargarConductores();
        Toast.success("Conductor eliminado correctamente");
    } catch (error) {
        console.error(error);
        Toast.error("No se pudo eliminar el conductor");
    }
}

/* =========================================================
   EDITAR CONDUCTOR
   ========================================================= */
async function editarDriver(id) {
    try {
        const res = await CONFIG.fetchAuth(`${DRIVERS_ENDPOINT}/${id}`);
        if (!res.ok) {
            throw new Error("No se pudo obtener el conductor");
        }

        const d = await res.json();

        editandoDriverId = id;

        // IDs corregidos para coincidir con conductores.html
        document.getElementById("nombreC").value = d.nombre || "";
        document.getElementById("telefonoC").value = d.telefono || "";
        document.getElementById("cedulaC").value = d.cedula || "";
        document.getElementById("numLicenciaC").value = d.numero_licencia || "";
        document.getElementById("tipoLicenciaC").value = d.tipo_licencia || "";
        document.getElementById("estadoC").value = d.estado || "";
        document.getElementById("descripcionC").value = d.descripcion || "";

        // Campos de acceso a la app
        const emailEl = document.getElementById("emailC");
        const passwordEl = document.getElementById("passwordC");
        const accessStatus = document.getElementById("driver-access-status");
        const accessOk = document.getElementById("access-badge-ok");
        const accessNo = document.getElementById("access-badge-no");

        if (emailEl) emailEl.value = d.email_usuario || "";
        if (passwordEl) passwordEl.value = ""; // Nunca mostrar contraseña

        if (accessStatus && accessOk && accessNo) {
            accessStatus.classList.remove("d-none");
            if (d.email_usuario) {
                accessOk.classList.remove("d-none");
                accessNo.classList.add("d-none");
            } else {
                accessOk.classList.add("d-none");
                accessNo.classList.remove("d-none");
            }
        }

        window.driverAppData = window.driverAppData || {};
        window.driverAppData.foto = d.imagen || "";

        const preview = document.getElementById("imgPreview");
        if (preview) {
            preview.src = d.imagen || "https://via.placeholder.com/80x80?text=Foto";
        }

        // Cargar fechas de vencimiento
        const vLicEl = document.getElementById("vencimientoLicenciaC");
        if (vLicEl) vLicEl.value = d.vencimiento_licencia || "";

        // Abrir panel si ya tiene fechas, y actualizar badges
        if (d.vencimiento_licencia) {
            const panel   = document.getElementById("panelVencimientos");
            const chevron = document.getElementById("chevronVencimientos");
            if (panel)   panel.style.display = "block";
            if (chevron) chevron.style.transform = "rotate(180deg)";
        }
        if (typeof actualizarBadgesVencimiento === "function") {
            actualizarBadgesVencimiento();
        }

        const tituloModal = document.getElementById("tituloModalConductor");
        if (tituloModal) {
            tituloModal.textContent = "Editar Conductor";
        }

        const btnGuardar = document.getElementById("btnGuardarConductor");
        if (btnGuardar) {
            btnGuardar.textContent = "Actualizar";
        }

        const modalCard = document.querySelector(".modal-card");
        if (modalCard) {
            modalCard.classList.remove("modo-crear");
            modalCard.classList.add("modo-edicion");
        }

        const modal = document.querySelector(".modal-overlay");
        if (modal) {
            modal.style.display = "flex";
        }

        // Inicializar eventos del modal (como el toggle de password) cada vez que se abre para edición
        // o asegurar que estén listos.
        inicializarEventosConductores();

    } catch (error) {
        console.error(error);
        Toast.error("No se pudo cargar el conductor para editar");
    }
}

/* =========================================================
   INICIALIZAR EVENTOS DE LA PÁGINA/MODAL
   ========================================================= */
function inicializarEventosConductores() {
    // Toggle show/hide contraseña en modal conductor
    const toggleBtn = document.getElementById('togglePasswordC');
    if (toggleBtn && !toggleBtn.dataset.init) {
        toggleBtn.addEventListener('click', function () {
            const input = document.getElementById('passwordC');
            const icon  = document.getElementById('eyeIcon');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'bi bi-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'bi bi-eye';
            }
        });
        toggleBtn.dataset.init = "true";
    }
}

/* =========================================================
   FUNCIONES DE VENCIMIENTOS (Expuestas globalmente)
   ========================================================= */
window.toggleVencimientos = function() {
    const panel   = document.getElementById("panelVencimientos");
    const chevron = document.getElementById("chevronVencimientos");
    if (!panel) return;
    
    const open = panel.style.display !== "none";
    panel.style.display = open ? "none" : "block";
    if (chevron) {
        chevron.style.transform = open ? "rotate(0deg)" : "rotate(180deg)";
    }
};

window._estadoFecha = function(valorInput) {
    if (!valorInput) return { color: "#64748b", bg: "#f1f5f9", icon: "bi-dash-circle", texto: "Sin fecha" };
    const hoy  = new Date();
    const fecha = new Date(valorInput + "T00:00:00");
    const dias  = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));

    if (dias < 0)        return { color: "#dc2626", bg: "#fef2f2", icon: "bi-x-circle-fill",       texto: `Vencido hace ${Math.abs(dias)} días` };
    if (dias <= 30)      return { color: "#d97706", bg: "#fffbeb", icon: "bi-exclamation-triangle-fill", texto: `Vence en ${dias} días` };
    return               { color: "#16a34a", bg: "#f0fdf4", icon: "bi-check-circle-fill",          texto: `Vence en ${dias} días` };
};

window.actualizarBadgesVencimiento = function() {
    const licVal = document.getElementById("vencimientoLicenciaC")?.value;

    const lic = _estadoFecha(licVal);

    const badgeLic = document.getElementById("badgeLicencia");

    if (badgeLic) badgeLic.innerHTML = `<span style="color:${lic.color};"><i class="bi ${lic.icon} me-1"></i>${lic.texto}</span>`;

    const badgesBtn = document.getElementById("vencimientoBadges");
    if (badgesBtn) {
        badgesBtn.innerHTML = "";
        if (licVal) {
            const span = document.createElement("span");
            span.style.cssText = `background:${lic.bg}; color:${lic.color}; border-radius:6px; padding:2px 7px; font-size:0.7rem; font-weight:600;`;
            span.innerHTML = `<i class="bi bi-card-text me-1"></i>Lic`;
            badgesBtn.appendChild(span);
        }
    }
};

/* =========================================================
   LIMPIAR MODO EDICIÓN
   ========================================================= */
function limpiarModoEdicion() {
    editandoDriverId = null;
}

// Alias para compatibilidad con app.js
function limpiarModoEdicionDriver() {
    limpiarModoEdicion();
}