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
}