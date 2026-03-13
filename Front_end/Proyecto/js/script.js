// Esperar a que cargue el DOM completamente
document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM cargado");

    // 1. Obtener elementos del DOM
    const modal = document.getElementById("modalVehiculo");
    const btnAbrir = document.getElementById("btnAbrirModal");
    const btnCancelar = document.getElementById("btnCancelar");
    const formVehiculo = document.getElementById("formVehiculo");
    const tablaVehiculos = document.getElementById("tablaVehiculos");

    console.log("Modal:", modal);
    console.log("btnAbrir:", btnAbrir);

    // Clave para localStorage
    const STORAGE_KEY = "vehiculos";

    // 2. Función para abrir modal
    function abrirModal() {
        console.log("Abriendo modal");
        if (modal) {
            modal.style.display = "flex";
            modal.classList.add("show");
        }
    }

    // 3. Función para cerrar modal
    function cerrarModal() {
        console.log("Cerrando modal");
        if (modal) {
            modal.classList.remove("show");
            modal.style.display = "none";
        }
        if (formVehiculo) {
            formVehiculo.reset();
        }
    }

    // 4. Evento para abrir modal
    if (btnAbrir) {
        btnAbrir.addEventListener("click", abrirModal);
        console.log("Click listener agregado a btnAbrir");
    }

    // 5. Evento para cerrar modal
    if (btnCancelar) {
        btnCancelar.addEventListener("click", cerrarModal);
    }

    // 6. Cerrar al hacer clic fuera del modal
    window.addEventListener("click", function(event) {
        if (event.target === modal) {
            cerrarModal();
        }
    });

    // 7. Guardar vehículo en localStorage
    function guardarVehiculo(vehiculo) {
        const vehiculos = obtenerVehiculos();
        vehiculos.push(vehiculo);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(vehiculos));
        
        alert("✅ ¡Vehículo agregado correctamente!");
        cerrarModal();
        cargarVehiculos();
    }

    // 8. Obtener vehículos de localStorage
    function obtenerVehiculos() {
        const datos = localStorage.getItem(STORAGE_KEY);
        return datos ? JSON.parse(datos) : [];
    }

    // 9. Cargar vehículos en la tabla
    function cargarVehiculos() {
        if (!tablaVehiculos) return;
        
        const vehiculos = obtenerVehiculos();
        const tbody = tablaVehiculos.querySelector("tbody");
        
        tbody.innerHTML = "";

        if (vehiculos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No hay vehículos registrados</td></tr>';
            return;
        }

        vehiculos.forEach(vehiculo => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${vehiculo.placa}</td>
                <td>${vehiculo.marca}</td>
                <td>${vehiculo.modelo}</td>
                <td>${vehiculo.capacidad}</td>
                <td>${vehiculo.estatus}</td>
                <td>${vehiculo.disponibilidad}</td>
                <td>
                    ${vehiculo.foto ? `<img src="${vehiculo.foto}" style="width:50px; height:50px; object-fit:cover; border-radius: 5px;">` : "Sin foto"}
                </td>
            `;
            tbody.appendChild(fila);
        });
    }

    // 10. Manejo del formulario
    if (formVehiculo) {
        formVehiculo.addEventListener("submit", function(e) {
            e.preventDefault();

            const placa = document.getElementById("placa").value.trim();
            const marca = document.getElementById("marca").value.trim();
            const modelo = document.getElementById("modelo").value.trim();
            const capacidad = document.getElementById("capacidad").value.trim();
            const estatus = document.getElementById("estatus").value;
            const disponibilidad = document.getElementById("disponibilidad").value;
            const fotoInput = document.getElementById("foto");

            // Validaciones
            if (!placa || !marca || !modelo || !capacidad) {
                alert("❌ Por favor completa todos los campos requeridos");
                return;
            }

            if (isNaN(capacidad) || capacidad <= 0) {
                alert("❌ La capacidad debe ser un número positivo");
                return;
            }

            const nuevoVehiculo = {
                id: Date.now(),
                placa,
                marca,
                modelo,
                capacidad,
                estatus,
                disponibilidad,
                foto: null
            };

            if (fotoInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    nuevoVehiculo.foto = event.target.result;
                    guardarVehiculo(nuevoVehiculo);
                };
                reader.readAsDataURL(fotoInput.files[0]);
            } else {
                guardarVehiculo(nuevoVehiculo);
            }
        });
    }

    // 11. Cargar vehículos al iniciar
    cargarVehiculos();

});