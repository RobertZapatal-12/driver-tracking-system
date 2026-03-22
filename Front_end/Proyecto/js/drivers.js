const API_URL = "http://127.0.0.1:8000/drivers";

let editandoDriverId = null;

async function cargarConductores() {
    try {
        const res = await fetch(`${API_URL}/`);
        const data = await res.json();
        const lista = document.getElementById("listaConductores");

        if (!lista) {
            console.error("No existe #listaConductores");
            return;
        }

        lista.innerHTML = "";

        data.forEach(driver => {
            renderDriverCard(driver);
        });
    } catch (error) {
        console.error("Error al cargar desde la API:", error);
    }
}

async function crearDriver(driver) {
    const res = await fetch(`${API_URL}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(driver)
    });

    if (!res.ok) {
        throw new Error("No se pudo crear el conductor");
    }

    return await res.json();
}

async function actualizarDriver(id, driver) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(driver)
    });

    if (!res.ok) {
        throw new Error("No se pudo actualizar el conductor");
    }

    return await res.json();
}

async function eliminarDriver(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE"
    });

    if (!res.ok) {
        throw new Error("No se pudo eliminar el conductor");
    }

    return await res.json();
}

async function confirmarEliminacion(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar a este conductor?")) return;

    try {
        await eliminarDriver(id);
        await cargarConductores();
        alert("✅ Conductor eliminado correctamente");
    } catch (error) {
        console.error(error);
        alert("❌ Error al eliminar");
    }
}

async function editarDriver(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`);
        if (!res.ok) {
            throw new Error("No se pudo obtener el conductor");
        }

        const d = await res.json();

        editandoDriverId = id;

        document.getElementById("nombreC").value = d.nombre || "";
        document.getElementById("telefonoC").value = d.telefono || "";
        document.getElementById("cedulaC").value = d.cedula || "";
        document.getElementById("numLicenciaC").value = d.numero_licencia || "";
        document.getElementById("tipoLicenciaC").value = d.tipo_licencia || "";
        document.getElementById("estadoC").value = d.estado || "";
        document.getElementById("descripcionC").value = d.descripcion || "";

        const preview = document.getElementById("imgPreview");
        if (preview) {
            preview.src = d.imagen || "https://via.placeholder.com/150?text=Subir+Foto";
        }

        window.driverAppData.foto = d.imagen || "";

        const modal = document.querySelector(".modal-overlay");
        if (modal) modal.style.display = "block";
    } catch (error) {
        console.error(error);
        alert("❌ No se pudo cargar el conductor para editar");
    }
}

function limpiarModoEdicion() {
    editandoDriverId = null;
}