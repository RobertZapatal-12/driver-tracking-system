/* =========================================================
   CONFIGURACIÓN GENERAL
   ========================================================= */
const API_URL_CLIENTS = "http://127.0.0.1:8000/clients";

let editandoClienteId = null;

/* =========================================================
   ESTADO GLOBAL DE LA LISTA DE CLIENTES
   ========================================================= */
let todosLosClientes = [];
let clientesFiltrados = [];
let paginaActualClientes = 1;
const clientesPorPagina = 3;

/* =========================================================
   CARGAR CLIENTES DESDE LA API
   ========================================================= */
async function cargarClientes() {
    try {
        const lista = document.getElementById("listaClientes");
        if (lista) {
            lista.innerHTML = `
                <div class="col-12 text-center text-muted py-4">
                    Cargando clientes...
                </div>
            `;
        }

        const res = await fetch(`${API_URL_CLIENTS}/`);
        if (!res.ok) {
            throw new Error("No se pudieron cargar los clientes");
        }

        const data = await res.json();

        todosLosClientes = data;
        paginaActualClientes = 1;

        aplicarFiltroClientes();
        inicializarBuscadorClientes();

    } catch (error) {
        console.error("Error al cargar desde la API:", error);
    }
}

/* =========================================================
   BUSCADOR DE CLIENTES
   ========================================================= */
function inicializarBuscadorClientes() {
    const input = document.getElementById("buscadorClientes");
    if (!input) return;

    input.oninput = () => {
        paginaActualClientes = 1;
        aplicarFiltroClientes();
    };
}

function aplicarFiltroClientes() {
    const input = document.getElementById("buscadorClientes");
    const texto = input ? input.value.trim().toLowerCase() : "";

    clientesFiltrados = todosLosClientes.filter(client => {
        const nombre = (String(client.nombre) || "").toLowerCase();
        const cedula = (String(client.cedula) || "").toLowerCase();
        const telefono = (String(client.telefono) || "").toLowerCase();
        const email = (String(client.email) || "").toLowerCase();

        return (
            nombre.includes(texto) ||
            cedula.includes(texto) ||
            telefono.includes(texto) ||
            email.includes(texto)
        );
    });

    renderPaginaClientes();
    renderPaginacionClientes();
}

/* =========================================================
   RENDER DE CLIENTES SEGÚN LA PÁGINA ACTUAL
   ========================================================= */
function renderPaginaClientes() {
    const lista = document.getElementById("listaClientes");

    if (!lista) {
        console.error("No existe #listaClientes");
        return;
    }

    lista.innerHTML = "";

    const inicio = (paginaActualClientes - 1) * clientesPorPagina;
    const fin = inicio + clientesPorPagina;
    const clientesPagina = clientesFiltrados.slice(inicio, fin);

    if (clientesPagina.length === 0) {
        lista.innerHTML = `
            <div class="col-12">
                <div class="alert alert-light border text-center py-4">
                    <strong>No se encontraron clientes.</strong><br>
                    Intenta con otro nombre, cédula, teléfono o email.
                </div>
            </div>
        `;
        return;
    }

    clientesPagina.forEach(client => {
        renderClientCard(client);
    });
}

/* =========================================================
   RENDER DE UNA TARJETA DE CLIENTE
   ========================================================= */
function renderClientCard(client) {
    const lista = document.getElementById("listaClientes");

    const card = document.createElement("div");
    card.className = "col-md-6 col-lg-4";

    card.innerHTML = `
        <div class="card h-100 shadow-sm">
            <div class="card-body d-flex flex-column">
                <div class="d-flex align-items-start mb-3">
                    <div class="flex-shrink-0 me-3">
                        <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px; font-size: 1.2rem; font-weight: bold;">
                            ${client.nombre ? client.nombre.charAt(0).toUpperCase() : "?"}
                        </div>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="card-title mb-1 fw-bold">${client.nombre || "Sin nombre"}</h6>
                        <p class="card-text small text-muted mb-1">
                            <i class="bi bi-envelope"></i> ${client.email || "Sin email"}
                        </p>
                        <p class="card-text small text-muted mb-1">
                            <i class="bi bi-telephone"></i> ${client.telefono || "Sin teléfono"}
                        </p>
                        <p class="card-text small text-muted mb-1">
                            <i class="bi bi-card-text"></i> ${client.cedula || "Sin cédula"}
                        </p>
                        <p class="card-text small text-muted mb-1">
                            <i class="bi bi-geo-alt"></i> ${client.direccion || "Sin dirección"}
                        </p>
                    </div>
                </div>

                <div class="mt-auto">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge ${client.estado === 'Activo' ? 'bg-success' : 'bg-secondary'}">
                            ${client.estado || "Sin estado"}
                        </span>
                    </div>

                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary btn-sm flex-fill" onclick="editarCliente(${client.client_id})">
                            <i class="bi bi-pencil"></i> Editar
                        </button>
                        <button class="btn btn-outline-danger btn-sm flex-fill" onclick="confirmarEliminacionCliente(${client.client_id})">
                            <i class="bi bi-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    lista.appendChild(card);
}

/* =========================================================
   PAGINACIÓN
   ========================================================= */
function renderPaginacionClientes() {
    const contenedor = document.getElementById("paginacionClientes");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const totalPaginas = Math.ceil(clientesFiltrados.length / clientesPorPagina);

    if (totalPaginas <= 1) return;

    const btnAnterior = document.createElement("button");
    btnAnterior.textContent = "Anterior";
    btnAnterior.className = "btn btn-outline-primary";
    btnAnterior.disabled = paginaActualClientes === 1;

    btnAnterior.onclick = () => {
        if (paginaActualClientes > 1) {
            paginaActualClientes--;
            renderPaginaClientes();
            renderPaginacionClientes();
        }
    };

    contenedor.appendChild(btnAnterior);

    for (let i = 1; i <= totalPaginas; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.className = `btn ${i === paginaActualClientes ? "btn-primary" : "btn-outline-primary"}`;

        btn.onclick = () => {
            paginaActualClientes = i;
            renderPaginaClientes();
            renderPaginacionClientes();
        };

        contenedor.appendChild(btn);
    }

    const btnSiguiente = document.createElement("button");
    btnSiguiente.textContent = "Siguiente";
    btnSiguiente.className = "btn btn-outline-primary";
    btnSiguiente.disabled = paginaActualClientes === totalPaginas;

    btnSiguiente.onclick = () => {
        if (paginaActualClientes < totalPaginas) {
            paginaActualClientes++;
            renderPaginaClientes();
            renderPaginacionClientes();
        }
    };

    contenedor.appendChild(btnSiguiente);
}

/* =========================================================
   CREAR CLIENTE
   ========================================================= */
async function crearCliente(client) {
    const res = await fetch(`${API_URL_CLIENTS}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(client)
    });

    if (!res.ok) {
        throw new Error("No se pudo crear el cliente");
    }

    return await res.json();
}

/* =========================================================
   ACTUALIZAR CLIENTE
   ========================================================= */
async function actualizarCliente(id, client) {
    const res = await fetch(`${API_URL_CLIENTS}/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(client)
    });

    if (!res.ok) {
        throw new Error("No se pudo actualizar el cliente");
    }

    return await res.json();
}

/* =========================================================
   ELIMINAR CLIENTE
   ========================================================= */
async function eliminarCliente(id) {
    const res = await fetch(`${API_URL_CLIENTS}/${id}`, {
        method: "DELETE"
    });

    if (!res.ok) {
        throw new Error("No se pudo eliminar el cliente");
    }

    return await res.json();
}

/* =========================================================
   CONFIRMAR ELIMINACIÓN
   ========================================================= */
async function confirmarEliminacionCliente(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar a este cliente?")) return;

    try {
        await eliminarCliente(id);
        await cargarClientes();
        alert("✅ Cliente eliminado correctamente");
    } catch (error) {
        console.error(error);
        alert("❌ Error al eliminar");
    }
}

/* =========================================================
   EDITAR CLIENTE
   ========================================================= */
async function editarCliente(id) {
    try {
        const res = await fetch(`${API_URL_CLIENTS}/${id}`);
        if (!res.ok) {
            throw new Error("No se pudo obtener el cliente");
        }

        const c = await res.json();

        editandoClienteId = id;

        document.getElementById("nombreCliente").value = c.nombre || "";
        document.getElementById("telefonoCliente").value = c.telefono || "";
        document.getElementById("emailCliente").value = c.email || "";
        document.getElementById("cedulaCliente").value = c.cedula || "";
        document.getElementById("direccionCliente").value = c.direccion || "";
        document.getElementById("estadoCliente").value = c.estado || "";

        const tituloModal = document.querySelector(".modal-card h5");
        if (tituloModal) {
            tituloModal.textContent = "Editar Cliente";
        }

        const btnSubmit = document.querySelector("#formCliente button[type='submit']");
        if (btnSubmit) {
            btnSubmit.textContent = "Actualizar";
        }

        const modal = document.querySelector(".modal-overlay");
        if (modal) modal.style.display = "block";

    } catch (error) {
        console.error(error);
        alert("❌ No se pudo cargar el cliente para editar");
    }
}

/* =========================================================
   LIMPIAR MODO EDICIÓN
   ========================================================= */
function limpiarModoEdicionCliente() {
    editandoClienteId = null;
}

/* =========================================================
   INICIALIZAR MODALES PARA CLIENTES
   ========================================================= */
function initClientModals() {
    const modal = document.querySelector(".modal-overlay");
    const openBtn = document.querySelector(".btn-open-modal");
    const closeBtn = document.querySelector(".btn-close-modal");
    const form = document.getElementById("formCliente");

    if (openBtn && modal) {
        openBtn.onclick = () => {
            modal.style.display = "flex";
            resetClientForm();
            limpiarModoEdicionCliente();
            const tituloModal = document.querySelector(".modal-card h5");
            if (tituloModal) {
                tituloModal.textContent = "Nuevo Perfil de Cliente";
            }
            const btnSubmit = document.querySelector("#formCliente button[type='submit']");
            if (btnSubmit) {
                btnSubmit.textContent = "Guardar";
            }
        };
    }

    if (closeBtn && modal) {
        closeBtn.onclick = () => {
            modal.style.display = "none";
            resetClientForm();
            limpiarModoEdicionCliente();
            const btnSubmit = document.querySelector("#formCliente button[type='submit']");
            if (btnSubmit) {
                btnSubmit.textContent = "Guardar";
            }
        };
    }

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            const clientData = {
                nombre: document.getElementById("nombreCliente").value,
                telefono: document.getElementById("telefonoCliente").value,
                email: document.getElementById("emailCliente").value,
                cedula: document.getElementById("cedulaCliente").value,
                direccion: document.getElementById("direccionCliente").value,
                estado: document.getElementById("estadoCliente").value
            };

            try {
                if (editandoClienteId) {
                    await actualizarCliente(editandoClienteId, clientData);
                    alert("✅ Cliente actualizado correctamente");
                } else {
                    await crearCliente(clientData);
                    alert("✅ Cliente creado correctamente");
                }

                modal.style.display = "none";
                resetClientForm();
                limpiarModoEdicionCliente();
                await cargarClientes();

            } catch (error) {
                console.error(error);
                alert("❌ Error al guardar el cliente");
            }
        };
    }

    // Cerrar modal al hacer clic fuera
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = "none";
                resetClientForm();
                limpiarModoEdicionCliente();
                const btnSubmit = document.querySelector("#formCliente button[type='submit']");
                if (btnSubmit) {
                    btnSubmit.textContent = "Guardar";
                }
            }
        };
    }
}

/* =========================================================
   RESET FORMULARIO CLIENTE
   ========================================================= */
function resetClientForm() {
    const form = document.getElementById("formCliente");
    if (form) {
        form.reset();
    }
}