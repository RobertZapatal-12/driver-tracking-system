let vehiculosData = [
    {
        id: 1,
        marca: "Toyota",
        modelo: "Corolla",
        capacidad: 4,
        conductor: "Juan Pérez",
        estado: "Disponible",
        placa: "A123BC",
        tipo: "Sedan",
        imagenes: [
            "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80"
        ]
    },
    {
        id: 2,
        marca: "Hyundai",
        modelo: "Staria",
        capacidad: 10,
        conductor: "María Gómez",
        estado: "En ruta",
        placa: "B456DE",
        tipo: "Minibus",
        imagenes: [
            "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80"
        ]
    },
    {
        id: 3,
        marca: "Chevrolet",
        modelo: "Suburban",
        capacidad: 7,
        conductor: "Carlos Ramírez",
        estado: "Mantenimiento",
        placa: "C789FG",
        tipo: "SUV",
        imagenes: [
            "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80"
        ]
    },
    {
        id: 4,
        marca: "Kia",
        modelo: "Carnival",
        capacidad: 8,
        conductor: "Ana López",
        estado: "Disponible",
        placa: "D321HI",
        tipo: "Camioneta",
        imagenes: [
            "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80"
        ]
    }
];

let vehiculoSeleccionado = null;
let imagenActualIndex = 0;
let vehiculoPendienteEliminar = null;

function initVehiculosModule() {
    renderVehiculos(vehiculosData);
    initPanelFiltrosVehiculos();
    initModalDetalleVehiculo();
    initModalFormularioVehiculo();
    actualizarDashboardVehiculos();
}

let vistaFlotaActual = 'grid';

window.cambiarVistaFlota = function(vista) {
    vistaFlotaActual = vista;
    aplicarFiltrosVehiculos();
};

function renderVehiculos(lista) {
    const contenedorBase = document.getElementById("contenedorVehiculos");
    if (!contenedorBase) return;

    contenedorBase.innerHTML = "";

    if (!lista || lista.length === 0) {
        contenedorBase.innerHTML = `
            <div class="col-12 mt-4 text-center">
                <div class="alert alert-light border py-4">
                    <strong>No se encontraron vehículos.</strong><br>
                    Ajusta los filtros o agrega nuevas unidades.
                </div>
            </div>
        `;
        return;
    }

    if (vistaFlotaActual === 'grid') {
        const rowGrid = document.createElement("div");
        rowGrid.className = "row g-4";

        lista.forEach((vehiculo) => {
            const wrap = document.createElement("div");
            wrap.className = "col-12 col-md-6 col-lg-4 col-xl-3";

            const card = document.createElement("article");
            card.className = "card h-100 border-0 rounded-4 shadow-sm vehiculo-card";
            card.setAttribute("tabindex", "0");
            card.dataset.id = vehiculo.id;

            card.innerHTML = `
                <div class="vehiculo-card-media">
                    <img src="${vehiculo.imagenes[0]}" alt="${vehiculo.marca} ${vehiculo.modelo}" class="vehiculo-card-img">
                </div>
                <div class="vehiculo-card-body">
                    <h4 class="vehiculo-card-titulo">${vehiculo.marca} ${vehiculo.modelo}</h4>
                    <p class="vehiculo-card-capacidad">Capacidad: ${vehiculo.capacidad} personas</p>
                </div>
                <div class="vehiculo-card-estado ${obtenerClaseEstadoCard(vehiculo.estado)}">
                    ${vehiculo.estado}
                </div>
            `;

            card.addEventListener("click", () => abrirDetalleVehiculo(vehiculo.id));
            card.addEventListener("keypress", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    abrirDetalleVehiculo(vehiculo.id);
                }
            });

            wrap.appendChild(card);
            rowGrid.appendChild(wrap);
        });

        contenedorBase.appendChild(rowGrid);

    } else {
        // Table View
        const divWrapper = document.createElement("div");
        divWrapper.className = "glass-panel p-4";

        const tableResponsive = document.createElement("div");
        tableResponsive.className = "table-responsive";

        const table = document.createElement("table");
        table.className = "table table-hover align-middle mb-0";

        table.innerHTML = `
            <thead class="text-muted small">
                <tr>
                    <th>VEHÍCULO</th>
                    <th>PLACA</th>
                    <th>TIPO / CAPACIDAD</th>
                    <th>CONDUCTOR ASIGNADO</th>
                    <th>ESTADO</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector("tbody");

        lista.forEach((vehiculo) => {
            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";
            
            let colorClase = "";
            let bgClase = "";
            if (vehiculo.estado === "Disponible") {
                colorClase = "text-success"; bgClase = "bg-success-light";
            } else if (vehiculo.estado === "En ruta") {
                colorClase = "text-primary"; bgClase = "bg-primary-light";
            } else {
                colorClase = "text-danger"; bgClase = "bg-danger-light";
            }

            tr.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${vehiculo.imagenes[0]}" class="rounded-3 me-3" style="width: 50px; height: 50px; object-fit: cover;">
                        <span class="fw-bold text-reset">${vehiculo.marca} ${vehiculo.modelo}</span>
                    </div>
                </td>
                <td class="text-reset"><strong>${vehiculo.placa}</strong></td>
                <td class="text-muted">${vehiculo.tipo} • ${vehiculo.capacidad} Pers.</td>
                <td class="text-reset">${vehiculo.conductor || '<span class="text-muted fst-italic">Sin asignar</span>'}</td>
                <td><span class="badge ${bgClase} ${colorClase}" style="background: var(--bg-surface); border: 1px solid currentColor;">${vehiculo.estado}</span></td>
            `;

            tr.addEventListener("click", () => abrirDetalleVehiculo(vehiculo.id));
            tbody.appendChild(tr);
        });

        tableResponsive.appendChild(table);
        divWrapper.appendChild(tableResponsive);
        contenedorBase.appendChild(divWrapper);
    }
}

function obtenerClaseEstadoCard(estado) {
    if (estado === "Disponible") return "estado-disponible";
    if (estado === "En ruta") return "estado-en-ruta";
    if (estado === "Mantenimiento") return "estado-mantenimiento";
    return "";
}

function obtenerClaseEstadoTexto(estado) {
    if (estado === "Disponible") return "texto-estado-disponible";
    if (estado === "En ruta") return "texto-estado-en-ruta";
    if (estado === "Mantenimiento") return "texto-estado-mantenimiento";
    return "";
}

/* =========================================================
   PANEL DE FILTROS
   ========================================================= */

function initPanelFiltrosVehiculos() {
    const btnToggleFiltros = document.getElementById("btnToggleFiltrosVehiculos");
    const btnCerrarFiltros = document.getElementById("btnCerrarFiltrosVehiculos");
    const panelFiltros = document.getElementById("vehiculosFiltros");
    const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltrosVehiculos");

    if (btnToggleFiltros && panelFiltros) {
        btnToggleFiltros.addEventListener("click", () => {
            panelFiltros.classList.toggle("activo");
        });
    }

    if (btnCerrarFiltros && panelFiltros) {
        btnCerrarFiltros.addEventListener("click", () => {
            panelFiltros.classList.remove("activo");
        });
    }

    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener("click", () => {
            document.querySelectorAll("#vehiculosFiltros input[type='checkbox']").forEach((check) => {
                check.checked = false;
            });
            aplicarFiltrosVehiculos();
        });
    }

    document.querySelectorAll("#vehiculosFiltros input[type='checkbox']").forEach((check) => {
        check.addEventListener("change", aplicarFiltrosVehiculos);
    });
}

function aplicarFiltrosVehiculos() {
    const estados = Array.from(document.querySelectorAll("input[name='estadoVehiculo']:checked")).map(i => i.value);
    const tipos = Array.from(document.querySelectorAll("input[name='tipoVehiculo']:checked")).map(i => i.value);
    const capacidades = Array.from(document.querySelectorAll("input[name='capacidadVehiculo']:checked")).map(i => i.value);
    const marcas = Array.from(document.querySelectorAll("input[name='marcaVehiculo']:checked")).map(i => i.value);
    const conductores = Array.from(document.querySelectorAll("input[name='conductorVehiculo']:checked")).map(i => i.value);

    const filtrados = vehiculosData.filter((vehiculo) => {
        const coincideEstado = estados.length === 0 || estados.includes(vehiculo.estado);
        const coincideTipo = tipos.length === 0 || tipos.includes(vehiculo.tipo);
        const coincideMarca = marcas.length === 0 || marcas.includes(vehiculo.marca);

        const coincideCapacidad = capacidades.length === 0 || capacidades.some((rango) => {
            if (rango === "1-4") return vehiculo.capacidad >= 1 && vehiculo.capacidad <= 4;
            if (rango === "5-10") return vehiculo.capacidad >= 5 && vehiculo.capacidad <= 10;
            if (rango === "10-40") return vehiculo.capacidad >= 10 && vehiculo.capacidad <= 40;
            return false;
        });

        const coincideConductor = conductores.length === 0 || conductores.some((valor) => {
            if (valor === "Asignado") return vehiculo.conductor && vehiculo.conductor.trim() !== "";
            if (valor === "Sin asignar") return !vehiculo.conductor || vehiculo.conductor.trim() === "";
            return false;
        });

        return coincideEstado && coincideTipo && coincideCapacidad && coincideMarca && coincideConductor;
    });

    renderVehiculos(filtrados);
}

/* =========================================================
   MODAL DETALLE VEHÍCULO
   ========================================================= */

function initModalDetalleVehiculo() {
    const modalDetalle = document.getElementById("modalDetalleVehiculo");
    const btnCerrarDetalle = document.getElementById("btnCerrarDetalleVehiculo");
    const btnMenuVehiculo = document.getElementById("btnMenuVehiculo");
    const menuOpciones = document.getElementById("menuVehiculoOpciones");
    const btnLeft = document.querySelector(".vehiculo-galeria-arrow-left");
    const btnRight = document.querySelector(".vehiculo-galeria-arrow-right");

    if (btnCerrarDetalle && modalDetalle) {
        btnCerrarDetalle.addEventListener("click", () => {
            modalDetalle.style.display = "none";
            cerrarMenuVehiculo();
        });
    }

    if (modalDetalle) {
        modalDetalle.addEventListener("click", (e) => {
            if (e.target === modalDetalle) {
                modalDetalle.style.display = "none";
                cerrarMenuVehiculo();
            }
        });
    }

    if (btnMenuVehiculo && menuOpciones) {
        btnMenuVehiculo.addEventListener("click", (e) => {
            e.stopPropagation();
            menuOpciones.classList.toggle("activo");
        });

        document.addEventListener("click", (e) => {
            if (!menuOpciones.contains(e.target) && e.target !== btnMenuVehiculo) {
                cerrarMenuVehiculo();
            }
        });
    }

    if (btnRight) {
        btnRight.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!vehiculoSeleccionado) return;

            imagenActualIndex++;
            if (imagenActualIndex >= vehiculoSeleccionado.imagenes.length) {
                imagenActualIndex = 0;
            }

            actualizarGaleriaVehiculo();
        });
    }

    if (btnLeft) {
        btnLeft.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!vehiculoSeleccionado) return;

            imagenActualIndex--;
            if (imagenActualIndex < 0) {
                imagenActualIndex = vehiculoSeleccionado.imagenes.length - 1;
            }

            actualizarGaleriaVehiculo();
        });
    }

    const botonesMenu = document.querySelectorAll("#menuVehiculoOpciones button");
    if (botonesMenu.length >= 2) {
        botonesMenu[0].addEventListener("click", () => {
            cerrarMenuVehiculo();
            abrirFormularioVehiculoEdicion();
        });

        botonesMenu[1].addEventListener("click", () => {
            cerrarMenuVehiculo();

            if (!vehiculoSeleccionado) return;

            vehiculoPendienteEliminar = vehiculoSeleccionado;
            abrirConfirmacionEliminarVehiculo();
        });
    }
}

function cerrarMenuVehiculo() {
    const menuOpciones = document.getElementById("menuVehiculoOpciones");
    if (menuOpciones) {
        menuOpciones.classList.remove("activo");
    }
}

function abrirDetalleVehiculo(id) {
    const modalDetalle = document.getElementById("modalDetalleVehiculo");
    const vehiculo = vehiculosData.find(v => v.id === id);

    if (!modalDetalle || !vehiculo) return;

    vehiculoSeleccionado = vehiculo;
    imagenActualIndex = 0;

    const titulo = document.getElementById("vehiculoDetalleTitulo");
    if (titulo) {
        titulo.textContent = `${vehiculo.marca} ${vehiculo.modelo}`;
    }

    const datos = document.querySelector(".vehiculo-detalle-datos");
    if (datos) {
        datos.innerHTML = `
            <div class="vehiculo-dato-item">
                <span class="vehiculo-dato-label">Capacidad</span>
                <strong>${vehiculo.capacidad} personas</strong>
            </div>

            <div class="vehiculo-dato-item">
                <span class="vehiculo-dato-label">Conductor asignado</span>
                <strong>${vehiculo.conductor || "Sin asignar"}</strong>
            </div>

            <div class="vehiculo-dato-item">
                <span class="vehiculo-dato-label">Estado</span>
                <strong class="${obtenerClaseEstadoTexto(vehiculo.estado)}">${vehiculo.estado}</strong>
            </div>

            <div class="vehiculo-dato-item">
                <span class="vehiculo-dato-label">Placa</span>
                <strong>${vehiculo.placa}</strong>
            </div>
        `;
    }

    actualizarGaleriaVehiculo();
    modalDetalle.style.display = "flex";
}

function actualizarGaleriaVehiculo() {
    if (!vehiculoSeleccionado) return;

    const imagenPrincipal = document.getElementById("vehiculoImagenPrincipal");
    const miniaturasContenedor = document.querySelector(".vehiculo-detalle-miniaturas");

    if (imagenPrincipal) {
        imagenPrincipal.src = vehiculoSeleccionado.imagenes[imagenActualIndex];
    }

    if (miniaturasContenedor) {
        miniaturasContenedor.innerHTML = "";

        vehiculoSeleccionado.imagenes.forEach((src, index) => {
            const btn = document.createElement("button");
            btn.className = `vehiculo-miniatura ${index === imagenActualIndex ? "activa" : ""}`;
            btn.type = "button";

            btn.innerHTML = `
                <img src="${src}" alt="Miniatura ${index + 1}">
            `;

            btn.addEventListener("click", () => {
                imagenActualIndex = index;
                actualizarGaleriaVehiculo();
            });

            miniaturasContenedor.appendChild(btn);
        });
    }
}

/* =========================================================
   MODAL FORMULARIO VEHÍCULO
   ========================================================= */

function initModalFormularioVehiculo() {
    const btnNuevoVehiculo = document.querySelector(".btn-open-modal-vehiculo");
    const modalFormulario = document.getElementById("modalFormularioVehiculo");
    const btnCancelar = document.getElementById("btnCancelarVehiculo");
    const btnCerrarFormulario = document.getElementById("btnCerrarFormularioVehiculo");
    const form = document.getElementById("formVehiculoNuevo");

    if (btnNuevoVehiculo && modalFormulario) {
        btnNuevoVehiculo.addEventListener("click", () => {
            modalFormulario.style.display = "flex";
            prepararFormularioVehiculoCrear();
        });
    }

    if (btnCancelar && modalFormulario) {
        btnCancelar.addEventListener("click", () => {
            modalFormulario.style.display = "none";
            if (form) form.reset();
        });
    }

    if (btnCerrarFormulario && modalFormulario) {
        btnCerrarFormulario.addEventListener("click", () => {
            modalFormulario.style.display = "none";
            if (form) form.reset();
        });
    }

    if (modalFormulario) {
        modalFormulario.addEventListener("click", (e) => {
            if (e.target === modalFormulario) {
                modalFormulario.style.display = "none";
                if (form) form.reset();
            }
        });
    }

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const marcaInput = document.getElementById("marcaVehiculo");
            const modeloInput = document.getElementById("modeloVehiculo");
            const tipoInput = document.getElementById("tipoVehiculoFormulario");
            const capacidadInput = document.getElementById("capacidadVehiculo");
            const placaInput = document.getElementById("placaVehiculo");
            const estadoInput = document.getElementById("estadoVehiculoFormulario");
            const conductorInput = document.getElementById("conductorVehiculo");
            const imagenInput = document.getElementById("imagenPrincipalVehiculo");

            const marca = marcaInput ? marcaInput.value.trim() : "";
            const modelo = modeloInput ? modeloInput.value.trim() : "";
            const tipo = tipoInput ? tipoInput.value : "";
            const capacidad = capacidadInput ? parseInt(capacidadInput.value) : 0;
            const placa = placaInput ? placaInput.value.trim() : "";
            const estado = estadoInput ? estadoInput.value : "Disponible";
            const conductor = conductorInput ? conductorInput.value.trim() : "";

            if (!marca || !modelo || !tipo || !capacidad || !placa) {
                Toast.warning("Completa los campos obligatorios del vehículo.");
                return;
            }

            let imagenPrincipal = "https://via.placeholder.com/800x500?text=Vehiculo";

            if (imagenInput && imagenInput.files && imagenInput.files[0]) {
                imagenPrincipal = URL.createObjectURL(imagenInput.files[0]);
            }

            if (vehiculoSeleccionado && document.getElementById("tituloModalVehiculo")?.textContent.includes("Editar")) {
                vehiculoSeleccionado.marca = marca;
                vehiculoSeleccionado.modelo = modelo;
                vehiculoSeleccionado.tipo = tipo;
                vehiculoSeleccionado.capacidad = capacidad;
                vehiculoSeleccionado.placa = placa;
                vehiculoSeleccionado.estado = estado;
                vehiculoSeleccionado.conductor = conductor;

                if (imagenInput && imagenInput.files && imagenInput.files[0]) {
                    vehiculoSeleccionado.imagenes[0] = imagenPrincipal;
                }

                Toast.success("Vehículo actualizado correctamente.");
            } else {
                const nuevoVehiculo = {
                    id: Date.now(),
                    marca,
                    modelo,
                    tipo,
                    capacidad,
                    conductor,
                    estado,
                    placa,
                    imagenes: [
                        imagenPrincipal,
                        imagenPrincipal,
                        imagenPrincipal,
                        imagenPrincipal,
                        imagenPrincipal
                    ]
                };

                vehiculosData.unshift(nuevoVehiculo);
                Toast.success("Vehículo agregado correctamente.");
            }

            renderVehiculos(vehiculosData);
            aplicarFiltrosVehiculos();
            actualizarDashboardVehiculos();

            modalFormulario.style.display = "none";
            form.reset();
        });
    }
}

function prepararFormularioVehiculoCrear() {
    const titulo = document.getElementById("tituloModalVehiculo");
    const btnGuardar = document.getElementById("btnGuardarVehiculo");
    const modalCard = document.querySelector(".modal-card-vehiculo-form");
    const form = document.getElementById("formVehiculoNuevo");

    if (titulo) titulo.textContent = "Nuevo Vehículo";
    if (btnGuardar) btnGuardar.textContent = "Guardar";

    if (modalCard) {
        modalCard.classList.remove("modo-edicion");
        modalCard.classList.add("modo-crear");
    }

    if (form) {
        form.reset();
    }

    const tipoInput = document.getElementById("tipoVehiculoFormulario");
    if (tipoInput) {
        tipoInput.value = "";
    }
}

function abrirFormularioVehiculoEdicion() {
    const modalFormulario = document.getElementById("modalFormularioVehiculo");
    const titulo = document.getElementById("tituloModalVehiculo");
    const btnGuardar = document.getElementById("btnGuardarVehiculo");
    const modalCard = document.querySelector(".modal-card-vehiculo-form");

    if (!vehiculoSeleccionado || !modalFormulario) return;

    if (titulo) titulo.textContent = "Editar Vehículo";
    if (btnGuardar) btnGuardar.textContent = "Actualizar";

    if (modalCard) {
        modalCard.classList.remove("modo-crear");
        modalCard.classList.add("modo-edicion");
    }

    const marcaInput = document.getElementById("marcaVehiculo");
    const modeloInput = document.getElementById("modeloVehiculo");
    const tipoInput = document.getElementById("tipoVehiculoFormulario");
    const capacidadInput = document.getElementById("capacidadVehiculo");
    const placaInput = document.getElementById("placaVehiculo");
    const estadoInput = document.getElementById("estadoVehiculoFormulario");
    const conductorInput = document.getElementById("conductorVehiculo");

    if (marcaInput) marcaInput.value = vehiculoSeleccionado.marca || "";
    if (modeloInput) modeloInput.value = vehiculoSeleccionado.modelo || "";
    if (tipoInput) tipoInput.value = vehiculoSeleccionado.tipo || "";
    if (capacidadInput) capacidadInput.value = vehiculoSeleccionado.capacidad || "";
    if (placaInput) placaInput.value = vehiculoSeleccionado.placa || "";
    if (estadoInput) estadoInput.value = vehiculoSeleccionado.estado || "Disponible";
    if (conductorInput) conductorInput.value = vehiculoSeleccionado.conductor || "";

    modalFormulario.style.display = "flex";
}

function actualizarDashboardVehiculos() {
    const total = vehiculosData.length;
    const disponibles = vehiculosData.filter(v => v.estado === "Disponible").length;
    const enRuta = vehiculosData.filter(v => v.estado === "En ruta").length;
    const mantenimiento = vehiculosData.filter(v => v.estado === "Mantenimiento").length;

    const totalEl = document.getElementById("dashboardTotalVehiculos");
    const disponiblesEl = document.getElementById("dashboardVehiculosDisponibles");
    const enRutaEl = document.getElementById("dashboardVehiculosEnRuta");
    const mantenimientoEl = document.getElementById("dashboardVehiculosMantenimiento");

    if (totalEl) totalEl.textContent = total;
    if (disponiblesEl) disponiblesEl.textContent = disponibles;
    if (enRutaEl) enRutaEl.textContent = enRuta;
    if (mantenimientoEl) mantenimientoEl.textContent = mantenimiento;
}

/* =========================================================
   TOAST (usa sistema global)
   ========================================================= */
function mostrarToastVehiculo(mensaje, tipo = "info") {
    if (typeof Toast !== "undefined") {
        Toast.show(mensaje, tipo);
    }
}

/* =========================================================
   CONFIRMACIÓN ELIMINAR (usa Toast.confirm global)
   ========================================================= */
async function abrirConfirmacionEliminarVehiculo() {
    if (!vehiculoPendienteEliminar) return;

    const confirmado = await Toast.confirm(
        `¿Estás seguro de que deseas eliminar el vehículo ${vehiculoPendienteEliminar.marca} ${vehiculoPendienteEliminar.modelo}? Esta acción no se puede deshacer.`
    );

    if (!confirmado) {
        vehiculoPendienteEliminar = null;
        return;
    }

    vehiculosData = vehiculosData.filter(v => v.id !== vehiculoPendienteEliminar.id);

    const modalDetalle = document.getElementById("modalDetalleVehiculo");
    if (modalDetalle) {
        modalDetalle.style.display = "none";
    }

    vehiculoSeleccionado = null;
    vehiculoPendienteEliminar = null;
    imagenActualIndex = 0;

    renderVehiculos(vehiculosData);
    aplicarFiltrosVehiculos();
    actualizarDashboardVehiculos();
    Toast.success("Vehículo eliminado correctamente.");
}