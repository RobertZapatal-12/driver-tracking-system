const API_URL = "http://127.0.0.1:8000/drivers";

// Cargar conductores
async function cargarConductores() {
    const res = await fetch(API_URL);
    const data = await res.json();

    const lista = document.getElementById("listaConductores");
    lista.innerHTML = "";

    data.forEach(driver => {
        lista.innerHTML += `
        <div>
            <h4>${driver.nombre}</h4>
            <p>${driver.telefono}</p>
            <button onclick="eliminarDriver(${driver.driver_id})">Eliminar</button>
        </div>
        `;
    });
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

    cargarConductores();
}

// Eliminar
async function eliminarDriver(id) {
    await fetch(`${API_URL}/${id}`, {
        method: "DELETE"
    });

    cargarConductores();
}

// Inicial
cargarConductores();