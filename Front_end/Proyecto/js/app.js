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