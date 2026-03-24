document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       PANEL DE FILTROS
       ========================================================= */

    const btnToggleFiltros = document.getElementById("btnToggleFiltrosVehiculos");
    const btnCerrarFiltros = document.getElementById("btnCerrarFiltrosVehiculos");
    const panelFiltros = document.getElementById("vehiculosFiltros");

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

    /* =========================================================
       MODAL DETALLE VEHÍCULO
       ========================================================= */

    const tarjetas = document.querySelectorAll(".vehiculo-card");
    const modalDetalle = document.getElementById("modalDetalleVehiculo");
    const btnCerrarDetalle = document.getElementById("btnCerrarDetalleVehiculo");

    tarjetas.forEach(card => {
        card.addEventListener("click", () => {
            if (modalDetalle) {
                modalDetalle.style.display = "flex";
            }
        });
    });

    if (btnCerrarDetalle && modalDetalle) {
        btnCerrarDetalle.addEventListener("click", () => {
            modalDetalle.style.display = "none";
        });
    }

    if (modalDetalle) {
        modalDetalle.addEventListener("click", (e) => {
            if (e.target === modalDetalle) {
                modalDetalle.style.display = "none";
            }
        });
    }

    /* =========================================================
       MENÚ DE LA TUERCA (EDITAR / ELIMINAR)
       ========================================================= */

    const btnMenuVehiculo = document.getElementById("btnMenuVehiculo");
    const menuOpciones = document.getElementById("menuVehiculoOpciones");

    if (btnMenuVehiculo && menuOpciones) {
        btnMenuVehiculo.addEventListener("click", (e) => {
            e.stopPropagation();
            menuOpciones.classList.toggle("activo");
        });

        document.addEventListener("click", () => {
            menuOpciones.classList.remove("activo");
        });
    }

    /* =========================================================
       GALERÍA DE IMÁGENES
       ========================================================= */

    const imagenPrincipal = document.getElementById("vehiculoImagenPrincipal");
    const miniaturas = document.querySelectorAll(".vehiculo-miniatura");

    let indexActual = 0;
    let listaImagenes = [];

    miniaturas.forEach((btn, index) => {
        const img = btn.querySelector("img");

        if (img) {
            listaImagenes.push(img.src);
        }

        btn.addEventListener("click", () => {
            indexActual = index;
            actualizarImagenPrincipal();
        });
    });

    function actualizarImagenPrincipal() {
        if (!imagenPrincipal) return;

        imagenPrincipal.src = listaImagenes[indexActual];

        miniaturas.forEach(m => m.classList.remove("activa"));
        if (miniaturas[indexActual]) {
            miniaturas[indexActual].classList.add("activa");
        }
    }

    /* =========================================================
       FLECHAS DE GALERÍA
       ========================================================= */

    const btnLeft = document.querySelector(".vehiculo-galeria-arrow-left");
    const btnRight = document.querySelector(".vehiculo-galeria-arrow-right");

    if (btnRight) {
        btnRight.addEventListener("click", (e) => {
            e.stopPropagation();
            indexActual++;
            if (indexActual >= listaImagenes.length) {
                indexActual = 0;
            }
            actualizarImagenPrincipal();
        });
    }

    if (btnLeft) {
        btnLeft.addEventListener("click", (e) => {
            e.stopPropagation();
            indexActual--;
            if (indexActual < 0) {
                indexActual = listaImagenes.length - 1;
            }
            actualizarImagenPrincipal();
        });
    }

    /* =========================================================
       MODAL FORMULARIO VEHÍCULO (CREAR)
       ========================================================= */

    const btnNuevoVehiculo = document.querySelector(".btn-open-modal-vehiculo");
    const modalFormulario = document.getElementById("modalFormularioVehiculo");
    const btnCancelar = document.getElementById("btnCancelarVehiculo");

    if (btnNuevoVehiculo && modalFormulario) {
        btnNuevoVehiculo.addEventListener("click", () => {
            modalFormulario.style.display = "flex";

            const titulo = document.getElementById("tituloModalVehiculo");
            const btnGuardar = document.getElementById("btnGuardarVehiculo");

            if (titulo) titulo.textContent = "Nuevo Vehículo";
            if (btnGuardar) btnGuardar.textContent = "Guardar";

            const modalCard = document.querySelector(".modal-card-vehiculo-form");
            if (modalCard) {
                modalCard.classList.remove("modo-edicion");
                modalCard.classList.add("modo-crear");
            }
        });
    }

    if (btnCancelar && modalFormulario) {
        btnCancelar.addEventListener("click", () => {
            modalFormulario.style.display = "none";
        });
    }

    if (modalFormulario) {
        modalFormulario.addEventListener("click", (e) => {
            if (e.target === modalFormulario) {
                modalFormulario.style.display = "none";
            }
        });
    }

});