/* =========================================================
   CONFIGURACIÓN CENTRALIZADA DE LA APLICACIÓN
   ========================================================= */

const CONFIG = {
    API_BASE: "http://127.0.0.1:8000",

    /**
     * Retorna los headers estándar con token de autenticación
     */
    getHeaders() {
        const token = localStorage.getItem("authToken");
        const headers = {
            "Content-Type": "application/json"
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
    },

    /**
     * Fetch autenticado - wrapper que incluye headers automáticamente
     */
    async fetchAuth(endpoint, options = {}) {
        const url = endpoint.startsWith("http") 
            ? endpoint 
            : `${this.API_BASE}${endpoint}`;

        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...(options.headers || {})
            }
        };

        const response = await fetch(url, config);

        // Si el backend devuelve 401, redirigir a login
        if (response.status === 401) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.href = "login.html";
            throw new Error("Sesión expirada");
        }

        return response;
    }
};

/* =========================================================
   SISTEMA GLOBAL DE TOASTS
   Reemplaza alert() y confirm() nativos
   ========================================================= */
const Toast = {
    _container: null,

    /**
     * Obtiene o crea el contenedor de toasts
     */
    _getContainer() {
        if (this._container && document.body.contains(this._container)) {
            return this._container;
        }

        this._container = document.createElement("div");
        this._container.id = "global-toast-container";
        this._container.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 420px;
            pointer-events: none;
        `;
        document.body.appendChild(this._container);
        return this._container;
    },

    /**
     * Muestra un toast con mensaje
     * @param {string} message - Texto del mensaje
     * @param {"success"|"error"|"info"|"warning"} type - Tipo de toast
     * @param {number} duration - Duración en ms (default: 4000)
     */
    show(message, type = "info", duration = 4000) {
        const container = this._getContainer();

        const icons = {
            success: "bi-check-circle-fill",
            error: "bi-x-circle-fill",
            warning: "bi-exclamation-triangle-fill",
            info: "bi-info-circle-fill"
        };

        const colors = {
            success: { bg: "#ecfdf5", border: "#10b981", text: "#065f46", icon: "#10b981" },
            error:   { bg: "#fef2f2", border: "#ef4444", text: "#991b1b", icon: "#ef4444" },
            warning: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e", icon: "#f59e0b" },
            info:    { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af", icon: "#3b82f6" }
        };

        const color = colors[type] || colors.info;
        const icon = icons[type] || icons.info;

        const toast = document.createElement("div");
        toast.style.cssText = `
            background: ${color.bg};
            border: 1px solid ${color.border};
            border-left: 4px solid ${color.border};
            border-radius: 12px;
            padding: 14px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            color: ${color.text};
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: auto;
            cursor: pointer;
            line-height: 1.5;
        `;

        toast.innerHTML = `
            <i class="bi ${icon}" style="font-size: 20px; color: ${color.icon}; flex-shrink: 0;"></i>
            <span style="flex: 1;">${message}</span>
            <i class="bi bi-x" style="font-size: 18px; opacity: 0.5; flex-shrink: 0;"></i>
        `;

        // Click para cerrar
        toast.addEventListener("click", () => this._dismiss(toast));

        container.appendChild(toast);

        // Animar entrada
        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateX(0)";
        });

        // Auto-cerrar
        if (duration > 0) {
            setTimeout(() => this._dismiss(toast), duration);
        }
    },

    _dismiss(toast) {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        setTimeout(() => toast.remove(), 350);
    },

    success(message, duration) { this.show(message, "success", duration); },
    error(message, duration)   { this.show(message, "error", duration); },
    warning(message, duration) { this.show(message, "warning", duration); },
    info(message, duration)    { this.show(message, "info", duration); },

    /**
     * Reemplazo de confirm() nativo con promesa
     * @param {string} message - Texto de confirmación
     * @returns {Promise<boolean>}
     */
    confirm(message) {
        return new Promise((resolve) => {
            const overlay = document.createElement("div");
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
                z-index: 99998; display: flex; align-items: center; justify-content: center;
                animation: fadeIn 0.2s ease;
            `;

            const dialog = document.createElement("div");
            dialog.style.cssText = `
                background: white; border-radius: 20px; padding: 32px;
                max-width: 420px; width: 90%; text-align: center;
                box-shadow: 0 25px 50px rgba(0,0,0,0.2);
                font-family: 'Inter', system-ui, sans-serif;
                transform: scale(0.9); animation: bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            `;

            dialog.innerHTML = `
                <div style="width: 56px; height: 56px; margin: 0 auto 16px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center;">
                    <i class="bi bi-exclamation-triangle-fill" style="font-size: 24px; color: #f59e0b;"></i>
                </div>
                <h5 style="margin: 0 0 8px; font-weight: 700; color: #0f172a; font-size: 1.15rem;">¿Estás seguro?</h5>
                <p style="margin: 0 0 24px; color: #64748b; font-size: 0.95rem; line-height: 1.5;">${message}</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="toast-cancel" style="padding: 10px 24px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 600; cursor: pointer; font-size: 14px; color: #64748b; transition: 0.2s;">Cancelar</button>
                    <button id="toast-confirm" style="padding: 10px 24px; border-radius: 12px; border: none; background: #ef4444; color: white; font-weight: 600; cursor: pointer; font-size: 14px; transition: 0.2s;">Confirmar</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            dialog.querySelector("#toast-cancel").addEventListener("click", () => {
                overlay.remove();
                resolve(false);
            });

            dialog.querySelector("#toast-confirm").addEventListener("click", () => {
                overlay.remove();
                resolve(true);
            });

            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(false);
                }
            });
        });
    }
};
