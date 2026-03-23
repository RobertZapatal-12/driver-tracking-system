/* =========================================================
   CONFIGURACIÓN GENERAL
   ========================================================= */
const API_URL = "http://127.0.0.1:8000/drivers";

let editandoDriverId = null;

/* =========================================================
   ESTADO GLOBAL DE LA LISTA DE CONDUCTORES
   - todosLosConductores: lista completa traída desde la API
   - conductoresFiltrados: lista luego de aplicar búsqueda
   - paginaActual: página actualmente visible
   - conductoresPorPagina: cantidad por página
   ========================================================= */
let todosLosConductores = [];
let conductoresFiltrados = [];
let paginaActual = 1;
const conductoresPorPagina = 3;


/* =========================================================
   CARGAR CONDUCTORES DESDE LA API
   - Trae todos los conductores
   - Guarda la lista completa
   - Inicializa búsqueda y paginación
   ========================================================= */
async function cargarConductores() {
    try {

        const lista = document.getElementById("listaConductores");
        if (lista) {
            lista.innerHTML = `
                <div class="col-12 text-center text-muted py-4">
                Cargando conductores...
                </div>
            `;
        }

        const res = await fetch(`${API_URL}/`);
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
    }
}


/* =========================================================
   BUSCADOR DE CONDUCTORES
   - Filtra por nombre en tiempo real
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

    conductoresFiltrados = todosLosConductores.filter(driver => {
    const nombre = (String(driver.nombre) || "").toLowerCase();
    const cedula = (String(driver.cedula) || "").toLowerCase();
    const telefono = (String(driver.telefono) || "").toLowerCase();
    const licencia = (String(driver.numero_licencia) || "").toLowerCase();

    return (
        nombre.includes(texto) ||
        cedula.includes(texto) ||
        telefono.includes(texto) ||
        licencia.includes(texto)
    );
});

    renderPaginaConductores();
    renderPaginacionConductores();
}


/* =========================================================
   RENDER DE CONDUCTORES SEGÚN LA PÁGINA ACTUAL
   - Muestra solo los conductores de la página activa
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
   - Genera botones: 1, 2, 3...
   - Cada botón cambia la página visible
   ========================================================= */
function renderPaginacionConductores() {
    const contenedor = document.getElementById("paginacionConductores");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const totalPaginas = Math.ceil(conductoresFiltrados.length / conductoresPorPagina);

    if (totalPaginas <= 1) return;

    // Botón Anterior
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

    // Botones numéricos
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

    // Botón Siguiente
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
   - Hace POST a la API
   ========================================================= */
async function crearDriver(driver) {
    const res = await fetch(`${API_URL}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(driver)
    });

    if (!res.ok) {
        throw new Error("No se pudo crear el conductor");
    }

    return await res.json();
}


/* =========================================================
   ACTUALIZAR CONDUCTOR
   - Hace PUT a la API usando el ID
   ========================================================= */
async function actualizarDriver(id, driver) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(driver)
    });

    if (!res.ok) {
        throw new Error("No se pudo actualizar el conductor");
    }

    return await res.json();
}


/* =========================================================
   ELIMINAR CONDUCTOR
   - Hace DELETE a la API
   ========================================================= */
async function eliminarDriver(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE"
    });

    if (!res.ok) {
        throw new Error("No se pudo eliminar el conductor");
    }

    return await res.json();
}


/* =========================================================
   CONFIRMAR ELIMINACIÓN
   - Pide confirmación al usuario
   - Elimina
   - Recarga lista y paginación
   ========================================================= */
async function confirmarEliminacion(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar a este conductor?")) return;

    try {
        await eliminarDriver(id);
        await cargarConductores();
        alert("✅ Conductor eliminado correctamente");
    } catch (error) {
        console.error(error);
        alert("❌ Error al eliminar");
    }
}


/* =========================================================
   EDITAR CONDUCTOR
   - Trae los datos del conductor
   - Llena el formulario del modal
   - Cambia a modo edición
   ========================================================= */
async function editarDriver(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        if (!res.ok) {
            throw new Error("No se pudo obtener el conductor");
        }

        const d = await res.json();

        editandoDriverId = id;

        document.getElementById("nombreC").value = d.nombre || "";
        document.getElementById("telefonoC").value = d.telefono || "";
        document.getElementById("cedulaC").value = d.cedula || "";
        document.getElementById("numLicenciaC").value = d.numero_licencia || "";
        document.getElementById("tipoLicenciaC").value = d.tipo_licencia || "";
        document.getElementById("estadoC").value = d.estado || "";
        document.getElementById("descripcionC").value = d.descripcion || "";

        const preview = document.getElementById("imgPreview");
        if (preview) {
            preview.src = d.imagen || "https://via.placeholder.com/150?text=Subir+Foto";
        }

        const tituloModal = document.getElementById("tituloModalConductor");
        if (tituloModal) {
            tituloModal.textContent = "Editar Conductor";
        }

        const btnGuardar = document.getElementById("btnGuardarConductor");
        if (btnGuardar) {
            btnGuardar.textContent = "Actualizar";
        }

        window.driverAppData.foto = d.imagen || "";

        const modal = document.querySelector(".modal-overlay");
        if (modal) modal.style.display = "block";

    } catch (error) {
        console.error(error);
        alert("❌ No se pudo cargar el conductor para editar");
    }
}


/* =========================================================
   LIMPIAR MODO EDICIÓN
   - Vuelve a modo crear
   ========================================================= */
function limpiarModoEdicion() {
    editandoDriverId = null;
}