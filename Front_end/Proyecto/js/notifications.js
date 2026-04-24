/* =========================================================
   SISTEMA DE NOTIFICACIONES - TRANSFLEET
   Detecta alertas reales del sistema y las muestra en
   el panel de la campanita del header.
   ========================================================= */

const TFNotifications = (() => {

    let notificaciones = [];
    let panelVisible = false;

    // ── Tipos de alerta y su configuración visual ──────────────────────────
    const TIPOS = {
        danger:  { icon: "bi-exclamation-octagon-fill", color: "#dc2626", bg: "#fef2f2", label: "Urgente" },
        warning: { icon: "bi-exclamation-triangle-fill", color: "#d97706", bg: "#fffbeb", label: "Advertencia" },
        info:    { icon: "bi-info-circle-fill",          color: "#2563eb", bg: "#eff6ff", label: "Info" },
        success: { icon: "bi-check-circle-fill",         color: "#16a34a", bg: "#f0fdf4", label: "OK" },
    };

    // ── Inyectar HTML del panel y estilos ─────────────────────────────────
    function injectPanel() {
        // Estilos del sistema de notificaciones
        const style = document.createElement("style");
        style.textContent = `
            #tf-notif-wrapper { position: relative; display: inline-block; }

            #tf-notif-badge {
                position: absolute;
                top: -4px; right: -4px;
                background: #dc2626;
                color: #fff;
                border-radius: 999px;
                font-size: 0.65rem;
                font-weight: 700;
                min-width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                pointer-events: none;
                box-shadow: 0 0 0 2px var(--bg-surface, #fff);
                animation: tf-badge-pop 0.3s cubic-bezier(.36,.07,.19,.97);
            }

            @keyframes tf-badge-pop {
                0%   { transform: scale(0); }
                70%  { transform: scale(1.25); }
                100% { transform: scale(1); }
            }

            #tf-notif-panel {
                position: absolute;
                top: calc(100% + 12px);
                right: 0;
                width: 360px;
                max-height: 520px;
                background: var(--bg-surface, #fff);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.18);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: tf-panel-in 0.2s ease;
            }

            @keyframes tf-panel-in {
                from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                to   { opacity: 1; transform: translateY(0)   scale(1); }
            }

            .tf-notif-header {
                padding: 16px 18px 12px;
                border-bottom: 1px solid var(--border-color, #e2e8f0);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .tf-notif-header h6 {
                margin: 0;
                font-weight: 700;
                font-size: 0.95rem;
                color: var(--text-primary, #0f172a);
            }

            .tf-notif-marcar-btn {
                background: none;
                border: none;
                font-size: 0.75rem;
                color: #2563eb;
                cursor: pointer;
                font-weight: 600;
                padding: 0;
            }

            .tf-notif-list {
                overflow-y: auto;
                flex: 1;
                padding: 8px 0;
            }

            .tf-notif-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 12px 16px;
                cursor: pointer;
                transition: background 0.15s;
                border-left: 3px solid transparent;
            }

            .tf-notif-item:hover {
                background: var(--bg-main, #f8fafc);
            }

            .tf-notif-item.unread {
                border-left-color: #2563eb;
                background: rgba(37, 99, 235, 0.04);
            }

            .tf-notif-icon {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1rem;
                flex-shrink: 0;
            }

            .tf-notif-body { flex: 1; min-width: 0; }

            .tf-notif-title {
                font-size: 0.82rem;
                font-weight: 600;
                color: var(--text-primary, #0f172a);
                margin: 0 0 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .tf-notif-desc {
                font-size: 0.76rem;
                color: var(--text-secondary, #64748b);
                margin: 0;
                line-height: 1.4;
            }

            .tf-notif-time {
                font-size: 0.7rem;
                color: #94a3b8;
                white-space: nowrap;
                margin-top: 2px;
            }

            .tf-notif-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                color: #94a3b8;
                font-size: 0.85rem;
                text-align: center;
                gap: 10px;
            }

            .tf-notif-empty i { font-size: 2.5rem; opacity: 0.4; }

            .tf-notif-footer {
                padding: 10px 16px;
                border-top: 1px solid var(--border-color, #e2e8f0);
                text-align: center;
            }

            .tf-notif-footer button {
                background: none;
                border: none;
                font-size: 0.78rem;
                color: #2563eb;
                cursor: pointer;
                font-weight: 600;
            }

            #tf-bell-btn {
                position: relative;
                animation: none;
            }

            #tf-bell-btn.tf-bell-shake {
                animation: tf-shake 0.5s ease;
            }

            @keyframes tf-shake {
                0%, 100% { transform: rotate(0deg); }
                20%       { transform: rotate(-15deg); }
                40%       { transform: rotate(15deg); }
                60%       { transform: rotate(-10deg); }
                80%       { transform: rotate(10deg); }
            }
        `;
        document.head.appendChild(style);

        // Buscar el botón de campana existente
        const bellBtn = document.querySelector(".action-btn .bi-bell")?.closest("button");
        if (!bellBtn) return;

        // Envolver en wrapper relativo
        const wrapper = document.createElement("div");
        wrapper.id = "tf-notif-wrapper";
        bellBtn.parentNode.insertBefore(wrapper, bellBtn);
        wrapper.appendChild(bellBtn);
        bellBtn.id = "tf-bell-btn";

        // Badge contador
        const badge = document.createElement("span");
        badge.id = "tf-notif-badge";
        badge.style.display = "none";
        wrapper.appendChild(badge);

        // Panel dropdown (inicialmente oculto)
        const panel = document.createElement("div");
        panel.id = "tf-notif-panel";
        panel.style.display = "none";
        panel.innerHTML = `
            <div class="tf-notif-header">
                <h6><i class="bi bi-bell-fill me-2"></i>Notificaciones</h6>
                <button class="tf-notif-marcar-btn" id="tf-marcar-leidas">Marcar todo como leído</button>
            </div>
            <div class="tf-notif-list" id="tf-notif-list"></div>
            <div class="tf-notif-footer">
                <button id="tf-refresh-notif"><i class="bi bi-arrow-clockwise me-1"></i>Actualizar</button>
            </div>
        `;
        wrapper.appendChild(panel);

        // Eventos
        bellBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            togglePanel();
        });

        document.getElementById("tf-marcar-leidas").addEventListener("click", (e) => {
            e.stopPropagation();
            marcarTodoLeido();
        });

        document.getElementById("tf-refresh-notif").addEventListener("click", (e) => {
            e.stopPropagation();
            cargarNotificaciones(true);
        });

        // Cerrar al hacer clic fuera
        document.addEventListener("click", (e) => {
            if (!wrapper.contains(e.target)) cerrarPanel();
        });
    }

    // ── Toggle del panel ──────────────────────────────────────────────────
    function togglePanel() {
        if (panelVisible) {
            cerrarPanel();
        } else {
            abrirPanel();
        }
    }

    function abrirPanel() {
        const panel = document.getElementById("tf-notif-panel");
        if (panel) {
            panel.style.display = "flex";
            panelVisible = true;
        }
    }

    function cerrarPanel() {
        const panel = document.getElementById("tf-notif-panel");
        if (panel) {
            panel.style.display = "none";
            panelVisible = false;
        }
    }

    // ── Obtener notificaciones reales del sistema ─────────────────────────
    async function cargarNotificaciones(forzar = false) {
        const lista = [];
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        try {
            // 1. Vehículos con seguro vencido o por vencer
            const resV = await CONFIG.fetchAuth("/vehicles/");
            if (resV.ok) {
                const vehicles = await resV.json();
                vehicles.forEach(v => {
                    if (!v.vencimiento_seguro) {
                        lista.push({
                            id: `v-noseguro-${v.vehicle_id}`,
                            tipo: "warning",
                            titulo: `${v.marca} ${v.modelo} sin seguro`,
                            desc: `Placa ${v.plate_number} no tiene fecha de seguro registrada.`,
                            accion: () => cargarPagina("vehiculos"),
                            tiempo: "Ahora",
                            unread: true
                        });
                    } else {
                        const fVenc = new Date(v.vencimiento_seguro + "T00:00:00");
                        const dias = Math.ceil((fVenc - hoy) / (1000 * 60 * 60 * 24));
                        if (dias < 0) {
                            lista.push({
                                id: `v-seguro-vencido-${v.vehicle_id}`,
                                tipo: "danger",
                                titulo: `Seguro vencido · ${v.marca} ${v.modelo}`,
                                desc: `Placa ${v.plate_number}. Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? "s" : ""}.`,
                                accion: () => cargarPagina("vehiculos"),
                                tiempo: `Hace ${Math.abs(dias)}d`,
                                unread: true
                            });
                        } else if (dias <= 30) {
                            lista.push({
                                id: `v-seguro-pronto-${v.vehicle_id}`,
                                tipo: "warning",
                                titulo: `Seguro por vencer · ${v.marca} ${v.modelo}`,
                                desc: `Placa ${v.plate_number}. Vence en ${dias} día${dias !== 1 ? "s" : ""}.`,
                                accion: () => cargarPagina("vehiculos"),
                                tiempo: `En ${dias}d`,
                                unread: dias <= 7
                            });
                        }
                    }
                });
            }

            // 2. Conductores con licencia vencida o por vencer
            const resD = await CONFIG.fetchAuth("/drivers/");
            if (resD.ok) {
                const drivers = await resD.json();
                drivers.forEach(d => {
                    if (!d.vencimiento_licencia) return;
                    const fVenc = new Date(d.vencimiento_licencia + "T00:00:00");
                    const dias = Math.ceil((fVenc - hoy) / (1000 * 60 * 60 * 24));
                    if (dias < 0) {
                        lista.push({
                            id: `d-lic-vencida-${d.driver_id}`,
                            tipo: "danger",
                            titulo: `Licencia vencida · ${d.nombre}`,
                            desc: `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? "s" : ""}. Conductor marcado inactivo.`,
                            accion: () => cargarPagina("conductores"),
                            tiempo: `Hace ${Math.abs(dias)}d`,
                            unread: true
                        });
                    } else if (dias <= 30) {
                        lista.push({
                            id: `d-lic-pronto-${d.driver_id}`,
                            tipo: "warning",
                            titulo: `Licencia por vencer · ${d.nombre}`,
                            desc: `Vence en ${dias} día${dias !== 1 ? "s" : ""}. Renueva a tiempo.`,
                            accion: () => cargarPagina("conductores"),
                            tiempo: `En ${dias}d`,
                            unread: dias <= 7
                        });
                    }
                });
            }

            // 3. Solicitudes pendientes sin operador asignado
            const resR = await CONFIG.fetchAuth("/request/");
            if (resR.ok) {
                const requests = await resR.json();
                const pendientes = requests.filter(r =>
                    (r.estado || "").toLowerCase() === "pendiente" && !r.user_id
                );
                if (pendientes.length > 0) {
                    lista.push({
                        id: "solicitudes-pendientes",
                        tipo: "info",
                        titulo: `${pendientes.length} solicitud${pendientes.length !== 1 ? "es" : ""} sin atender`,
                        desc: `Hay solicitudes pendientes que no tienen operador asignado.`,
                        accion: () => cargarPagina("solicitudes"),
                        tiempo: "Ahora",
                        unread: true
                    });
                }

                // Solicitudes en proceso sin conductor o vehículo
                const enProceso = requests.filter(r =>
                    (r.estado || "").toLowerCase() === "en_proceso" &&
                    (!r.driver_id || !r.vehicle_id)
                );
                if (enProceso.length > 0) {
                    lista.push({
                        id: "solicitudes-incompletas",
                        tipo: "warning",
                        titulo: `${enProceso.length} solicitud${enProceso.length !== 1 ? "es" : ""} sin recursos completos`,
                        desc: `Solicitudes en proceso sin conductor o vehículo asignado.`,
                        accion: () => cargarPagina("solicitudes"),
                        tiempo: "Ahora",
                        unread: enProceso.length > 0
                    });
                }
            }

        } catch (err) {
            console.warn("[Notificaciones] Error cargando datos:", err);
        }

        // Ordenar: danger primero, luego warning, luego info
        const orden = { danger: 0, warning: 1, info: 2, success: 3 };
        lista.sort((a, b) => orden[a.tipo] - orden[b.tipo]);

        notificaciones = lista;
        renderPanel();
        actualizarBadge();

        // Agitar campana si hay urgentes
        const hayUrgentes = lista.some(n => n.tipo === "danger" && n.unread);
        if (hayUrgentes && forzar) {
            const bell = document.getElementById("tf-bell-btn");
            if (bell) {
                bell.classList.remove("tf-bell-shake");
                void bell.offsetWidth;
                bell.classList.add("tf-bell-shake");
                setTimeout(() => bell.classList.remove("tf-bell-shake"), 600);
            }
        }
    }

    // ── Renderizar la lista de notificaciones ─────────────────────────────
    function renderPanel() {
        const lista = document.getElementById("tf-notif-list");
        if (!lista) return;

        lista.innerHTML = "";

        if (notificaciones.length === 0) {
            lista.innerHTML = `
                <div class="tf-notif-empty">
                    <i class="bi bi-bell-slash"></i>
                    <span>Todo en orden.<br>No hay alertas pendientes.</span>
                </div>`;
            return;
        }

        notificaciones.forEach(n => {
            const cfg = TIPOS[n.tipo] || TIPOS.info;
            const item = document.createElement("div");
            item.className = `tf-notif-item ${n.unread ? "unread" : ""}`;
            item.dataset.id = n.id;

            item.innerHTML = `
                <div class="tf-notif-icon" style="background:${cfg.bg}; color:${cfg.color};">
                    <i class="bi ${cfg.icon}"></i>
                </div>
                <div class="tf-notif-body">
                    <p class="tf-notif-title">${n.titulo}</p>
                    <p class="tf-notif-desc">${n.desc}</p>
                    <span class="tf-notif-time">${n.tiempo}</span>
                </div>
            `;

            item.addEventListener("click", () => {
                n.unread = false;
                item.classList.remove("unread");
                actualizarBadge();
                cerrarPanel();
                if (typeof n.accion === "function") n.accion();
            });

            lista.appendChild(item);
        });
    }

    // ── Actualizar el badge contador ───────────────────────────────────────
    function actualizarBadge() {
        const badge = document.getElementById("tf-notif-badge");
        if (!badge) return;

        const noLeidas = notificaciones.filter(n => n.unread).length;

        if (noLeidas > 0) {
            badge.textContent = noLeidas > 99 ? "99+" : noLeidas;
            badge.style.display = "flex";
        } else {
            badge.style.display = "none";
        }
    }

    // ── Marcar todas como leídas ──────────────────────────────────────────
    function marcarTodoLeido() {
        notificaciones.forEach(n => n.unread = false);
        renderPanel();
        actualizarBadge();
    }

    // ── Inicialización pública ─────────────────────────────────────────────
    function init() {
        // Esperar a que el DOM esté listo y CONFIG disponible
        const tryInit = () => {
            if (typeof CONFIG === "undefined" || typeof cargarPagina === "undefined") {
                setTimeout(tryInit, 300);
                return;
            }
            injectPanel();
            // Primera carga con un pequeño delay para que la app termine de inicializar
            setTimeout(() => cargarNotificaciones(true), 1500);
            // Auto-refresh cada 5 minutos
            setInterval(() => cargarNotificaciones(false), 5 * 60 * 1000);
        };
        tryInit();
    }

    return { init, cargarNotificaciones };

})();

// Iniciar cuando el DOM esté listo
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => TFNotifications.init());
} else {
    TFNotifications.init();
}
