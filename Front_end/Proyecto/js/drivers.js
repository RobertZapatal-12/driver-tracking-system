const API_URL = "http://127.0.0.1:8000/drivers/";

// Cargar conductores
async function cargarConductores() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        const lista = document.getElementById("listaConductores");
        
        if (!lista) return;
        
        lista.innerHTML = ""; // Limpia la lista actual

        data.forEach(driver => {
            renderDriverCard(driver); 
        });
    } catch (error) {
        console.error("Error al cargar desde la API:", error);
    }
}

// Crear conductor
async function crearDriver(driver) {
    await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(driver)
    });

}

// Eliminar
async function eliminarDriver(id) {
    await fetch(`${API_URL}/${id}`, {
        method: "DELETE"
    });

}

async function confirmarEliminacion(id) {
    if (confirm("¿Estás seguro de que deseas eliminar a este conductor?")) {
        try {
            await eliminarDriver(id);
            alert("✅ Conductor eliminado correctamente");
        } catch (error) {
            alert("❌ Error al eliminar");
        }
    }
}