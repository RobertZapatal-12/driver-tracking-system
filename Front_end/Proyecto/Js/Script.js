// 1. Intentamos obtener los elementos
const modal = document.getElementById("modalVehiculo");
const btnAbrir = document.getElementById("btnAbrirModal");
const btnCancelar = document.getElementById("btnCancelar");

// 2. SEGURIDAD: Solo si el botón Y el modal existen en la página actual...
if (btnAbrir && modal) {
    
    btnAbrir.onclick = () => {
        modal.style.display = "block";
    };

    const cerrarModal = () => {
        modal.style.display = "none";
        if(formVehiculo) formVehiculo.reset();
    };

    if (btnCancelar) {
        btnCancelar.onclick = cerrarModal;
    }

    // Cerrar si hacen clic fuera del cuadro
    window.onclick = (event) => {
        if (event.target == modal) {
            cerrarModal();
        }
    };
}