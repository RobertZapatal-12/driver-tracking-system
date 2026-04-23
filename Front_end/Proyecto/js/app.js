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
    
    // Inicializar Configuración del Dropdown
    setTimeout(initSettingsDropdown, 500);
});

/* =========================================================
   CONFIGURA EL SETTINGS DROPDOWN (TUERCA)
   ========================================================= */
function initSettingsDropdown() {
    // Modo Oscuro
    const toggleDarkMode = document.getElementById("toggleDarkMode");
    if (toggleDarkMode) {
        toggleDarkMode.checked = localStorage.getItem("tf_dark_mode") === "true";
        if (toggleDarkMode.checked) document.body.classList.add("dark-mode");
        
        toggleDarkMode.addEventListener("change", (e) => {
            const isDark = e.target.checked;
            localStorage.setItem("tf_dark_mode", isDark);
            if (isDark) {
                document.body.classList.add("dark-mode");
            } else {
                document.body.classList.remove("dark-mode");
            }
        });
    } else {
        // Applica el local storage si el dropdown no está visible en el momento
        const isDark = localStorage.getItem("tf_dark_mode") === "true";
        if (isDark) document.body.classList.add("dark-mode");
    }

    // Estilo Mapa
    const mapStyleSelector = document.getElementById("mapStyleSelector");
    if (mapStyleSelector) {
        const savedStyle = localStorage.getItem("tf_map_style") || "voyager";
        mapStyleSelector.value = savedStyle;
        
        mapStyleSelector.addEventListener("change", (e) => {
            const style = e.target.value;
            localStorage.setItem("tf_map_style", style);
            actualizarEstiloMapaGeneral(style);
        });
    }

    // Auto Refresh
    const toggleAutoRefresh = document.getElementById("toggleAutoRefresh");
    if (toggleAutoRefresh) {
        toggleAutoRefresh.checked = localStorage.getItem("tf_auto_refresh") !== "false"; // Default true
        toggleAutoRefresh.addEventListener("change", (e) => {
            localStorage.setItem("tf_auto_refresh", e.target.checked);
            if(e.target.checked && window.location.hash === "#mapa" || document.getElementById("map")) {
                iniciarPollingMapa();
            } else {
                detenerPollingMapa();
            }
        });
    }

    // Sonidos
    const toggleSounds = document.getElementById("toggleSounds");
    if (toggleSounds) {
        toggleSounds.checked = localStorage.getItem("tf_sounds") !== "false"; // Default true
        toggleSounds.addEventListener("change", (e) => {
            localStorage.setItem("tf_sounds", e.target.checked);
        });
    }
}

function playNotificationSound() {
    if (localStorage.getItem("tf_sounds") !== "false") {
        // Simple Web Audio API beep for demonstration if no mp3 is found
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.value = 520;
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
        } catch(e) { console.log("Sound disabled or not supported", e); }
    }
}

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

            if (pagina === "dashboard") {
                if (typeof actualizarDashboardVehiculos === "function") {
                    actualizarDashboardVehiculos();
                }
                if (typeof actualizarDashboardServicios === "function") {
                    actualizarDashboardServicios();
                }
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

            if (pagina === "solicitudes") {
                const scriptExistente = document.querySelector('script[src="js/solicitudes.js"]');

                if (scriptExistente) {
                    if (typeof initSolicitudes === "function") {
                        initSolicitudes();
                    }
                } else {
                    const script = document.createElement("script");
                    script.src = "js/solicitudes.js";
                    script.onload = () => {
                        if (typeof initSolicitudes === "function") {
                            initSolicitudes();
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
            const emailVal    = document.getElementById("emailC")?.value.trim() || "";
            const passwordVal = document.getElementById("passwordC")?.value.trim() || "";

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
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random&shape=square`,
                // Credenciales de acceso a la app móvil (solo admin)
                email:    emailVal    || null,
                password: passwordVal || null,
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
                const msg = error.message || "No se pudo guardar. Revisa que el servidor esté encendido.";
                Toast.error(msg);
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

    // Badge de acceso a la app móvil
    const tieneAcceso = d.email_usuario;
    const appBadge = tieneAcceso
        ? `<span class="badge ms-2" style="background:#dcfce7;color:#166534;font-size:0.7rem;"><i class="bi bi-phone-fill me-1"></i>${d.email_usuario}</span>`
        : `<span class="badge ms-2" style="background:#fee2e2;color:#991b1b;font-size:0.7rem;"><i class="bi bi-phone me-1"></i>Sin acceso a la App</span>`;

    card.innerHTML = `
        <div class="driver-actions-container">
            <button class="btn-tuerca" onclick="event.stopPropagation(); toggleMenu(this)"><i class="bi bi-gear"></i></button>
            <div class="dropdown-menu-custom">
                <button onclick="editarDriver(${d.driver_id})">✏️ Editar</button>
                <button class="text-danger" onclick="confirmarEliminacion(${d.driver_id})">🗑️ Eliminar</button>
            </div>
        </div>

        <div class="driver-header">
            <div class="driver-avatar-square" onclick="event.stopPropagation(); verImagenConductor('${d.imagen || "https://via.placeholder.com/150"}')"> 
                <img src="${d.imagen || "https://via.placeholder.com/150"}" alt="${d.nombre}" style="cursor: pointer;">
            </div>

            <div class="driver-main-info">
                <div class="info-item">
                    <span class="label">Nombre</span>
                    <span class="value">${d.nombre} ${appBadge}</span>
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

    // Limpiar campos de acceso app
    const emailEl    = document.getElementById("emailC");
    const passwordEl = document.getElementById("passwordC");
    if (emailEl)    emailEl.value    = "";
    if (passwordEl) passwordEl.value = "";

    // Ocultar badges de acceso
    document.getElementById("driver-access-status")?.classList.add("d-none");
    document.getElementById("access-badge-ok")?.classList.add("d-none");
    document.getElementById("access-badge-no")?.classList.add("d-none");

    window.driverAppData.foto = "";
}

/* =========================================================
   ICONO PERSONALIZADO DE CARRO
   ========================================================= */
const carIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/2555/2555013.png", // Icono de camión profesional
    iconSize: [45, 45],
    iconAnchor: [22, 22],
    popupAnchor: [0, -20]
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

    let layerUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const mapStyle = localStorage.getItem("tf_map_style");
    if(mapStyle === "dark") {
        layerUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    } else if(mapStyle === "satellite") {
        layerUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    }

    L.tileLayer(layerUrl, {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 20
    }).addTo(mapaGlobal);

    cargarTodosLosConductores();
}

function actualizarEstiloMapaGeneral(style) {
    if (!mapaGlobal) return;
    
    // Remove all tile layers
    mapaGlobal.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
            mapaGlobal.removeLayer(layer);
        }
    });

    let layerUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    if(style === "dark") {
        layerUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    } else if(style === "satellite") {
        layerUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    }

    L.tileLayer(layerUrl, {
        attribution: "© OpenStreetMap",
        maxZoom: 20
    }).addTo(mapaGlobal);
}

/* =========================================================
   POLLING DEL MAPA (solo cuando está visible)
   ========================================================= */
function iniciarPollingMapa() {
    detenerPollingMapa();

    const autoRef = localStorage.getItem("tf_auto_refresh") !== "false";
    if (!autoRef) return; // Salir si el toggle está apagado

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

        if (codigo === "") {
            Toast.warning("Introduce un ID de conductor o Código de servicio.");
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
        // Usamos el endpoint inteligente que soporta ID numérico y Hexagonal
        const response = await CONFIG.fetchAuth(`/locations/track/${driverIdSeleccionado}?isAdmin=true`);

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            Toast.warning(data.error);
            return;
        }

        mostrarChofer(data);
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
let originMarkerGlobal = null;
let destinationMarkerGlobal = null;
let routingControlGlobal = null;

function mostrarChofer(data) {
    if (!mapaGlobal) {
        console.error("Mapa no inicializado.");
        return;
    }

    // Limpiar capas previas de ruteo
    if (routingControlGlobal) {
        try { mapaGlobal.removeControl(routingControlGlobal); } catch(e){}
        routingControlGlobal = null;
    }
    if (originMarkerGlobal) { mapaGlobal.removeLayer(originMarkerGlobal); originMarkerGlobal = null; }
    if (destinationMarkerGlobal) { mapaGlobal.removeLayer(destinationMarkerGlobal); destinationMarkerGlobal = null; }

    // El backend puede devolver {conductor: {...}} o el objeto directo
    const c = data.conductor || data;
    const lat = c.lat || c.latitud;
    const lng = c.lng || c.longitud;

    if (!lat || !lng) {
        Toast.warning("Este conductor no tiene GPS activo.");
        return;
    }

    if (marcadorChofer) {
        mapaGlobal.removeLayer(marcadorChofer);
    }

    mapaGlobal.flyTo([lat, lng], 15);

    marcadorChofer = L.marker([lat, lng], { icon: carIcon }).addTo(mapaGlobal)
        .bindPopup(`
            <div style="font-family: 'Inter', sans-serif;">
                <b style="color: var(--accent-primary);">${c.nombre}</b><br>
                <small class="text-muted">Estado: ${data.estado || 'Activo'}</small>
            </div>
        `)
        .openPopup();

    // Trazar ruta dinámica según fase del servicio
    if (data.origen && data.origen.lat && data.destino && data.destino.lat) {
        
        let targetPoint = null;
        let routeColor = '#3b82f6'; // Azul por defecto

        if (data.sub_estado === "buscando_cliente") {
            // Fase 1: Ir a buscar al cliente
            targetPoint = L.latLng(data.origen.lat, data.origen.lng);
            routeColor = '#3b82f6'; 

            // Marcador Origen (Punto Azul)
            originMarkerGlobal = L.circleMarker([data.origen.lat, data.origen.lng], {
                radius: 10, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 3
            }).addTo(mapaGlobal).bindPopup(`<b>Origen:</b> ${data.origen.nombre}<br><span class="badge bg-primary">Recogida Pendiente</span>`);
            
            // Destino se muestra tenue
            destinationMarkerGlobal = L.circleMarker([data.destino.lat, data.destino.lng], {
                radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3
            }).addTo(mapaGlobal).bindPopup(`<b>Destino Final:</b> ${data.destino.nombre}`);

        } else if (data.sub_estado === "con_cliente") {
            // Fase 2: Ya tiene al cliente, ir al destino
            targetPoint = L.latLng(data.destino.lat, data.destino.lng);
            routeColor = '#10b981'; // Verde (Con cliente)

            // Marcador Destino (Punto Rojo)
            destinationMarkerGlobal = L.circleMarker([data.destino.lat, data.destino.lng], {
                radius: 10, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9, weight: 3
            }).addTo(mapaGlobal).bindPopup(`<b>Destino:</b> ${data.destino.nombre}<br><span class="badge bg-success">En camino</span>`);
        }

        if (targetPoint) {
            console.log("Trazando ruta a:", targetPoint);
            routingControlGlobal = L.Routing.control({
                waypoints: [
                    L.latLng(lat, lng),
                    targetPoint
                ],
                router: L.Routing.osrmv1({
                    serviceUrl: `https://router.project-osrm.org/route/v1`
                }),
                lineOptions: { 
                    styles: [{ color: routeColor, opacity: 0.8, weight: 8 }],
                    extendToWaypoints: true,
                    missingRouteTolerance: 10
                },
                show: false,
                addWaypoints: false,
                draggableWaypoints: false,
                createMarker: () => null
            }).on('routingerror', function(e) {
                console.error("Error de ruteo:", e);
                // Fallback: Línea recta si falla OSRM
                L.polyline([L.latLng(lat, lng), targetPoint], {color: routeColor, weight: 5, dashArray: '10, 10'}).addTo(mapaGlobal);
            }).addTo(mapaGlobal);
        }
    }

    // Actualizar Panel de Información Flotante
    const infoPanel = document.getElementById("map-info-panel");
    const driverName = document.getElementById("map-driver-name");
    const driverMeta = document.getElementById("map-driver-meta");
    const driverImg = document.getElementById("map-driver-img");
    const driverStatus = document.getElementById("map-driver-status");

    if (infoPanel && driverName) {
        infoPanel.style.display = "flex";
        driverName.textContent = c.nombre;
        driverMeta.textContent = `Código: ${data.codigo || '—'} • Velocidad: ${c.velocidad || '0'} km/h`;
        
        if (driverImg) {
            driverImg.src = c.imagen || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.nombre)}&background=3b82f6&color=fff&bold=true`;
        }

        if (driverStatus) {
            driverStatus.textContent = data.estado === "completada" ? "Completado" : "En Ruta";
            driverStatus.style.background = data.estado === "completada" ? "#dcfce7" : "#e0f2fe";
            driverStatus.style.color = data.estado === "completada" ? "#15803d" : "#0369a1";
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

/* =========================================================
   ACTUALIZAR DASHBOARD SERVICIOS
   ========================================================= */
async function actualizarDashboardServicios() {
    try {
        const tbody = document.getElementById("dashboard-recent-services");
        if (!tbody) return;
        
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Cargando servicios recientes...</td></tr>`;
        
        const res = await CONFIG.fetchAuth("/request/");
        if (!res.ok) throw new Error("Error fetching requests");
        
        let requests = await res.json();
        
        // Ordenar más recientes primero
        requests.sort((a,b) => b.request_id - a.request_id);
        
        // Seleccionar los últimos 5 según solicitud del usuario
        requests = requests.slice(0, 5);
        
        if (requests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No hay servicios solicitados recientemente.</td></tr>`;
            return;
        }
        
        tbody.innerHTML = "";
        
        requests.forEach(req => {
            const clienteName = req.cliente || "Sin cliente";
            const initial = clienteName.charAt(0).toUpperCase();
            
            let badgeClass = "bg-secondary text-white";
            let estadoFormat = req.estado || "Desconocido";
            
            if (req.estado === "pendiente") { badgeClass = "bg-warning text-dark"; estadoFormat = "Pendiente"; }
            else if (req.estado === "en_proceso") { badgeClass = "bg-primary-light text-primary"; estadoFormat = "En Proceso"; }
            else if (req.estado === "completada") { badgeClass = "bg-success-light text-success"; estadoFormat = "Completada"; }
            
            const driverName = req.driver_nombre || "Sin Asignar";
            
            // Format date
            let fechaStr = req.fecha || "---";
            if (fechaStr !== "---") {
                const dateObj = new Date(fechaStr);
                if (!isNaN(dateObj)) {
                    fechaStr = dateObj.toLocaleDateString();
                }
            }
            
            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";
            tr.onclick = () => cargarPagina("solicitudes");
            
            tr.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm me-2 bg-light rounded-circle text-center fw-bold" style="width: 32px; height: 32px; line-height: 32px; color: #1e293b;">${initial}</div>
                        <span class="fw-semibold text-dark mode-fluid">${clienteName}</span>
                    </div>
                </td>
                <td><span class="small fw-medium text-dark mode-fluid">${req.origen || '-'} <i class="bi bi-arrow-right text-muted mx-1"></i> ${req.destino || '-'}</span></td>
                <td class="fw-medium text-dark mode-fluid">${driverName}</td>
                <td><span class="badge ${badgeClass} border border-opacity-10">${estadoFormat}</span></td>
                <td class="fw-bold text-muted">${fechaStr}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error("Error cargando servicios para el dashboard:", error);
        const tbody = document.getElementById("dashboard-recent-services");
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error cargando servicios.</td></tr>`;
    }
}

/* =========================================================
   VISOR DE IMÁGENES (FULLSCREEN)
   ========================================================= */
window.verImagenConductor = function(src) {
    let viewer = document.getElementById("imageViewer");
    if (!viewer) {
        viewer = document.createElement("div");
        viewer.id = "imageViewer";
        viewer.className = "image-viewer-overlay";
        viewer.onclick = () => viewer.classList.remove("active");
        viewer.innerHTML = `<img src="" class="image-viewer-content" id="imageViewerImg">`;
        document.body.appendChild(viewer);
    }
    
    document.getElementById("imageViewerImg").src = src;
    viewer.classList.add("active");
};