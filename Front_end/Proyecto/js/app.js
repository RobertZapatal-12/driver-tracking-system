/* =========================================================
   ESTADO GLOBAL DE LA APP
   ========================================================= */
window.driverAppData = { foto: "" };


/* =========================================================
   INICIO DE LA APLICACIÓN
   - Carga el sidebar
   - Marca dashboard como activo
   - Carga la página inicial
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    fetch("components/sidebar.html")
        .then(res => res.text())
        .then(data => {
            document.getElementById("sidebar").innerHTML = data;
            setActiveLink("dashboard");
        });

    cargarPagina("dashboard");
});


/* =========================================================
   NAVEGACIÓN DINÁMICA ENTRE PÁGINAS
   - Inserta el HTML dentro de #contenido
   - Actualiza el título
   - Inicializa modales
   - Si entra a conductores, carga los datos desde la API
   - Si entra a mapa, inicializa Leaflet
   ========================================================= */
function cargarPagina(pagina) {
    const contenedor = document.getElementById("contenido");
    const titulo = document.getElementById("page-title");

    fetch(`pages/${pagina}.html`)
        .then(res => res.text())
        .then(data => {
            contenedor.innerHTML = data;
            titulo.innerText = pagina.charAt(0).toUpperCase() + pagina.slice(1);

            setActiveLink(pagina);
            initModals();

            if (pagina === "conductores" && typeof cargarConductores === "function") {
                cargarConductores();
            }

            if (pagina === "mapa") {
                setTimeout(initMapa, 100);
            }
        });
}


/* =========================================================
   SIDEBAR - LINK ACTIVO
   ========================================================= */
function setActiveLink(pagina) {
    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");

        if (link.getAttribute("onclick")?.includes(pagina)) {
            link.classList.add("active");
        }
    });
}


/* =========================================================
   INICIALIZACIÓN DE MODALES
   - Modal de conductores
   - Imagen del conductor
   - Formulario de conductor (crear / editar)
   - Formulario de vehículo
   ========================================================= */
function initModals() {
    const modal = document.querySelector(".modal-overlay");
    const openBtn = document.querySelector(".btn-open-modal");
    const closeBtn = document.querySelector(".btn-close-modal");
    const form = document.getElementById("formConductor");
    const inputFoto = document.getElementById("fotoC");

    /* -----------------------------------------------------
       ABRIR MODAL
       ----------------------------------------------------- */
    if (openBtn && modal) {
        openBtn.onclick = () => {
            modal.style.display = "flex";
        };
    }

    /* -----------------------------------------------------
       CERRAR MODAL
       - Limpia formulario
       - Limpia estado de edición
       ----------------------------------------------------- */
    if (closeBtn && modal) {
        closeBtn.onclick = () => {
            modal.style.display = "none";
            resetDriverForm();

            if (typeof limpiarModoEdicion === "function") {
                limpiarModoEdicion();
            }
        };
    }

    /* -----------------------------------------------------
       CARGA DE IMAGEN DEL CONDUCTOR
       - Lee la foto seleccionada y la previsualiza
       ----------------------------------------------------- */
    if (inputFoto) {
        inputFoto.onchange = (e) => {
            const file = e.target.files[0];

            if (file) {
                const reader = new FileReader();

                reader.onload = (ev) => {
                    const preview = document.getElementById("imgPreview");
                    if (preview) {
                        preview.src = ev.target.result;
                    }

                    window.driverAppData.foto = ev.target.result;
                };

                reader.readAsDataURL(file);
            }
        };
    }

    /* -----------------------------------------------------
       FORMULARIO DE VEHÍCULO
       - Inserta una fila en la tabla localmente
       ----------------------------------------------------- */
    const formVehiculo = document.getElementById("formVehiculo");

    if (formVehiculo) {
        formVehiculo.onsubmit = (e) => {
            e.preventDefault();

            const placa = document.getElementById("placa").value;
            const modelo = document.getElementById("modelo").value;
            const marca = document.getElementById("marca").value;
            const color = document.getElementById("color").value;
            const anio = document.getElementById("anio").value;
            const estado = document.getElementById("estado").value;

            let badgeClass = "";
            if (estado === "Libre") {
                badgeClass = "bg-success";
            } else if (estado === "En Ruta") {
                badgeClass = "bg-primary";
            } else if (estado === "Mantenimiento") {
                badgeClass = "bg-danger";
            } else {
                badgeClass = "bg-secondary";
            }

            const tabla = document.getElementById("tablaVehiculos")?.getElementsByTagName("tbody")[0];
            if (!tabla) return;

            const nuevaFila = tabla.insertRow();

            nuevaFila.innerHTML = `
                <td>${placa}</td>
                <td>${modelo}</td>
                <td>${marca}</td>
                <td>${color}</td>
                <td>${anio}</td>
                <td><span class="badge ${badgeClass}">${estado}</span></td>
            `;

            if (modal) {
                modal.style.display = "none";
            }

            formVehiculo.reset();
        };
    }

    /* -----------------------------------------------------
       FORMULARIO DE CONDUCTOR
       - Si hay editandoDriverId: actualiza
       - Si no hay editandoDriverId: crea
       - Luego recarga la lista desde la API
       ----------------------------------------------------- */
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            const nombre = document.getElementById("nombreC").value;

            const data = {
                nombre: nombre,
                telefono: document.getElementById("telefonoC").value,
                cedula: document.getElementById("cedulaC").value,
                numero_licencia: document.getElementById("numLicenciaC").value,
                tipo_licencia: document.getElementById("tipoLicenciaC").value,
                estado: document.getElementById("estadoC").value,
                descripcion: document.getElementById("descripcionC").value || "Sin información.",
                imagen: window.driverAppData.foto ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random&shape=square`
            };

            try {
                if (typeof editandoDriverId !== "undefined" && editandoDriverId !== null) {
                    await actualizarDriver(editandoDriverId, data);
                    alert("✅ Conductor actualizado");
                } else {
                    await crearDriver(data);
                    alert("✅ Conductor creado");
                }

                if (typeof cargarConductores === "function") {
                    await cargarConductores();
                }

                if (modal) {
                    modal.style.display = "none";
                }

                resetDriverForm();

                if (typeof limpiarModoEdicion === "function") {
                    limpiarModoEdicion();
                }

            } catch (error) {
                console.error("Error al conectar con la API:", error);
                alert("❌ No se pudo guardar. Revisa que el servidor esté encendido.");
            }
        };
    }
}


/* =========================================================
   RENDER DE TARJETAS DE CONDUCTORES
   - Crea la card
   - Muestra menú de acciones
   - Permite expandir detalles
   ========================================================= */
function renderDriverCard(d) {
    const contenedor = document.getElementById("listaConductores");
    if (!contenedor) return;

    const card = document.createElement("div");
    card.className = "driver-row";

    card.onclick = function (e) {
        if (!e.target.closest(".driver-actions")) {
            seleccionarSoloUno(this);
        }
    };

    const statusClass = d.estado === "Activo" ? "bg-status-activo" : "bg-status-inactivo";

    card.innerHTML = `
        <div class="driver-actions-container">
            <button class="btn-tuerca" onclick="event.stopPropagation(); toggleMenu(this)">⚙️</button>
            <div class="dropdown-menu-custom">
                <button onclick="editarDriver(${d.driver_id})">✏️ Editar</button>
                <button class="text-danger" onclick="confirmarEliminacion(${d.driver_id})">🗑️ Eliminar</button>
            </div>
        </div>

        <div class="driver-header">
            <div class="driver-avatar-square">
                <img src="${d.imagen || "https://via.placeholder.com/150"}" alt="${d.nombre}">
            </div>

            <div class="driver-main-info">
                <div class="info-item">
                    <span class="label">Nombre</span>
                    <span class="value">${d.nombre}</span>
                </div>

                <div class="info-item">
                    <span class="label">Teléfono</span>
                    <span class="value">${d.telefono}</span>
                </div>

                <div class="info-item extra-data">
                    <span class="label">Cédula</span>
                    <span class="value">${d.cedula}</span>
                </div>

                <div class="info-item extra-data">
                    <span class="label">Licencia</span>
                    <span class="value">${d.numero_licencia} (${d.tipo_licencia})</span>
                </div>
            </div>
        </div>

        <div class="driver-details">
            <div class="bio-box">
                <span class="label">Información del Conductor</span>
                <p class="mb-0 mt-2">${d.descripcion || "Sin información."}</p>
            </div>

            <div class="status-box ${statusClass}">
                <span class="status-label">Estado</span>
                <span class="status-value">${d.estado}</span>
            </div>
        </div>
    `;

    contenedor.prepend(card);
}


/* =========================================================
   EXPANSIÓN DE TARJETAS
   - Solo una tarjeta expandida a la vez
   ========================================================= */
function seleccionarSoloUno(elemento) {
    const todos = document.querySelectorAll(".driver-row");

    todos.forEach(item => {
        if (item !== elemento && item.classList.contains("expanded")) {
            item.classList.remove("expanded");
        }
    });

    elemento.classList.toggle("expanded");
}


/* =========================================================
   RESETEAR FORMULARIO DE CONDUCTOR
   - Limpia campos
   - Limpia preview
   - Limpia foto guardada en memoria
   ========================================================= */
function resetDriverForm() {
    const form = document.getElementById("formConductor");
    if (form) form.reset();

    const preview = document.getElementById("imgPreview");
    if (preview) {
        preview.src = "https://via.placeholder.com/150?text=Subir+Foto";
    }

    window.driverAppData.foto = "";
}


/* =========================================================
   MAPA - VARIABLES GLOBALES
   ========================================================= */
var mapaGlobal;
var marcadorChofer;


/* =========================================================
   INICIALIZAR MAPA
   - Centrado en Santo Domingo
   ========================================================= */
function initMapa() {
    if (document.getElementById("map")) {
        mapaGlobal = L.map("map").setView([18.4861, -69.9312], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap"
        }).addTo(mapaGlobal);
    }
}


/* =========================================================
   BUSCAR UBICACIÓN SIMULADA DE UN VIAJE
   ========================================================= */
function buscarUbicacion() {
    const codigo = document.getElementById("codigoViaje").value.toUpperCase();

    const rutasSimuladas = {
        "TR-809": { lat: 18.4735, lng: -69.9389, nombre: "Juan Pérez", info: "Cerca de la Av. Churchill" },
        "SD-001": { lat: 18.5001, lng: -69.8555, nombre: "Pedro Alcántara", info: "Cruzando el Puente Flotante" },
        "ST-777": { lat: 19.4517, lng: -70.6970, nombre: "Marcos Díaz", info: "Santiago, cerca del Monumento" }
    };

    if (rutasSimuladas[codigo]) {
        const data = rutasSimuladas[codigo];

        if (marcadorChofer) {
            mapaGlobal.removeLayer(marcadorChofer);
        }

        mapaGlobal.flyTo([data.lat, data.lng], 16);

        marcadorChofer = L.marker([data.lat, data.lng]).addTo(mapaGlobal)
            .bindPopup(`<b>Chofer:</b> ${data.nombre}<br><b>Estado:</b> ${data.info}`)
            .openPopup();
    } else {
        alert("Código de viaje no encontrado. Prueba con TR-809");
    }
}


/* =========================================================
   MENÚ DE ACCIONES DE CADA CARD
   - Abre/cierra el dropdown de la tuerca
   ========================================================= */
function toggleMenu(boton) {
    document.querySelectorAll(".dropdown-menu-custom").forEach(m => m.classList.remove("show"));

    const menu = boton.nextElementSibling;
    menu.classList.toggle("show");

    document.addEventListener("click", function closeMenu(e) {
        if (!boton.contains(e.target)) {
            menu.classList.remove("show");
            document.removeEventListener("click", closeMenu);
        }
    });
}