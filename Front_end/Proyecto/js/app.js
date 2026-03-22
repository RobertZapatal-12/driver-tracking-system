window.driverAppData = { foto: "" };

document.addEventListener("DOMContentLoaded", () => {
    // Cargar Sidebar
    fetch("components/sidebar.html")
        .then(res => res.text())
        .then(data => {
            document.getElementById("sidebar").innerHTML = data;
            setActiveLink('dashboard');
        });

    cargarPagina('dashboard');
});

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

            if (pagina === 'conductores' && typeof cargarConductores === 'function') {
                cargarConductores();
            }

            if (pagina === 'mapa') {
                setTimeout(initMapa, 100);
            }
        });
}

function setActiveLink(pagina) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if(link.getAttribute('onclick')?.includes(pagina)) {
            link.classList.add('active');
        }
    });
}

// Manejador Genérico de Modales
function initModals() {
    const modal = document.querySelector(".modal-overlay");
    const openBtn = document.querySelector(".btn-open-modal");
    const closeBtn = document.querySelector(".btn-close-modal");
    const form = document.getElementById("formConductor");
    const inputFoto = document.getElementById("fotoC");

    if (openBtn) openBtn.onclick = () => modal.style.display = "flex";
    if (closeBtn) closeBtn.onclick = () => { modal.style.display = "none"; resetDriverForm(); };

    // Manejo de Imagen (FileReader)
    if (inputFoto) {
        inputFoto.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    document.getElementById("imgPreview").src = ev.target.result;
                    window.driverAppData.foto = ev.target.result;
                };
                reader.readAsDataURL(file);
            }
        };
    }


    if (openBtn && modal) {
        openBtn.onclick = () => modal.style.display = "block";
        closeBtn.onclick = () => modal.style.display = "none";
    }

    // Lógica para Guardar Vehículo
const formVehiculo = document.getElementById("formVehiculo");
if (formVehiculo) {
    formVehiculo.onsubmit = (e) => {
        e.preventDefault();
        
        // 1. Capturar los valores del formulario
        const placa = document.getElementById("placa").value;
        const modelo = document.getElementById("modelo").value;
        const marca = document.getElementById("marca").value;
        const color = document.getElementById("color").value;
        const anio = document.getElementById("anio").value;
        const estado = document.getElementById("estado").value;
        
        // 2. Determinar la clase de color de Bootstrap según el estado
        let badgeClass = "";
        if (estado === "Libre") {
            badgeClass = "bg-success"; // Verde
        } else if (estado === "En Ruta") {
            badgeClass = "bg-primary"; // Azul
        } else if (estado === "Mantenimiento") {
            badgeClass = "bg-danger";  // Rojo
        } else {
            badgeClass = "bg-secondary"; // Gris por defecto
        }

        // 3. Seleccionar la tabla e insertar la fila
        const tabla = document.getElementById("tablaVehiculos").getElementsByTagName('tbody')[0];
        const nuevaFila = tabla.insertRow();
        
        nuevaFila.innerHTML = `
            <td>${placa}</td>
            <td>${modelo}</td>
            <td>${marca}</td>
            <td>${color}</td>
            <td>${anio}</td>
            <td><span class="badge ${badgeClass}">${estado}</span></td>
        `;
        
        // 4. Cerrar el modal y limpiar el formulario
        const modal = document.querySelector(".modal-overlay");
        if (modal) modal.style.display = "none";
        formVehiculo.reset();
    };
}
    // Lógica para Guardar Conductor
    if (form) {
        form.onsubmit = async (e) => { // 1. Agregamos async aquí
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
                imagen: window.driverAppData.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random&shape=square`
            };

            try {
               await crearDriver(data); 
            // Quitamos renderDriverCard(data) de aquí porque crearDriver ya recarga la lista
            modal.style.display = "none";
            resetDriverForm();
            alert("✅ Guardado y actualizado");
        } catch (error) {
                // 4. Si la API falla, el código salta aquí y NO ejecuta las líneas de arriba
                console.error("Error al conectar con la API:", error);
                alert("❌ No se pudo guardar. Revisa que el servidor esté encendido.");
            }
        };
    }
}
// 3. Renderizado de la Ficha
function renderDriverCard(d) {
    const contenedor = document.getElementById("listaConductores");
    if (!contenedor) return;

    const card = document.createElement("div");
    card.className = "driver-row";
    card.onclick = function(e) {
        // Evita expandir si se hace clic en los botones de acción
        if (!e.target.closest('.driver-actions')) seleccionarSoloUno(this);
    };

    const statusClass = d.estado === "Activo" ? "bg-status-activo" : "bg-status-inactivo";

    card.innerHTML = `
        <div class="driver-actions-container">
        <button class="btn-tuerca" onclick="event.stopPropagation(); toggleMenu(this)">⚙️</button>
        <div class="dropdown-menu-custom">
            <button onclick="prepararEdicion(${d.driver_id})">✏️ Editar</button>
            <button class="text-danger" onclick="confirmarEliminacion(${d.driver_id})">🗑️ Eliminar</button>
        </div>
    </div>
    <div class="driver-header">
            <div class="driver-avatar-square">
                <img src="${d.imagen || 'https://via.placeholder.com/150'}" alt="${d.nombre}">
            </div>
            <div class="driver-main-info">
                <div class="info-item"><span class="label">Nombre</span><span class="value">${d.nombre}</span></div>
                <div class="info-item"><span class="label">Teléfono</span><span class="value">${d.telefono}</span></div>
                <div class="info-item extra-data"><span class="label">Cédula</span><span class="value">${d.cedula}</span></div>
                <div class="info-item extra-data"><span class="label">Licencia</span><span class="value">${d.numero_licencia} (${d.tipo_licencia})</span></div>
            </div>
        </div>
        <div class="driver-details">
            <div class="bio-box">
                <span class="label">Información del Conductor</span>
                <p class="mb-0 mt-2">${d.descripcion || 'Sin información.'}</p>
            </div>
            <div class="status-box ${statusClass}">
                <span class="status-label">Estado</span>
                <span class="status-value">${d.estado}</span>
            </div>
        </div>
    `;
    contenedor.prepend(card);
}

// Función auxiliar para manejar el cierre de otros elementos
function seleccionarSoloUno(elemento) {
    const todos = document.querySelectorAll('.driver-row');
    
    todos.forEach(item => {
        if (item !== elemento && item.classList.contains('expanded')) {
            item.classList.remove('expanded');
        }
    });

    elemento.classList.toggle('expanded');
}

function resetDriverForm() {
    const form = document.getElementById("formConductor");
    if (form) form.reset();
    document.getElementById("imgPreview").src = "https://via.placeholder.com/150?text=Subir+Foto";
    window.driverAppData.foto = "";
}

var mapaGlobal;
var marcadorChofer;

function initMapa() {
    // 1. Centrar el mapa en República Dominicana (Santo Domingo)
    if (document.getElementById('map')) {
        mapaGlobal = L.map('map').setView([18.4861, -69.9312], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapaGlobal);
    }
}

function buscarUbicacion() {
    const codigo = document.getElementById('codigoViaje').value.toUpperCase();

    // Simulación de "Base de Datos" de ubicaciones en RD
    const rutasSimuladas = {
        "TR-809": { lat: 18.4735, lng: -69.9389, nombre: "Juan Pérez", info: "Cerca de la Av. Churchill" },
        "SD-001": { lat: 18.5001, lng: -69.8555, nombre: "Pedro Alcántara", info: "Cruzando el Puente Flotante" },
        "ST-777": { lat: 19.4517, lng: -70.6970, nombre: "Marcos Díaz", info: "Santiago, cerca del Monumento" }
    };

    if (rutasSimuladas[codigo]) {
        const data = rutasSimuladas[codigo];
        
        // Si ya hay un marcador, quitarlo
        if (marcadorChofer) mapaGlobal.removeLayer(marcadorChofer);

        // Mover el mapa a la ubicación
        mapaGlobal.flyTo([data.lat, data.lng], 16);

        // Crear marcador con icono de camión/carro
        marcadorChofer = L.marker([data.lat, data.lng]).addTo(mapaGlobal)
            .bindPopup(`<b>Chofer:</b> ${data.nombre}<br><b>Estado:</b> ${data.info}`)
            .openPopup();
    } else {
        alert("Código de viaje no encontrado. Prueba con TR-809");
    }
}

function toggleMenu(boton) {
    // Cerramos cualquier otro menú abierto primero
    document.querySelectorAll('.dropdown-menu-custom').forEach(m => m.classList.remove('show'));
    
    // Abrimos el menú que pertenece a este botón
    const menu = boton.nextElementSibling;
    menu.classList.toggle('show');

    // Cerrar el menú si haces clic afuera
    document.addEventListener('click', function closeMenu(e) {
        if (!boton.contains(e.target)) {
            menu.classList.remove('show');
            document.removeEventListener('click', closeMenu);
        }
    });
}
