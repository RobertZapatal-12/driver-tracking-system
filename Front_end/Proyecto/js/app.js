/* =========================================================
   ESTADO GLOBAL DE LA APP
   ========================================================= */
window.driverAppData = { foto: "" };

/* =========================================================
   MAPA - VARIABLES GLOBALES
   ========================================================= */
let mapaGlobal = null;
let marcadorChofer = null;
let marcadoresConductores = {};
let mapPollingInterval = null;

/* =========================================================
   VERIFICACIÓN DE AUTENTICACIÓN
   ========================================================= */
function checkAuthentication() {
    const token = localStorage.getItem("authToken");
    if (!token) {
        // No hay token, redirigir a login
        window.location.href = "login.html";
        return false;
    }
    return true;
}

/* =========================================================
   CARGAR DATOS DEL USUARIO
   ========================================================= */
function loadUserData() {
    const userStr = localStorage.getItem("user");
    if (userStr) {
        const user = JSON.parse(userStr);
        const userSpan = document.querySelector(".user-profile span");
        if (userSpan) {
            userSpan.textContent = user.name || "Usuario";
        }
    }
}

/* =========================================================
   CERRAR SESIÓN
   ========================================================= */
function logoutUser() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

/* =========================================================
   INICIO DE LA APLICACIÓN
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    // Verificar autenticación antes de cargar nada
    if (!checkAuthentication()) {
        return;
    }

    // Cargar datos del usuario
    loadUserData();
    
    fetch("components/sidebar.html")
        .then(res => res.text())
        .then(data => {
            document.getElementById("sidebar").innerHTML = data;
            setActiveLink("dashboard");
        })
        .catch(error => {
            console.error("Error cargando sidebar:", error);
        });

    cargarPagina("dashboard");
});

/* =========================================================
   NAVEGACIÓN DINÁMICA ENTRE PÁGINAS
   ========================================================= */
function cargarPagina(pagina) {
    const contenedor = document.getElementById("contenido");
    const titulo = document.getElementById("page-title");

    // Detener polling del mapa al cambiar de página
    detenerPollingMapa();

    fetch(`pages/${pagina}.html`)
        .then(res => res.text())
        .then(data => {
            // First remove animation class
            contenedor.classList.remove("page-enter");
            // Force reflow
            void contenedor.offsetWidth;
            
            contenedor.innerHTML = data;
            
            const pTitle = pagina.charAt(0).toUpperCase() + pagina.slice(1);
            if(titulo) titulo.innerText = pTitle;

            const breadcrumbCurrent = document.getElementById("breadcrumb-current");
            if(breadcrumbCurrent) breadcrumbCurrent.innerText = pTitle;

            // Add animation class
            contenedor.classList.add("page-enter");

            setActiveLink(pagina);
            initModals();

            if (pagina === "dashboard" && typeof actualizarDashboardVehiculos === "function") {
                actualizarDashboardVehiculos();
            }

            if (pagina === "conductores" && typeof cargarConductores === "function") {
                cargarConductores();
            }

            if (pagina === "vehiculos" && typeof initVehiculosModule === "function") {
                initVehiculosModule();
            }

            if (pagina === "clientes") {
                const scriptExistente = document.querySelector('script[src="js/clients.js"]');

                if (scriptExistente) {
                    if (typeof cargarClientes === "function") {
                        cargarClientes();
                    }
                    if (typeof initClientModals === "function") {
                        initClientModals();
                    }
                } else {
                    const script = document.createElement("script");
                    script.src = "js/clients.js";
                    script.onload = () => {
                        if (typeof cargarClientes === "function") {
                            cargarClientes();
                        }
                        if (typeof initClientModals === "function") {
                            initClientModals();
                        }
                    };
                    document.head.appendChild(script);
                }
            }
            
            if (pagina === "rutas" && typeof cargarRutas === "function") {
                cargarRutas();
            }

            if (pagina === "mapa") {
                setTimeout(() => {
                    initMapa();
                    iniciarPollingMapa();
                }, 100);
            }
        })
        .catch(error => {
            console.error("Error cargando la página:", error);
            contenedor.innerHTML = `
                <div class="alert alert-danger">
                    Error cargando la página.
                </div>
            `;
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
   ========================================================= */
function initModals() {
    const modal = document.querySelector(".modal-overlay");
    const openBtn = document.querySelector(".btn-open-modal");
    const closeBtn = document.querySelector(".btn-close-modal");
    const form = document.getElementById("formConductor");
    const inputFoto = document.getElementById("fotoC");

    if (openBtn && modal) {
    openBtn.onclick = () => {
        modal.style.display = "flex";
        resetDriverForm();
        limpiarModoEdicionDriver();

        const tituloModal = document.getElementById("tituloModalConductor");
        if (tituloModal) {
            tituloModal.textContent = "Nuevo Perfil de Conductor";
        }

        const btnGuardar = document.getElementById("btnGuardarConductor");
        if (btnGuardar) {
            btnGuardar.textContent = "Guardar";
        }

        const modalCard = document.querySelector(".modal-card");
        if (modalCard) {
            modalCard.classList.remove("modo-edicion");
            modalCard.classList.add("modo-crear");
        }
    };
}

    if (closeBtn && modal) {
    closeBtn.onclick = () => {
        modal.style.display = "none";
        resetDriverForm();
        limpiarModoEdicionDriver();

        const tituloModal = document.getElementById("tituloModalConductor");
        if (tituloModal) {
            tituloModal.textContent = "Nuevo Perfil de Conductor";
        }

        const btnGuardar = document.getElementById("btnGuardarConductor");
        if (btnGuardar) {
            btnGuardar.textContent = "Guardar";
        }

        const modalCard = document.querySelector(".modal-card");
        if (modalCard) {
            modalCard.classList.remove("modo-edicion");
            modalCard.classList.add("modo-crear");
        }
    };
}

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
                imagen:
                    window.driverAppData.foto ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random&shape=square`
            };

            try {
                if (typeof editandoDriverId !== "undefined" && editandoDriverId !== null) {
                    await actualizarDriver(editandoDriverId, data);
                    Toast.success("Conductor actualizado correctamente");
                } else {
                    await crearDriver(data);
                    Toast.success("Conductor creado correctamente");
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
                Toast.error("No se pudo guardar. Revisa que el servidor esté encendido.");
            }
        };
    }
}

/* =========================================================
   RENDER DE TARJETAS DE CONDUCTORES
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
   ========================================================= */
function resetDriverForm() {
    const form = document.getElementById("formConductor");
    if (form) form.reset();

    const preview = document.getElementById("imgPreview");
    if (preview) {
        preview.src = "https://via.placeholder.com/150?text=Subir+Foto";
    }

    const modalCard = document.querySelector(".modal-card");
    if (modalCard) {
        modalCard.classList.remove("modo-edicion");
        modalCard.classList.add("modo-crear");
    }

    const tituloModal = document.getElementById("tituloModalConductor");
    if (tituloModal) {
        tituloModal.textContent = "Nuevo Perfil de Conductor";
    }

    const btnGuardar = document.getElementById("btnGuardarConductor");
    if (btnGuardar) {
        btnGuardar.textContent = "Guardar";
        btnGuardar.classList.remove("btn-warning");
        btnGuardar.classList.add("btn-primary");
    }

    window.driverAppData.foto = "";
}

/* =========================================================
   ICONO PERSONALIZADO DE CARRO
   ========================================================= */
const carIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/743/743922.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -35]
});

/* =========================================================
   INICIALIZAR MAPA
   ========================================================= */
/* =========================================================
   INICIALIZAR MAPA
   ========================================================= */
function initMapa() {
    const mapElement = document.getElementById("map");
    if (!mapElement) return;

    if (typeof L === "undefined") {
        console.error("Leaflet no está cargado.");
        return;
    }

    if (mapaGlobal) {
        mapaGlobal.remove();
        mapaGlobal = null;
        marcadoresConductores = {};
        marcadorChofer = null;
    }

    // Definir los límites de República Dominicana (SW, NE)
    const boundsDR = L.latLngBounds(
        L.latLng(17.47, -72.0), // Suroeste
        L.latLng(19.95, -68.32) // Noreste
    );

    // Inicializar mapa con restricciones
    mapaGlobal = L.map("map", {
        center: [18.4861, -69.9312],
        zoom: 13,
        minZoom: 8,
        maxBounds: boundsDR,
        maxBoundsViscosity: 1.0,  // "Efecto rebote" al salir de los límites
        zoomControl: false        // Quitamos controles nativos para usar los nuestros
    });

    // Cambiar a CartoDB Voyager (Muestra POIs, tiendas y centros comerciales con detalle)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO",
        subdomains: "abcd",
        maxZoom: 20
    }).addTo(mapaGlobal);

    cargarTodosLosConductores();
}

/* =========================================================
   POLLING DEL MAPA (solo cuando está visible)
   ========================================================= */
function iniciarPollingMapa() {
    detenerPollingMapa();

    mapPollingInterval = setInterval(() => {
        const input = document.getElementById("codigoViaje");
        if (!mapaGlobal) return;

        const valor = input ? input.value.trim() : "";

        if (valor !== "" && !isNaN(valor)) {
            actualizarChoferSeleccionado();
        } else {
            cargarTodosLosConductores();
        }
    }, 3000);
}

function detenerPollingMapa() {
    if (mapPollingInterval) {
        clearInterval(mapPollingInterval);
        mapPollingInterval = null;
    }
}

/* =========================================================
   CARGAR TODOS LOS CONDUCTORES EN EL MAPA
   ========================================================= */
async function cargarTodosLosConductores() {
    try {
        const response = await CONFIG.fetchAuth("/locations/latest");

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            return;
        }

        data.forEach(d => {
            const lat = d.latitud;
            const lng = d.longitud;

            if (marcadoresConductores[d.driver_id]) {
                marcadoresConductores[d.driver_id].setLatLng([lat, lng]);
                marcadoresConductores[d.driver_id].setPopupContent(`
                    <b>${d.nombre}</b><br>
                    Driver ID: ${d.driver_id}<br>
                    Latitud: ${lat}<br>
                    Longitud: ${lng}<br>
                    Velocidad: ${d.velocidad}
                `);
            } else {
                const marker = L.marker([lat, lng], { icon: carIcon }).addTo(mapaGlobal)
                    .bindPopup(`
                        <b>${d.nombre}</b><br>
                        Driver ID: ${d.driver_id}<br>
                        Latitud: ${lat}<br>
                        Longitud: ${lng}<br>
                        Velocidad: ${d.velocidad}
                    `);

                marcadoresConductores[d.driver_id] = marker;
            }
        });
    } catch (error) {
        console.error("Error cargando todos los conductores:", error);
    }
}

/* =========================================================
   BUSCAR UBICACIÓN REAL DESDE EL BACKEND
   ========================================================= */
let driverIdSeleccionado = null;

async function buscarUbicacion() {
    try {
        const codigo = document.getElementById("codigoViaje").value.trim();

        if (codigo === "" || isNaN(codigo)) {
            Toast.warning("Introduce un driver_id válido. Ej: 6");
            return;
        }

        driverIdSeleccionado = codigo;
        await actualizarChoferSeleccionado();
    } catch (error) {
        console.error("Error cargando ubicación:", error);
        Toast.error("Error cargando la ubicación del conductor.");
    }
}

async function actualizarChoferSeleccionado() {
    if (!driverIdSeleccionado) return;

    try {
        const response = await CONFIG.fetchAuth("/locations/latest");

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            return;
        }

        const chofer = data.find(d => String(d.driver_id) === String(driverIdSeleccionado));

        if (!chofer) {
            Toast.warning("No se encontró ese conductor en las ubicaciones activas.");
            return;
        }

        mostrarChofer(chofer);
    } catch (error) {
        console.error("Error actualizando chofer seleccionado:", error);
    }
}

/* =========================================================
   MOSTRAR CHOFER EN EL MAPA
   ========================================================= */
/* =========================================================
   MOSTRAR CHOFER EN EL MAPA
   ========================================================= */
function mostrarChofer(data) {
    if (!mapaGlobal) {
        console.error("Mapa no inicializado.");
        return;
    }

    const lat = data.latitud;
    const lng = data.longitud;

    if (marcadorChofer) {
        mapaGlobal.removeLayer(marcadorChofer);
    }

    mapaGlobal.flyTo([lat, lng], 16);

    marcadorChofer = L.marker([lat, lng], { icon: carIcon }).addTo(mapaGlobal)
        .bindPopup(`
            <div style="font-family: 'Inter', sans-serif;">
                <b style="color: var(--accent-primary);">${data.nombre}</b><br>
                <small class="text-muted">ID Conductor: ${data.driver_id}</small>
            </div>
        `)
        .openPopup();

    // Actualizar Panel de Información Flotante
    const infoPanel = document.getElementById("map-info-panel");
    const driverName = document.getElementById("map-driver-name");
    const driverMeta = document.getElementById("map-driver-meta");
    const driverImg = document.getElementById("map-driver-img");
    const driverStatus = document.getElementById("map-driver-status");

    if (infoPanel && driverName) {
        infoPanel.style.display = "block";
        driverName.textContent = data.nombre;
        driverMeta.textContent = `ID: ${data.driver_id} • Velocidad: ${data.velocidad || '0'} km/h • Lat: ${lat.toFixed(4)}`;
        
        // Imagen del conductor o inicial si no hay imagen
        if (driverImg) {
            driverImg.src = data.imagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre)}&background=3b82f6&color=fff&bold=true`;
        }

        // Estilo del badge
        if (driverStatus) {
            driverStatus.textContent = "Activo en Mapa";
            driverStatus.style.background = "#dcfce7";
            driverStatus.style.color = "#15803d";
        }
    }
}

/* =========================================================
   MENÚ DE ACCIONES DE CADA CARD
   ========================================================= */
function toggleMenu(boton) {
    const menu = boton.nextElementSibling;
    const yaEstaAbierto = menu.classList.contains("show");

    document.querySelectorAll(".dropdown-menu-custom").forEach(m => {
        m.classList.remove("show");
    });

    if (!yaEstaAbierto) {
        menu.classList.add("show");
    }
}

document.addEventListener("click", function (e) {
    if (!e.target.closest(".driver-actions-container")) {
        document.querySelectorAll(".dropdown-menu-custom").forEach(m => {
            m.classList.remove("show");
        });
    }
});