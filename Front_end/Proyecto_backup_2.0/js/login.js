/* =========================================================
   CONFIGURACIÓN DE API
   ========================================================= */
const API_BASE = "http://127.0.0.1:8000";

/* =========================================================
   VARIABLES GLOBALES
   ========================================================= */
let isLoading = false;

/* =========================================================
   INICIALIZACIÓN
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    initializeLoginForm();
    initializePasswordToggle();
    checkIfAlreadyLoggedIn();
});

/* =========================================================
   VERIFICAR SI YA ESTÁ AUTENTICADO
   ========================================================= */
function checkIfAlreadyLoggedIn() {
    const token = localStorage.getItem("authToken");
    if (token) {
        // Si ya tiene token, redirige al dashboard
        setTimeout(() => {
            window.location.href = "index.html";
        }, 500);
    }
}

/* =========================================================
   INICIALIZAR FORMULARIO DE LOGIN
   ========================================================= */
function initializeLoginForm() {
    const loginForm = document.getElementById("loginForm");
    
    if (loginForm) {
        loginForm.addEventListener("submit", handleLoginSubmit);
    }
}

/* =========================================================
   MANEJO DEL ENVÍO DEL FORMULARIO
   ========================================================= */
async function handleLoginSubmit(e) {
    e.preventDefault();

    // Prevenir múltiples envíos
    if (isLoading) return;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const alertContainer = document.getElementById("alertContainer");

    // Limpiar alertas previas
    alertContainer.innerHTML = "";

    // Validación básica
    if (!email || !password) {
        showAlert("Por favor completa todos los campos", "danger");
        return;
    }

    // Actualizar estado de carga
    isLoading = true;
    updateLoadingState();

    try {
        // Realizar solicitud de login
        const response = await fetch(`${API_BASE}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: email,
                password: password,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            // Login exitoso
            showAlert("¡Bienvenido! Redirigiendo...", "success");
            
            // Guardar token y datos de usuario
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            
            // Guardar preferencia si está marcado
            if (document.getElementById("rememberMe").checked) {
                localStorage.setItem("rememberMe", "true");
            }

            // Redirigir después de 1.5 segundos
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
        } else {
            // Error en login
            const errorMessage = data.detail || "Email o contraseña incorrectos";
            showAlert(errorMessage, "danger");
        }
    } catch (error) {
        console.error("Error en login:", error);
        showAlert(
            "Error de conexión. Intenta más tarde.",
            "danger"
        );
    } finally {
        isLoading = false;
        updateLoadingState();
    }
}

/* =========================================================
   ACTUALIZAR ESTADO DE CARGA
   ========================================================= */
function updateLoadingState() {
    const submitBtn = document.querySelector(".btn-login-glow") || document.querySelector(".btn-login");
    const spinner = document.getElementById("btnSpinner");
    const btnText = document.getElementById("btnText");

    if (!submitBtn) return;

    if (isLoading) {
        submitBtn.disabled = true;
        spinner.style.display = "inline-block";
        btnText.textContent = "Iniciando sesión...";
    } else {
        submitBtn.disabled = false;
        spinner.style.display = "none";
        btnText.textContent = "Acceder al Sistema";
    }
}

/* =========================================================
   MOSTRAR ALERTAS
   ========================================================= */
function showAlert(message, type = "info") {
    const alertContainer = document.getElementById("alertContainer");
    
    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.role = "alert";
    alert.textContent = message;

    alertContainer.appendChild(alert);

    // Auto-remover alertas después de 5 segundos (excepto las de éxito)
    if (type !== "success") {
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

/* =========================================================
   TOGGLE DE VISIBILIDAD DE CONTRASEÑA
   ========================================================= */
function initializePasswordToggle() {
    const toggleBtn = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");

    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener("click", (e) => {
            e.preventDefault();

            const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
            passwordInput.setAttribute("type", type);

            // Cambiar icon
            const icon = toggleBtn.querySelector("i");
            if (type === "password") {
                icon.classList.remove("bi-eye-slash");
                icon.classList.add("bi-eye");
            } else {
                icon.classList.remove("bi-eye");
                icon.classList.add("bi-eye-slash");
            }
        });
    }
}

/* =========================================================
   DEMO LOGIN (Para pruebas sin backend)
   ========================================================= */
function demoLogin() {
    // Datos de demo
    const demoCredentials = {
        token: "demo-token-" + Date.now(),
        user: {
            id: 1,
            email: "admin@transfleet.com",
            name: "Admin Usuario",
            role: "admin"
        }
    };

    // Guardar en localStorage
    localStorage.setItem("authToken", demoCredentials.token);
    localStorage.setItem("user", JSON.stringify(demoCredentials.user));

    // Redirigir
    window.location.href = "index.html";
}

/* =========================================================
   MANEJO DE ENTER EN INPUTS
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const inputs = document.querySelectorAll(".form-control, .form-control-custom");
    inputs.forEach(input => {
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                // Prevenir comportamiento default para evitar doble submit
                e.preventDefault();
                const form = document.getElementById("loginForm");
                if (form) {
                    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                }
            }
        });
    });
});
