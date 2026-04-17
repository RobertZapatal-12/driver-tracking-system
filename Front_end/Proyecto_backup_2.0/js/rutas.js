let editandoRutaId = null;

function abrirModalRuta() {
    const modal = document.querySelector(".modal-overlay");
    if (modal) {
        modal.style.display = "flex";
    }
}

function cerrarModalRuta() {
    const modal = document.querySelector(".modal-overlay");
    if (modal) {
        modal.style.display = "none";
    }
}

function resetRouteForm() {
    const form = document.getElementById("routeForm");
    if (form) form.reset();

    const routeIdInput = document.getElementById("route_id");
    const modalTitle = document.getElementById("routeModalTitle");
    const submitBtn = document.getElementById("routeSubmitBtn");

    if (routeIdInput) routeIdInput.value = "";
    if (modalTitle) modalTitle.textContent = "Registrar Nueva Ruta";
    if (submitBtn) submitBtn.textContent = "Guardar Ruta";

    editandoRutaId = null;
}

async function cargarRutas() {
    try {
        const response = await fetch("http://127.0.0.1:8000/route/");

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        const rutas = await response.json();
        const tbody = document.getElementById("routes-table-body");

        if (!tbody) {
            console.error("No se encontró el tbody con id routes-table-body");
            return;
        }

        tbody.innerHTML = "";

        if (!Array.isArray(rutas) || rutas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center text-muted">No hay rutas registradas</td>
                </tr>
            `;
            return;
        }

        rutas.forEach(route => {
            tbody.innerHTML += `
                <tr>
                    <td>${route.route_id ?? ""}</td>
                    <td>${route.user_id ?? ""}</td>
                    <td>${route.vehicle_id ?? ""}</td>
                    <td>${route.driver_id ?? ""}</td>
                    <td>${route.driver_nombre ?? "Sin conductor"}</td>
                    <td>${route.origen ?? ""}</td>
                    <td>${route.destino ?? ""}</td>
                    <td>${route.fecha ? new Date(route.fecha).toLocaleString() : ""}</td>
                    <td>${route.estado ?? "Sin estado"}</td>
                    <td>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-warning" onclick="editarRuta(${route.route_id})">Editar</button>
                            <button class="btn btn-sm btn-danger" onclick="eliminarRuta(${route.route_id})">Eliminar</button>
                        </div>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error("Error cargando rutas:", error);
    }
}

async function guardarRuta() {
    if (editandoRutaId) {
        await actualizarRuta();
    } else {
        await crearRuta();
    }
}

async function crearRuta() {
    const vehicleId = parseInt(document.getElementById("vehicle_id").value);
    const origen = document.getElementById("origen").value.trim();
    const destino = document.getElementById("destino").value.trim();

    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = userData.user_id || userData.id;

    if (!vehicleId || !origen || !destino) {
        alert("Completa vehículo, origen y destino");
        return;
    }

    if (!userId) {
        alert("No se encontró el usuario logeado");
        console.error("Objeto user en localStorage:", userData);
        return;
    }

    const data = {
        user_id: userId,
        vehicle_id: vehicleId,
        origen: origen,
        destino: destino
    };

    try {
        const response = await fetch("http://127.0.0.1:8000/route/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Error creando ruta:", result);
            alert(result.detail || "No se pudo crear la ruta");
            return;
        }

        alert("Ruta creada correctamente");

        resetRouteForm();
        cerrarModalRuta();
        await cargarRutas();

    } catch (error) {
        console.error("Error de conexión:", error);
        alert("No se pudo conectar con el backend");
    }
}

async function editarRuta(routeId) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/route/${routeId}`);

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        const route = await response.json();

        editandoRutaId = route.route_id;

        document.getElementById("route_id").value = route.route_id ?? "";
        document.getElementById("vehicle_id").value = route.vehicle_id ?? "";
        document.getElementById("origen").value = route.origen ?? "";
        document.getElementById("destino").value = route.destino ?? "";

        const modalTitle = document.getElementById("routeModalTitle");
        const submitBtn = document.getElementById("routeSubmitBtn");

        if (modalTitle) modalTitle.textContent = "Editar Ruta";
        if (submitBtn) submitBtn.textContent = "Actualizar Ruta";

        abrirModalRuta();

    } catch (error) {
        console.error("Error cargando ruta para editar:", error);
        alert("No se pudo cargar la ruta");
    }
}

async function actualizarRuta() {
    const routeId = editandoRutaId;
    const vehicleId = parseInt(document.getElementById("vehicle_id").value);
    const origen = document.getElementById("origen").value.trim();
    const destino = document.getElementById("destino").value.trim();

    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = userData.user_id || userData.id;

    if (!routeId) {
        alert("No se encontró la ruta a editar");
        return;
    }

    if (!vehicleId || !origen || !destino) {
        alert("Completa vehículo, origen y destino");
        return;
    }

    if (!userId) {
        alert("No se encontró el usuario logeado");
        return;
    }

    const data = {
        user_id: userId,
        vehicle_id: vehicleId,
        origen: origen,
        destino: destino
    };

    try {
        const response = await fetch(`http://127.0.0.1:8000/route/${routeId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Error actualizando ruta:", result);
            alert(result.detail || "No se pudo actualizar la ruta");
            return;
        }

        alert("Ruta actualizada correctamente");

        resetRouteForm();
        cerrarModalRuta();
        await cargarRutas();

    } catch (error) {
        console.error("Error de conexión:", error);
        alert("No se pudo conectar con el backend");
    }
}

async function eliminarRuta(routeId) {
    const confirmar = confirm("¿Seguro que quieres eliminar esta ruta?");
    if (!confirmar) return;

    try {
        const response = await fetch(`http://127.0.0.1:8000/route/${routeId}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Error eliminando ruta:", result);
            alert(result.detail || "No se pudo eliminar la ruta");
            return;
        }

        alert("Ruta eliminada correctamente");
        await cargarRutas();

    } catch (error) {
        console.error("Error de conexión:", error);
        alert("No se pudo conectar con el backend");
    }
}

document.addEventListener("click", function (e) {
    if (e.target.classList.contains("btn-open-modal")) {
        resetRouteForm();
        abrirModalRuta();
    }

    if (e.target.classList.contains("btn-close-modal")) {
        resetRouteForm();
        cerrarModalRuta();
    }
});

window.guardarRuta = guardarRuta;
window.crearRuta = crearRuta;
window.editarRuta = editarRuta;
window.actualizarRuta = actualizarRuta;
window.eliminarRuta = eliminarRuta;
window.cargarRutas = cargarRutas;