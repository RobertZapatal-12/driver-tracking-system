async function submitSolicitud(e) {
    e.preventDefault();

    const data = {
        cliente: document.getElementById('solicitud-cliente').value,
        fecha: document.getElementById('solicitud-fecha').value,
        origen: document.getElementById('solicitud-origen').value,
        destino: document.getElementById('solicitud-destino').value,
        descripcion: document.getElementById('solicitud-descripcion').value,
        tipo_vehiculo: document.getElementById('solicitud-tipo-vehiculo').value,
        estado: document.getElementById('solicitud-estado').value,
        prioridad: document.getElementById('solicitud-prioridad').value
    };

    try {
        // Obtenemos token de los datos globales de auth si existe, de lo contrario lo tomamos del localStorage
        const token = localStorage.getItem("authToken");
        
        let headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Dependiendo de si la API base global está definida, la usamos, o relativa
        const baseUrl = typeof CONFIG !== 'undefined' && CONFIG.API_URL ? CONFIG.API_URL : 'http://127.0.0.1:8000';
        
        const response = await fetch(`${baseUrl}/request/`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            if (typeof Toast !== 'undefined') {
                Toast.success("Solicitud guardada correctamente");
            } else {
                alert("Solicitud guardada correctamente");
            }
            document.getElementById('form-solicitud').reset();
        } else {
            console.error("Error al guardar solicitud:", response.statusText);
            if (typeof Toast !== 'undefined') {
                Toast.error("Error al guardar la solicitud");
            } else {
                alert("Error al guardar la solicitud");
            }
        }
    } catch (error) {
        console.error("Error de red:", error);
        if (typeof Toast !== 'undefined') {
            Toast.error("Error de conexión al servidor");
        } else {
            alert("Error de conexión al servidor");
        }
    }
}

function initSolicitudes() {
    const form = document.getElementById('form-solicitud');
    if (form) {
        form.addEventListener('submit', submitSolicitud);
    }
}
