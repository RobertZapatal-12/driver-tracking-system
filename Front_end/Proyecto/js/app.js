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
            initModals(); // Reiniciar listeners de modales
            if (pagina === 'mapa') {
    setTimeout(initMapa, 100); // Pequeño retraso para asegurar que el DOM esté listo
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
    const openBtn = document.querySelector(".btn-open-modal");
    const closeBtn = document.querySelector(".btn-close-modal");
    const modal = document.querySelector(".modal-overlay");

    if (openBtn && modal) {
        openBtn.onclick = () => modal.style.display = "block";
        closeBtn.onclick = () => modal.style.display = "none";
    }

    // Lógica para Guardar Vehículo
    const formVehiculo = document.getElementById("formVehiculo");
    if (formVehiculo) {
        formVehiculo.onsubmit = (e) => {
            e.preventDefault();
            const placa = document.getElementById("placa").value;
            const marca = document.getElementById("marca").value;
            
            const tabla = document.getElementById("tablaVehiculos").getElementsByTagName('tbody')[0];
            const nuevaFila = tabla.insertRow();
            nuevaFila.innerHTML = `<td>${placa}</td><td>${marca}</td><td><span class="badge bg-success">Libre</span></td>`;
            
            modal.style.display = "none";
            formVehiculo.reset();
        };
    }

    // Lógica para Guardar Conductor
    const formConductor = document.getElementById("formConductor");
    if (formConductor) {
        formConductor.onsubmit = (e) => {
            e.preventDefault();
            const nombre = document.getElementById("nombreC").value;
            const cedula = document.getElementById("cedulaC").value;
            const licencia = document.getElementById("licenciaC").value;
            
            const tabla = document.getElementById("tablaConductores").getElementsByTagName('tbody')[0];
            const nuevaFila = tabla.insertRow();
            nuevaFila.innerHTML = `<td>${nombre}</td><td>${cedula}</td><td>${licencia}</td>`;
            
            modal.style.display = "none";
            formConductor.reset();
        };
    }
}

let mapaGlobal;
let marcadorChofer;

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