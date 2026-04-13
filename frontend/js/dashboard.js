/**
 * @file dashboard.js
 * @description Controlador principal del Panel de Control (Dashboard) de Passly.
 * 
 * [ESTUDIO: ARQUITECTURA SPA (Single Page Application)]
 * Passly funciona como una sola página. En lugar de recargar archivos .html distintos,
 * este script "intercambia" el contenido interno del contenedor principal según 
 * el módulo que el usuario elija en el menú lateral.
 */
import { apiRequest, checkAuth, handleLogout } from './api.js';
import { initTheme } from './theme.js';
import { showToast, escapeHTML, validarEmail, validarPassword } from './utils.js';

// --- ESTADO GLOBAL DEL DASHBOARD ---
let userData = null;          // Identidad del usuario que inició sesión
let currentData = [];         // Caché temporal de datos del módulo activo (usuarios, vehículos, etc.)
let currentView = 'overview'; // Seguimiento de qué "página interna" estamos viendo
let currentPagination = null; // Control de páginas para tablas con muchos registros
let notifications = [];       // Almacén para alertas en tiempo real (WebSockets)

// Exposición al objeto global 'window' para que los botones con onclick en HTML funcionen con módulos ES
window.closeModal = closeModal;
window.loadView = loadView;
window.handleLogout = handleLogout;
window.showModal = showModal;
window.showToast = showToast;
window.showUserDetail = (id) => showUserDetail(id);

window.toggleNotifications = async function(e) {
    if(e) e.stopPropagation();
    const dropdown = document.getElementById('notifDropdown');
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
        const notifList = document.getElementById('notifList');
        notifList.innerHTML = '<div style="padding:20px; text-align:center;"><span class="pulse-online"></span> Obteniendo datos...</div>';
        
        let url = userData?.rol_id === 1 ? '/logs?limit=5' : '/accesos?limit=5';
        const res = await apiRequest(url);
        
        if (res.ok && res.data && ((res.data.data && res.data.data.length > 0) || (res.data.logs && res.data.logs.length > 0) || (res.data.data && res.data.data.data))) {
            let items = res.data.logs ? res.data.logs : (res.data.data.data ? res.data.data.data : res.data.data);
            if (!Array.isArray(items)) items = [res.data.data]; // fallback
            const logs = items.slice(0, 5);
            notifList.innerHTML = logs.map(log => `
                <div style="padding:10px; border-bottom:1px solid var(--glass-border); font-size:12px; display:flex; gap:10px; align-items:flex-start;">
                    <div style="color:var(--accent-primary);">🔔</div>
                    <div>
                        <strong style="color:var(--text-primary);">${escapeHTML(log.accion || log.tipo || 'Evento')}</strong><br>
                        <span style="color:var(--text-muted);">${escapeHTML(log.detalles || log.usuario_nombre || log.modulo || '')}</span><br>
                        <small style="color:var(--text-muted); opacity:0.7;">${new Date(log.fecha_hora).toLocaleString()}</small>
                    </div>
                </div>
            `).join('');
        } else {
            notifList.innerHTML = '<div class="empty-state" style="padding:24px 0; font-size:13px;">Sistemas operativos. Sin alertas.</div>';
        }
        
        document.getElementById('notifBadge').style.display = 'none';
        document.getElementById('notifBadge').textContent = '0';
    }
};

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) {
        if(!e.target.closest('.notification-container')) dropdown.classList.add('hidden');
    }
});

/**
 * [ESTUDIO: CICLO DE VIDA - INICIALIZACIÓN]
 * Se ejecuta apenas el navegador tiene listo el DOM.
 * Es el "Punto de Arranque" (Bootstrap) de la aplicación.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // [MODO MAGIC] Capturar token de la URL si viene de un acceso rápido
    const urlParams = new URLSearchParams(window.location.search);
    const magicToken = urlParams.get('token');
    
    if (magicToken && urlParams.get('magic') === 'true') {
        localStorage.setItem('auth_token', magicToken);
        
        // [RESILIENCIA] Pre-cargar identidad mock para evitar redirecciones si la DB está lenta
        const roleParam = urlParams.get('role');
        const mockUser = roleParam === '2' 
            ? { id: 888, nombre: 'Juan', apellido: 'Perez', email: 'juan.perez@passly.com', rol_id: 2 }
            : (roleParam === '3' 
                ? { id: 777, nombre: 'Guardia', apellido: 'Nocturno', email: 'guardia1@passly.com', rol_id: 3 }
                : { id: 999, nombre: 'Admin', apellido: 'Demo', email: 'admin@passly.com', rol_id: 1 });
        
        localStorage.setItem('usuario_activo', JSON.stringify(mockUser));
        
        // Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Intentar actualizar con datos reales si es posible
        apiRequest('/usuarios/me').then(res => {
            if (res.ok) {
                localStorage.setItem('usuario_activo', JSON.stringify(res.data.user));
                // Refrescar UI si ya se había cargado
                if (userData) {
                    userData = res.data.user;
                    setupUI();
                }
            }
        });

        showToast(`Modo Demo Activo: ${mockUser.nombre}`, 'info');
    }

    // 1. CONTROL DE ACCESO: ¿Tiene permiso para estar aquí?
    userData = checkAuth();
    if (!userData) return; // Si no hay token, checkAuth redirige al index.html

    // 2. CONSTRUCCIÓN DE INTERFAZ: Adaptar el diseño al usuario
    initTheme();          // Aplicar Modo Oscuro o Claro
    setupUI();            // Construir el menú lateral según el ROL del usuario (Admin/Residente)
    setupSidebarToggle(); // Activar el botón de colapsar menú

    // 3. CARGA INICIAL: Mostrar el resumen por defecto
    await loadView('overview');

    // 4. TIEMPO REAL: Abrir canal de comunicación bidireccional
    try {
        setupSocket();
    } catch (err) {
        console.warn("⚠️ No se pudo inicializar WebSockets (Tiempo Real). Continuando en modo estándar.", err);
    }

    // 5. Configurar Botón Flotante de Soporte (Creative Feature)
    try {
        const fab = document.getElementById('supportFAB');
        if (fab) fab.onclick = () => loadView('help', true);
    } catch (err) {
        console.error("❌ Falló al inicializar el botón de soporte:", err);
    }

    // 6. Inicializar Centro de Notificaciones
    initNotifications();
});

/**
 * Configura el comportamiento de colapso del menú lateral para optimizar espacio.
 */
function setupSidebarToggle() {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');

    // Recuperar el último estado guardado (collapsed o expanded)
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (isCollapsed) sidebar.classList.add('collapsed');

    toggleBtn.onclick = () => {
        const collapsed = sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebar_collapsed', collapsed);
    };
}

/**
 * setupUI: Adapta la visión del sistema según el perfil del usuario.
 * 
 * [ESTUDIO: SEGURIDAD BASADA EN ROLES (RBAC)]
 * No todos los usuarios ven lo mismo. El frontend oculta menús sensibles (como 'Gestor de Usuarios')
 * para residentes, dejando solo lo necesario.
 */
function setupUI() {
    if (!userData) return;

    const navMenu = document.querySelector('.nav-menu');
    navMenu.innerHTML = ''; // Limpiar el menú para reconstruirlo de cero

    const role = userData.rol_id; // 1: Admin, 2: Residente, 3: Seguridad

    // Configuración de Módulos por ROL
    const viewConfigs = {
        1: [ // PERFIL ADMINISTRADOR: Control Total
            { section: 'CONTROL DEL SISTEMA', views: [
                { id: 'overview', icon: 'layout-dashboard', text: 'Resumen' },
                { id: 'usuarios', icon: 'users', text: 'Identidades' },
                { id: 'dispositivos', icon: 'monitor', text: 'Hardware' },
                { id: 'vehiculos', icon: 'truck', text: 'Flota' },
                { id: 'accesos', icon: 'lock', text: 'Logs Colectivos' }
            ]},
            { section: 'SEGURIDAD FÍSICA', views: [
                { id: 'scanner', icon: 'qr-code', text: 'Terminal QR', external: 'scanner.html' }
            ]},
            { section: 'AJUSTES', views: [
                { id: 'logs', icon: 'clipboard-list', text: 'Auditoría' },
                { id: 'perfil', icon: 'user-cog', text: 'Mi Perfil' },
                { id: 'security', icon: 'shield-check', text: 'Escudo 2FA' },
                { id: 'help', icon: 'help-circle', text: 'Ayuda' }
            ]}
        ],
        3: [ // PERFIL SEGURIDAD: Monitoreo y Escaneo
            { section: 'VIGILANCIA EN VIVO', views: [
                { id: 'overview', icon: 'layout-dashboard', text: 'Resumen' },
                { id: 'accesos', icon: 'lock', text: 'Últimos Cruces' },
                { id: 'usuarios', icon: 'users', text: 'Identidades (Búsqueda)' },
                { id: 'dispositivos', icon: 'monitor', text: 'Hardware (Búsqueda)' },
                { id: 'vehiculos', icon: 'truck', text: 'Flota (Búsqueda)' }
            ]},
            { section: 'OPERACIONES', views: [
                { id: 'scanner', icon: 'qr-code', text: 'Cámara Escáner', external: 'scanner.html' },
                { id: 'help', icon: 'help-circle', text: 'Guía de Vigilancia' }
            ]},
            { section: 'PERSONAL', views: [
                { id: 'perfil', icon: 'user-cog', text: 'Perfil' },
                { id: 'security', icon: 'shield-check', text: '2FA' }
            ]}
        ],
        2: [ // PERFIL RESIDENTE: Gestión de su propia información
            { section: 'MI PANEL', views: [
                { id: 'overview', icon: 'layout-dashboard', text: 'Resumen Personal' },
                { id: 'dispositivos', icon: 'monitor', text: 'Mis Equipos Tech' },
                { id: 'vehiculos', icon: 'truck', text: 'Mis Vehículos' },
                { id: 'accesos', icon: 'lock', text: 'Mi Historial' }
            ]},
            { section: 'IDENTIDAD', views: [
                { id: 'perfil', icon: 'user-cog', text: 'Mi Perfil' },
                { id: 'security', icon: 'shield-check', text: 'Seguridad' },
                { id: 'help', icon: 'help-circle', text: 'Centro de Ayuda' }
            ]}
        ]
    };

    const config = viewConfigs[role] || viewConfigs[2];

    config.forEach(group => {
        const header = document.createElement('div');
        header.className = 'nav-section';
        header.textContent = group.section;
        navMenu.appendChild(header);

        group.views.forEach(v => {
            const div = document.createElement('div');
            div.className = 'nav-item';
            div.dataset.view = v.id;
            div.innerHTML = `<i data-lucide="${v.icon}"></i> <span class="nav-text">${v.text}</span>`;
            
            if (v.external) {
                div.onclick = () => window.open(v.external, '_blank');
            } else {
                div.onclick = (e) => { e.preventDefault(); loadView(v.id); };
            }
            navMenu.appendChild(div);
        });
    });

    // Refresh Lucide Icons
    if (window.lucide) window.lucide.createIcons();

    const nombre = userData.nombre || 'Resident';
    const apellido = userData.apellido || '';

    // UI Identity update
    document.getElementById('userName').textContent = `${nombre} ${apellido}`;
    const avatarEl = document.getElementById('userInitial');
    if (userData.foto_url) {
        avatarEl.innerHTML = `<img src="${userData.foto_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
        avatarEl.textContent = nombre.charAt(0).toUpperCase();
    }

    const roleLabel = role === 1 ? 'ADMINISTRADOR' : (role === 3 ? 'SEGURIDAD' : 'RESIDENTE');
    document.getElementById('userRole').textContent = roleLabel;

    // Session Management
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm('¿Verificar salida de sesión segura?')) handleLogout();
        };
    }

    // Global Notification cleanup
    const btnClearNotifs = document.getElementById('btnClearNotifs');
    if (btnClearNotifs) {
        btnClearNotifs.onclick = (e) => {
            e.stopPropagation();
            notifications = [];
            updateNotificationUI();
        };
    }
}

/**
 * [ESTUDIO: MOTOR SPA - loadView]
 * Es el cerebro de la navegación. En lugar de cambiar de URL, 
 * limpiamos el contenedor central y volvemos a renderizar los datos.
 * 
 * @param {string} view - El ID del módulo (usuarios, accesos, perfil...)
 */
async function loadView(view, force = false) {
    if (currentView === view && view !== 'overview' && !force) return;
    currentView = view;

    const content = document.getElementById('view-content');
    const title = document.getElementById('view-title');

    // Reset view with transition class
    content.classList.remove('view-transition');
    void content.offsetWidth; // Force reflow
    content.classList.add('view-transition');

    // Actualizar estado 'active' en el Sidebar
    const navItems = document.querySelectorAll('.nav-menu .nav-item');
    navItems.forEach(i => i.classList.remove('active'));

    let activeItem = [...navItems].find(item => item.dataset.view === view);
    if (activeItem) activeItem.classList.add('active');

    // Mostrar cargador visual (Skeleton) mientras llegan los datos
    renderSkeleton(content, view);

    try {
        switch (view) {
            case 'overview':
                title.textContent = "Resumen General";
                await renderOverview(content);
                break;
            case 'usuarios':
                title.textContent = "Gestión de Usuarios";
                await renderUsuarios(content);
                break;
            case 'dispositivos':
                title.textContent = "Dispositivos Registrados";
                await renderDispositivos(content);
                break;
            case 'vehiculos':
                title.textContent = "Gestión de Vehículos";
                await renderVehiculos(content);
                break;
            case 'accesos':
                title.textContent = "Historial de Accesos";
                await renderAccesos(content);
                break;
            case 'logs':
                title.textContent = "Registro de Auditoría";
                await renderAuditLogs(content);
                break;
            case 'perfil':
            case 'profile':
                title.textContent = "Mi Perfil Personal";
                await renderMiPerfil(content);
                break;
            case 'security':
                title.textContent = "Escudo 2FA";
                await renderSecurity(content);
                break;
            case 'scanner':
                title.textContent = "Escáner de Acceso";
                await renderScanner(content);
                break;
            case 'help':
                title.textContent = "Centro de Ayuda";
                renderHelpCenter(content);
                break;
        }

        // Aparecer suavemente con un pequeño delay para forzar el reflow del navegador
        // Content is already transitioning via CSS class

    } catch (error) {
        console.error("View Error:", error);
        content.innerHTML = `<div class="error-message">Error al cargar la vista. Consola para más detalles.</div>`;
    }
}


function renderSkeleton(container, view) {
    let html = '';
    if (view === 'overview') {
        html = `<div class="stats-grid">${'<div class="skeleton skeleton-card"></div>'.repeat(5)}</div>
                <div class="dashboard-row" style="display:grid; grid-template-columns: 2fr 1fr; gap:20px; margin-top:30px;">
                    <div class="card skeleton" style="height:350px;"></div>
                    <div class="card skeleton" style="height:350px;"></div>
                </div>`;
    } else {
        html = `<div class="skeleton-row-container" style="margin-top:20px;">
                    ${'<div class="skeleton skeleton-row" style="height:60px; border-radius:12px; margin-bottom:10px;"></div>'.repeat(6)}
                </div>`;
    }
    container.innerHTML = html;
}

/**
 * renderOverview: Construye la "Home" del Dashboard.
 * 
 * [ESTUDIO: ASINCRONÍA EN PARALELO]
 * Usamos Promise.all para disparar dos peticiones al servidor al mismo tiempo.
 * Esto ahorra tiempo de espera al usuario, ya que las peticiones viajan juntas.
 */
async function renderOverview(container) {
    const [statsRes, trafficRes, accessRes] = await Promise.all([
        apiRequest('/stats'),         // Cantidad de usuarios, vehículos, etc.
        apiRequest('/stats/traffic'), // Para la gráfica de horas pico
        apiRequest('/accesos?limit=5')// Historial de accesos real para la tabla
    ]);

    const stats = statsRes?.data?.stats || { users: 0, accessToday: 0, tech: 0, vehicles: 0, alerts: 0 };
    
    // Resolvemos la paginación según el formato del backend res.data.data.data
    let rawAccessData = accessRes?.data?.data;
    let itemsArray = Array.isArray(rawAccessData) ? rawAccessData : (rawAccessData?.data || []);
    const recentAccess = itemsArray.slice(0, 5);

    const role = userData.rol_id;
    const isUser = role === 2;

    const grid = [
        { label: isUser ? 'ESTADO IDENTIDAD' : 'USUARIOS ACTIVOS', val: isUser ? 'VERIFICADO' : stats.users, icon: 'users', color: 'hsla(220, 90%, 65%, 1)' },
        { label: isUser ? 'MIS LOGS HOY' : 'ENTRADAS HOY', val: stats.accessToday, icon: 'door-open', color: 'hsla(150, 70%, 45%, 1)' },
        { label: isUser ? 'MIS ACTIVOS' : 'ACTIVOS DE HARDWARE', val: stats.tech, icon: 'monitor', color: 'hsla(280, 50%, 60%, 1)' },
        { label: isUser ? 'MIS VEHÍCULOS' : 'UNIDADES DE FLOTA', val: stats.vehicles, icon: 'truck', color: 'hsla(170, 60%, 50%, 1)' }
    ];

    if (role === 1 || role === 3) {
        grid.push({ label: 'ALERTAS DEL SISTEMA', val: stats.alerts, icon: 'shield-alert', color: 'hsla(0, 85%, 65%, 1)' });
    }

    container.innerHTML = `
        <div class="stats-grid">
            ${grid.map(s => `
                <div class="stat-card glass-glow" style="cursor:pointer;" onclick="const target = '${s.icon === 'users' ? 'usuarios' : s.icon === 'door-open' ? 'accesos' : s.icon === 'monitor' ? 'dispositivos' : s.icon === 'truck' ? 'vehiculos' : s.icon === 'shield-alert' ? 'logs' : 'overview'}'; if(target !== 'overview') loadView(target); else showToast('Módulo en construcción', 'info');">
                    <div class="stat-icon" style="color: ${s.color}; background: ${s.color.replace('1)', '0.1)')}">
                        <i data-lucide="${s.icon}"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${s.label}</h3>
                        <div class="value counter" data-value="${s.val ?? 0}">${s.val ?? 0}</div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="dashboard-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; margin-top: 32px;">
            <div class="card glass-glow" style="padding: 32px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h3 style="margin:0; font-size:18px; letter-spacing:-0.02em;">ACTIVIDAD EN TIEMPO REAL</h3>
                    <button class="btn-table" onclick="loadView('accesos')">Ver Historial</button>
                </div>
                <div class="data-table-container">
                    <table>
                        <thead><tr><th>Sujeto de Seguridad</th><th>Operación</th><th>Marca de Tiempo</th></tr></thead>
                        <tbody>
                            ${recentAccess.length ? recentAccess.map((a, index) => `
                                <tr class="animate-row" style="animation-delay: ${index * 0.05}s">
                                    <td>
                                        <div style="display:flex; align-items:center; gap:12px;">
                                            <div class="user-avatar" style="width:28px; height:28px; font-size:11px; border:1px solid var(--glass-border);">
                                                ${a.usuario_foto ? `<img src="${a.usuario_foto}" style="width:100%; border-radius:50%;">` : (a.usuario_nombre?.charAt(0) || '?')}
                                            </div>
                                            <span style="font-weight:600;">${escapeHTML(a.usuario_nombre)}</span>
                                        </div>
                                    </td>
                                    <td><span class="badge ${(a.tipo || '') === 'Entrada' ? 'badge-success' : 'badge-info'}">${(a.tipo || 'DESCONOCIDO').toUpperCase()}</span></td>
                                    <td style="color:var(--text-muted); font-family:monospace;">${new Date(a.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="3" style="padding:48px 0; text-align:center; color:var(--text-muted);">
                                        <div style="font-size:32px; margin-bottom:12px;">📡</div>
                                        <div>Esperando actividad del sistema...</div>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:24px;">
                ${role !== 2 ? `
                <div class="card glass-glow" style="padding: 32px; flex:1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin:0; font-size:18px;">TENDENCIAS DE TRÁFICO</h3>
                        <div class="badge badge-success"><span class="pulse-online" style="margin-right:8px;"></span>EN VIVO</div>
                    </div>
                    <div style="height: 200px;"><canvas id="peakHoursChart"></canvas></div>
                </div>` : ''}

                <div class="card glass-glow" style="padding: 32px; text-align: center;">
                    <h3 style="margin-bottom:20px; font-size:18px;">LLAVE DIGITAL (MFA)</h3>
                    <div id="qrContainer" style="width:160px; height:160px; margin:0 auto 24px; border-radius:16px; display:flex; align-items:center; justify-content:center; overflow:hidden; background:white; box-shadow:0 8px 24px rgba(0,0,0,0.1); border:4px solid var(--bg-secondary);">
                        <i data-lucide="qr-code" style="width:48px; height:48px; color:var(--bg-primary); opacity:0.2;"></i>
                    </div>
                    <div style="display:flex; gap:12px;">
                        <button id="btnGenerateQR" style="flex:2;">GENERAR LLAVE SEGURA</button>
                        <button id="btnDownloadQR" class="btn-icon" style="flex:0.5; display:none; height:auto; padding:12px;" title="Exportar Llave">
                            <i data-lucide="download"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        if (role !== 2) renderPeakHoursChart(trafficRes?.data?.data || []);
        setupQRButton();
        animateCounters();
    }, 100);
}

function animateCounters() {
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.value);
        if (isNaN(target)) return;

        let count = 0;
        const duration = 1000; // 1 segundo
        const increment = target / (duration / 16); // ~60fps

        const update = () => {
            count += increment;
            if (count < target) {
                counter.textContent = Math.floor(count);
                requestAnimationFrame(update);
            } else {
                counter.textContent = target;
            }
        };
        update();
    });
}

function setupQRButton() {
    const btn = document.getElementById('btnGenerateQR');
    const dlBtn = document.getElementById('btnDownloadQR');
    if (!btn) return;

    btn.onclick = async () => {
        const container = document.getElementById('qrContainer');
        btn.disabled = true;
        btn.textContent = "Generando...";

        const res = await apiRequest('/accesos/qr');
        if (res.ok && res.data.qr) {
            container.innerHTML = `<img id="currentUserQR" src="${res.data.qr}" style="width:100%; border-radius:8px;">`;
            btn.textContent = "Actualizar";
            dlBtn.style.display = 'block';
            dlBtn.onclick = () => {
                const link = document.createElement('a');
                link.download = `Passly_QR_${userData.nombre}.png`;
                link.href = res.data.qr;
                link.click();
            };
        } else {
            showToast("Error QR", "error");
        }
        btn.disabled = false;
    };
}

function renderPeakHoursChart(logs) {
    const ctx = document.getElementById('peakHoursChart');
    if (!ctx) return;
    const data = Array(24).fill(0);
    logs.forEach(log => data[new Date(log.fecha_hora).getHours()]++);

    if (window.myChart) window.myChart.destroy();
    
    // Create Premium Gradient
    const canvasCtx = ctx.getContext('2d');
    const gradient = canvasCtx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'hsla(220, 90%, 65%, 0.4)');
    gradient.addColorStop(1, 'hsla(220, 90%, 65%, 0)');

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`).slice(6, 22),
            datasets: [{ 
                label: 'System Access', 
                data: data.slice(6, 22), 
                backgroundColor: gradient, 
                borderColor: 'hsla(220, 90%, 65%, 1)', 
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'hsla(0,0%,100%,0.05)' }, ticks: { color: 'var(--text-muted)' } },
                x: { grid: { display: false }, ticks: { color: 'var(--text-muted)' } }
            }
        }
    });
}

function renderModuleHeader(container, config) {
    container.innerHTML = `
        <div class="table-controls animate-fade-in">
            <div class="search-container">
                <i data-lucide="search" style="width:16px; opacity:0.5;"></i>
                <input type="text" id="moduleSearch" placeholder="${config.searchPlaceholder || 'Query database...'}">
            </div>
            ${config.hasDateFilter ? `
                <div style="display:flex; gap:8px;">
                    <div class="search-container"><input type="date" id="dateStart" style="padding-left:12px;"></div>
                    <div class="search-container"><input type="date" id="dateEnd" style="padding-left:12px;"></div>
                </div>` : ''}
            <div class="action-buttons">
                ${config.hasExport ? `
                    <button class="btn-icon" id="btnExportCSV" title="Export CSV" style="background:hsla(150, 70%, 45%, 0.1); color:hsla(150, 70%, 45%, 1);">
                        <i data-lucide="file-spreadsheet"></i>
                    </button>
                    <button class="btn-icon" id="btnExportPDF" title="Export PDF" style="background:hsla(0, 85%, 65%, 0.1); color:hsla(0, 85%, 65%, 1);">
                        <i data-lucide="file-text"></i>
                    </button>
                ` : ''}
                ${userData?.rol_id !== 3 ? `
                    <button id="${config.buttonId}" style="height:44px; display:flex; align-items:center; gap:8px; padding:0 20px; border-radius:12px;">
                        <i data-lucide="plus" style="width:18px;"></i>
                        ${config.buttonText}
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Renderiza controles de paginación bajo la tabla del módulo activo.
 * @param {object} pagination - Objeto { total, page, limit, totalPages, hasNext, hasPrev }
 * @param {Function} onPageChange - Callback que recibe el nuevo número de página
 */
function renderPagination(pagination, onPageChange) {
    const existing = document.getElementById('paginationControls');
    if (existing) existing.remove();
    if (!pagination || pagination.totalPages <= 1) return;

    const nav = document.createElement('div');
    nav.id = 'paginationControls';
    nav.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:12px; margin:18px 0; font-size:13px;';
    nav.innerHTML = `
        <button id="pgPrev" class="btn-table" style="padding:6px 14px; ${!pagination.hasPrev ? 'opacity:0.4; cursor:not-allowed;' : ''}" ${!pagination.hasPrev ? 'disabled' : ''}>
            ← Anterior
        </button>
        <span style="color:var(--text-muted)">
            Página <strong style="color:var(--text-primary)">${pagination.page}</strong> de <strong style="color:var(--text-primary)">${pagination.totalPages}</strong>
            &nbsp;·&nbsp; <span style="opacity:0.6">${pagination.total} registros</span>
        </span>
        <button id="pgNext" class="btn-table" style="padding:6px 14px; ${!pagination.hasNext ? 'opacity:0.4; cursor:not-allowed;' : ''}" ${!pagination.hasNext ? 'disabled' : ''}>
            Siguiente →
        </button>
    `;

    const tableContainer = document.getElementById('moduleTableContainer');
    if (tableContainer) tableContainer.after(nav);

    if (pagination.hasPrev) nav.querySelector('#pgPrev').onclick = () => onPageChange(pagination.page - 1);
    if (pagination.hasNext) nav.querySelector('#pgNext').onclick = () => onPageChange(pagination.page + 1);
}

/**
 * renderUsuarios: Módulo de Gestión de Identidad.
 * 
 * [ESTUDIO: FILTRADO Y BÚSQUEDA]
 * Aquí se demuestra cómo enviar parámetros de búsqueda al servidor
 * para que este haga el filtrado en la base de datos (más eficiente que hacerlo en JS).
 */
async function renderUsuarios(container, page = 1) {
    const search = document.getElementById('moduleSearch')?.dataset.activeSearch || '';
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    
    // Petición paginada al backend
    const { ok, data } = await apiRequest(`/usuarios?page=${page}&limit=20${searchParam}`);
    if (!ok) return;

    currentData = data.data || data;
    currentPagination = data.pagination || null;

    if (page === 1 && !search) {
        // Solo renderizamos la cabecera (botones y buscador) la primera vez
        renderModuleHeader(container, { 
            buttonId: 'btnAddUser', 
            buttonText: '+ Usuario', 
            buttonColor: 'var(--accent-green)', 
            searchPlaceholder: 'Buscar nombre, email...', 
            module: 'usuarios',
            hasExport: true 
        });
    }
    const div = document.createElement('div');
    div.className = "data-table-container";
    div.id = "moduleTableContainer";
    div.innerHTML = generateUserTable(currentData);
    const existing = document.getElementById('moduleTableContainer');
    if (existing) existing.replaceWith(div);
    else container.appendChild(div);
    setupModuleEvents(container, 'usuarios');
    renderPagination(currentPagination, (p) => renderUsuarios(container, p));
}

/**
 * [ESTUDIO: RENDERIZADO DINÁMICO DE TABLAS]
 * En lugar de usar frameworks como React, Passly usa Template Strings de JS.
 * Esto permite construir HTML complejo de forma legible y eficiente.
 * @param {Array} data - Lista de objetos proveniente de la API.
 */
function generateUserTable(data) {
    if (!data.length) return `<div class="empty-state">No hay usuarios que coincidan con los criterios.</div>`;
    return `<table>
        <thead><tr>
            <th>IDENTIDAD</th>
            <th class="sortable" data-sort="nombre">NOMBRE COMPLETO <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="email">DIRECCIÓN DE CORREO <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="rol_id">NIVEL DE ACCESO <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th style="text-align:right;">OPERACIONES</th>
        </tr></thead>
        <tbody>
            ${data.map(u => `<tr>
                <td>
                    <div class="user-avatar" style="width:32px; height:32px; border:1px solid var(--glass-border);">
                        ${u.foto_url ? `<img src="${u.foto_url}" style="width:100%; border-radius:50%;">` : u.nombre.charAt(0)}
                    </div>
                </td>
                <td><strong style="color:var(--text-primary)">${escapeHTML(u.nombre)} ${escapeHTML(u.apellido || '')}</strong></td>
                <td style="font-family:monospace; opacity:0.8;">${escapeHTML(u.email)}</td>
                <td><span class="badge ${u.rol_id === 1 ? 'badge-info' : 'badge-success'}">${u.rol_id === 1 ? 'ADMIN' : 'RESIDENT'}</span></td>
                <td style="text-align:right;">
                    ${userData?.rol_id !== 3 ? `
                    <button class="btn-icon btn-detail" data-id="${u.id}" title="Inspección" style="color:var(--accent-blue);">
                        <i data-lucide="search"></i>
                    </button>
                    <button class="btn-icon btn-edit" data-item='${JSON.stringify(u)}' title="Modificar" style="color:var(--warning-color);">
                        <i data-lucide="edit-3"></i>
                    </button>
                    ` : '<span style="opacity:0.5; font-size:12px;">Solo lectura</span>'}
                </td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

/**
 * renderSecurity: Módulo de configuración MFA (TOTP).
 * 
 * [ESTUDIO: SEGURIDAD DE SEGUNDO FACTOR]
 * Este flujo permite vincular una App (como Google Authenticator) con Passly.
 * Involucra generar un secreto (QR) y verificarlo antes de activar la protección.
 */
async function renderSecurity(container) {
    container.innerHTML = `
        <div class="card glass-glow animate-fade-in" style="max-width:640px; margin:20px auto; padding:40px;">
            <div style="display:flex; align-items:center; gap:20px; margin-bottom:32px;">
                <div class="stat-icon" style="color:hsla(220, 90%, 65%, 1); background:hsla(220, 90%, 65%, 0.1); width:56px; height:56px;">
                    <i data-lucide="shield-check" style="width:28px; height:28px;"></i>
                </div>
                <div>
                    <h3 style="margin:0; font-size:20px;">CENTRO DE SEGURIDAD</h3>
                    <p style="margin:0; font-size:13px; color:var(--text-muted);">Gestiona tu autenticación de múltiples factores (MFA) para proteger tu cuenta.</p>
                </div>
            </div>

            <div id="mfaStatusContainer" style="padding:24px; background:hsla(0,0%,100%,0.03); border:1px solid var(--glass-border); border-radius:16px; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span style="font-size:11px; font-weight:700; color:var(--text-muted); letter-spacing:0.05em;">ESTADO DE PROTECCIÓN</span>
                    <span id="mfaStatusBadge" class="badge">VERIFICANDO...</span>
                </div>
                <button id="btnToggleMFA" style="height:40px; padding:0 16px; font-size:13px;">CONFIGURAR</button>
            </div>

            <div id="mfaSetupPanel" style="display:none; margin-top:32px; padding-top:32px; border-top:1px solid var(--glass-border); text-align:center;">
                <p style="font-size:14px; color:var(--text-secondary); margin-bottom:24px;">Escanea este código QR con tu aplicación de autenticador (Google, Authy, etc.)</p>
                <div id="mfaQRCode" style="background:white; padding:16px; width:180px; height:180px; margin:0 auto; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.2);"></div>
                
                <div style="margin-top:32px; max-width:280px; margin-inline:auto;">
                    <label style="display:block; font-size:11px; font-weight:700; color:var(--text-muted); text-align:left; margin-bottom:8px;">CÓDIGO DE VERIFICACIÓN</label>
                    <input type="text" id="mfaConfirmCode" placeholder="000 000" style="text-align:center; font-size:24px; letter-spacing:0.2em; height:64px;">
                    <button id="btnVerifyMFA" class="btn-primary" style="width:100%; margin-top:16px; height:52px;">ACTIVAR PROTECCIÓN</button>
                </div>
            </div>
            
            <div style="margin-top:40px; padding:20px; border-radius:12px; background:hsla(150, 70%, 45%, 0.05); border:1px solid hsla(150, 70%, 45%, 0.1); display:flex; gap:16px; align-items:flex-start;">
                <i data-lucide="info" style="width:18px; color:hsla(150, 70%, 45%, 1); margin-top:2px;"></i>
                <p style="margin:0; font-size:12px; line-height:1.6; color:hsla(150, 70%, 45%, 0.8);">MFA añade una capa extra de seguridad a tu cuenta al requerir algo más que una contraseña para iniciar sesión.</p>
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    updateMFAStatus(container);
}

async function updateMFAStatus(container) {
    const res = await apiRequest('/usuarios/me');
    if (res.ok && res.data.user) {
        const enabled = res.data.user.mfa_enabled;
        const badge = container.querySelector('#mfaStatusBadge');
        badge.textContent = enabled ? 'ACTIVADO' : 'DESACTIVADO';
        badge.className = `badge ${enabled ? 'badge-success' : 'badge-danger'}`;

        container.querySelector('#btnToggleMFA').onclick = async () => {
            const setup = await apiRequest('/auth/mfa/setup');
            if (setup.ok) {
                container.querySelector('#mfaQRCode').innerHTML = `<img src="${setup.data.qrCodeUrl}" style="width:100%;">`;
                container.querySelector('#mfaSetupPanel').style.display = 'block';
            }
        };

        container.querySelector('#btnVerifyMFA').onclick = async () => {
            const token = container.querySelector('#mfaConfirmCode').value;
            const ver = await apiRequest('/auth/mfa/verify', 'POST', { token });
            if (ver.ok) { 
                showToast("MFA Activado", "success"); 
                loadView('security'); 
            }
        };
    }
}

async function renderMiPerfil(container) {
    const res = await apiRequest('/usuarios/me');
    if (!res.ok) return container.innerHTML = `<div class="error-message">Connection failure while retrieving identity data.</div>`;
    const u = res.data.user;

    container.innerHTML = `
        <div class="card glass-glow animate-fade-in" style="max-width:720px; margin:20px auto; padding:40px;">
            <div style="display:flex; align-items:center; gap:24px; margin-bottom:40px;">
                <div style="position:relative;">
                    <div id="profileAvatarPreview" style="width:120px; height:120px; border-radius:32px; background:var(--bg-secondary); border:1px solid var(--glass-border); overflow:hidden; display:flex; justify-content:center; align-items:center; font-size:48px; box-shadow:0 12px 24px rgba(0,0,0,0.2);">
                        ${u.foto_url ? `<img src="${u.foto_url}" style="width:100%; height:100%; object-fit:cover;">` : u.nombre.charAt(0)}
                    </div>
                    <button id="btnUploadPhoto" class="btn-icon" style="position:absolute; bottom:-10px; right:-10px; background:var(--accent-primary); color:white; border-radius:12px; width:40px; height:40px; box-shadow:0 4px 12px var(--accent-primary-alpha);">
                        <i data-lucide="camera" style="width:18px;"></i>
                    </button>
                    <input type="file" id="profileImageInput" accept="image/png, image/jpeg" style="display:none;">
                </div>
                <div>
                    <h3 style="margin:0; font-size:24px; letter-spacing:-0.03em;">${u.nombre} ${u.apellido || ''}</h3>
                    <p style="margin:4px 0 0; color:var(--text-muted); font-size:14px;">Identidad de Residente y Acceso al Perfil</p>
                    <div class="badge badge-info" style="margin-top:12px;">${u.rol_id === 1 ? 'ADMINISTRADOR' : 'RESIDENTE'}</div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-bottom:32px;">
                <div class="input-group">
                    <label style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; display:block;">NOMBRE</label>
                    <input type="text" id="profileNombre" value="${escapeHTML(u.nombre)}" placeholder="ej. Juan">
                </div>
                <div class="input-group">
                    <label style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; display:block;">APELLIDO</label>
                    <input type="text" id="profileApellido" value="${escapeHTML(u.apellido || '')}" placeholder="ej. Pérez">
                </div>
            </div>

            <div class="input-group" style="margin-bottom:40px;">
                <label style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; display:block;">CORREO REGISTRADO (PROTEGIDO)</label>
                <div style="position:relative;">
                    <i data-lucide="mail" style="position:absolute; left:16px; top:50%; transform:translateY(-50%); width:16px; opacity:0.3;"></i>
                    <input type="email" value="${escapeHTML(u.email)}" disabled style="padding-left:48px; opacity:0.6; cursor:not-allowed;">
                </div>
            </div>
            
            <button id="btnSaveProfile" class="btn-primary" style="width:100%; height:56px; font-size:15px; letter-spacing:0.02em;">
                <i data-lucide="save" style="width:18px; margin-right:8px;"></i> GUARDAR CAMBIOS DE IDENTIDAD
            </button>
        </div>

        <div class="card glass-glow animate-fade-in" style="max-width:720px; margin:40px auto; padding:40px; border-bottom: 4px solid var(--error);">
            <div style="display:flex; align-items:center; gap:16px; margin-bottom:32px;">
                <i data-lucide="key-round" style="width:24px; color:var(--error);"></i>
                <h3 style="margin:0; font-size:18px; color:var(--error);">ROTACIÓN DE CREDENCIALES</h3>
            </div>
            
            <div class="input-group" style="margin-bottom:24px;">
                <input type="password" id="profileCurrentPass" placeholder="Contraseña de Seguridad Actual" style="height:52px;">
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-bottom:24px;">
                <input type="password" id="profileNewPass" placeholder="Nuevo Código Secreto" style="height:52px;">
                <input type="password" id="profileConfirmPass" placeholder="Repetir Nuevo Código" style="height:52px;">
            </div>

            <div style="height:6px; background:var(--bg-secondary); border-radius:10px; margin-bottom:32px; overflow:hidden;">
                <div id="passStrengthMeter" style="height:100%; width:0%; background:var(--error); transition:all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
            </div>

            <button id="btnChangePassword" style="width:100%; height:52px; background:transparent; border:1px solid var(--error); color:var(--error);">
                EJECUTAR ACTUALIZACIÓN DE CREDENCIALES
            </button>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    const fileInput = container.querySelector('#profileImageInput');
    const btnUpload = container.querySelector('#btnUploadPhoto');
    const avatarPreview = container.querySelector('#profileAvatarPreview');

    btnUpload.onclick = () => fileInput.click();

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (re) => {
            avatarPreview.innerHTML = `<img src="${re.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
        };
        reader.readAsDataURL(file);

        btnUpload.textContent = "Subiendo...";
        btnUpload.disabled = true;

        const formData = new FormData();
        formData.append('foto', file);

        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`/api/usuarios/${u.id}/photo`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const result = await res.json();
            
            if (res.ok) {
                showToast("Foto de perfil actualizada", "success");
                userData.foto_url = result.photoUrl;
                localStorage.setItem('usuario_activo', JSON.stringify(userData));
                setupUI(); 
            } else {
                showToast(result.error || "Error al subir foto", "error");
            }
        } catch(error) {
            showToast("Error de conexión al subir la imagen", "error");
        } finally {
            btnUpload.textContent = "Subir Nueva Foto";
            btnUpload.disabled = false;
        }
    };

    container.querySelector('#btnSaveProfile').onclick = async () => {
        const nombre = container.querySelector('#profileNombre').value.trim();
        const apellido = container.querySelector('#profileApellido').value.trim();
        
        if (!nombre) return showToast("El nombre es obligatorio", "error");
        
        const btn = container.querySelector('#btnSaveProfile');
        btn.classList.add('btn-loading');

        const res = await apiRequest(`/usuarios/${u.id}`, 'PUT', {
            nombre,
            apellido,
            email: u.email,
            rol_id: u.rol_id,
            estado_id: u.estado_id
        });

        if (res.ok) {
            showToast("Perfil actualizado correctamente", "success");
            userData.nombre = nombre;
            userData.apellido = apellido;
            localStorage.setItem('usuario_activo', JSON.stringify(userData));
            setupUI();
        } else {
            showToast(res.data?.error || "Error al actualizar perfil", "error");
        }
        
        btn.classList.remove('btn-loading');
    };

    // Password Strength Logic
    const newPassInput = container.querySelector('#profileNewPass');
    const meter = container.querySelector('#passStrengthMeter');
    
    newPassInput.oninput = (e) => {
        const val = e.target.value;
        let score = 0;
        if(val.length > 7) score++;
        if(/[A-Z]/.test(val)) score++;
        if(/[0-9]/.test(val)) score++;
        if(/[^A-Za-z0-9]/.test(val)) score++;

        meter.style.width = (score * 25) + '%';
        if(score <= 1) meter.style.background = 'var(--error-color)';
        else if(score === 2 || score === 3) meter.style.background = 'var(--warning-color)';
        else meter.style.background = 'var(--success-color)';
    };

    // Password Change Logic
    container.querySelector('#btnChangePassword').onclick = async () => {
        const currentPass = container.querySelector('#profileCurrentPass').value;
        const newPass = newPassInput.value;
        const confirmPass = container.querySelector('#profileConfirmPass').value;

        if(!currentPass || !newPass || !confirmPass) return showToast("Llena todos los campos", "error");
        if(newPass !== confirmPass) return showToast("Las contraseñas no coinciden", "error");
        if(!validarPassword(newPass).isValid) return showToast("La nueva contraseña no es segura", "error");

        const btn = container.querySelector('#btnChangePassword');
        btn.classList.add('btn-loading');

        const res = await apiRequest(`/usuarios/${u.id}/password`, 'PUT', { currentPassword: currentPass, newPassword: newPass });
        if(res.ok) {
            showToast("Contraseña cambiada. Cerrando sesión...", "success");
            setTimeout(() => handleLogout(), 2000);
        } else {
            showToast(res.data?.error || "La contraseña actual es incorrecta", "error");
            btn.classList.remove('btn-loading');
        }
    };
}

// REST OF THE MINIMAL FUNCTIONS TO KEEP DASHBOARD WORKING
/**
 * renderDispositivos: Gestión de activos tecnológicos (Laptops, Tablets, etc.)
 */
async function renderDispositivos(container, page = 1) {
    const search = document.getElementById('moduleSearch')?.dataset.activeSearch || '';
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const { ok, data } = await apiRequest(`/equipos?page=${page}&limit=20${searchParam}`);
    if (!ok) return;

    currentData = data.data || data;
    currentPagination = data.pagination || null;

    if (page === 1 && !search) {
        renderModuleHeader(container, { 
            buttonId: 'btnAddDevice', 
            buttonText: '+ Dispositivo', 
            buttonColor: 'var(--accent-blue)', 
            searchPlaceholder: 'Buscar equipo, serial...', 
            module: 'dispositivos',
            hasExport: true 
        });
    }
    const div = document.createElement('div');
    div.className = "data-table-container";
    div.id = "moduleTableContainer";
    div.innerHTML = generateDeviceTable(currentData);
    const existing = document.getElementById('moduleTableContainer');
    if (existing) existing.replaceWith(div);
    else container.appendChild(div);
    setupModuleEvents(container, 'dispositivos');
    renderPagination(currentPagination, (p) => renderDispositivos(container, p));
}

/**
 * renderVehiculos: Control de flota y estacionamiento.
 */
async function renderVehiculos(container, page = 1) {
    const search = document.getElementById('moduleSearch')?.dataset.activeSearch || '';
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    
    // Obsérvese que usamos el mismo endpoint de /dispositivos pero filtrando por vehículos
    const { ok, data } = await apiRequest(`/dispositivos?page=${page}&limit=20&soloVehiculos=true${searchParam}`);
    if (!ok) return;

    currentData = data.data || data;
    currentPagination = data.pagination || null;

    if (page === 1 && !search) {
        renderModuleHeader(container, { 
            buttonId: 'btnAddVehicle', 
            buttonText: '+ Vehículo', 
            buttonColor: 'var(--accent-lavender)', 
            searchPlaceholder: 'Buscar placa, marca...', 
            module: 'vehiculos',
            hasExport: true 
        });
    }
    const div = document.createElement('div');
    div.className = "data-table-container";
    div.id = "moduleTableContainer";
    div.innerHTML = generateVehicleTable(currentData);
    const existing = document.getElementById('moduleTableContainer');
    if (existing) existing.replaceWith(div);
    else container.appendChild(div);
    setupModuleEvents(container, 'vehiculos');
    renderPagination(currentPagination, (p) => renderVehiculos(container, p));
}

/**
 * renderAccesos: Historial de vigilancia y entradas/salidas.
 */
async function renderAccesos(container, page = 1) {
    const search = document.getElementById('moduleSearch')?.dataset.activeSearch || '';
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    
    // Recupera la lista de eventos de acceso registrados por los escáneres
    const { ok, data } = await apiRequest(`/accesos?page=${page}&limit=25${searchParam}`);
    if (!ok) return;

    currentData = data.data || data;
    currentPagination = data.pagination || null;

    if (page === 1 && !search) {
        renderModuleHeader(container, { 
            buttonId: 'btnLogAccess', 
            buttonText: '+ Manual', 
            buttonColor: 'var(--accent-emerald)', 
            searchPlaceholder: 'Filtrar usuario, tipo...', 
            module: 'accesos', 
            hasExport: true,         // Habilita botones de PDF/CSV
            hasDateFilter: true      // Habilita selección de fechas
        });
    }
    const div = document.createElement('div');
    div.className = "data-table-container";
    div.id = "moduleTableContainer";
    div.innerHTML = generateAccessTable(currentData);
    const existing = document.getElementById('moduleTableContainer');
    if (existing) existing.replaceWith(div);
    else container.appendChild(div);
    setupModuleEvents(container, 'accesos');
    renderPagination(currentPagination, (p) => renderAccesos(container, p));
}

async function renderAuditLogs(container, page = 1) {
    if (userData.rol_id !== 1) return container.innerHTML = "Acceso denegado";
    const { ok, data } = await apiRequest(`/logs?page=${page}&limit=50`);
    if (!ok) return;
    currentData = data.data || data;
    currentPagination = data.pagination || null;
    if (page === 1) {
        renderModuleHeader(container, { buttonId: 'btnRefreshLogs', buttonText: '🔄 Actualizar', buttonColor: 'var(--bg-secondary)', searchPlaceholder: 'Buscar logs...', module: 'logs' });
    }
    const div = document.createElement('div');
    div.className = "data-table-container";
    div.id = "moduleTableContainer";
    div.innerHTML = generateAuditTable(currentData);
    const existing = document.getElementById('moduleTableContainer');
    if (existing) existing.replaceWith(div);
    else container.appendChild(div);
    setupModuleEvents(container, 'logs');
    renderPagination(currentPagination, (p) => renderAuditLogs(container, p));
}

function generateDeviceTable(data) {
    if (!data.length) return `<div class="empty-state">No hay activos de hardware registrados.</div>`;
    return `<table>
        <thead><tr>
            <th class="sortable" data-sort="nombre">NOMBRE DEL HARDWARE <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="usuario_nombre">PROPIETARIO ASIGNADO <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="last_connection">ÚLTIMO LATIDO <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="estado_id">ESTADO DE SALUD <i data-lucide="chevron-down" style="width:12px;"></i></th>
        </tr></thead>
        <tbody>
            ${data.map(d => `<tr>
                <td>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600; color:var(--text-primary)">${escapeHTML(d.nombre)}</span>
                        <code style="font-size:10px; opacity:0.5;">UID: ${escapeHTML(d.identificador_unico)}</code>
                    </div>
                </td>
                <td><span style="display:flex; align-items:center; gap:8px;"><i data-lucide="user" style="width:14px; opacity:0.5;"></i> ${escapeHTML(d.usuario_nombre || 'Sin asignar')}</span></td>
                <td style="font-family:monospace; font-size:12px;">${d.last_connection ? new Date(d.last_connection).toLocaleString() : 'PENDIENTE'}</td>
                <td><span class="badge ${d.estado_id === 1 ? 'badge-success' : 'badge-danger'}">${d.estado_id === 1 ? 'EN LÍNEA' : 'DESCONECTADO'}</span></td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function generateVehicleTable(data) {
    if (!data.length) return `<div class="empty-state">No se han encontrado unidades de flota.</div>`;
    return `<table>
        <thead><tr>
            <th class="sortable" data-sort="nombre">MODELO DE UNIDAD <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="identificador_unico">PLACA / MATRÍCULA <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="usuario_nombre">PROPIETARIO LEGAL <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="medio_transporte">CLASIFICACIÓN <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th style="text-align:right;">EDITAR</th>
        </tr></thead>
        <tbody>
            ${data.map(v => `<tr>
                <td><strong style="color:var(--text-primary)">${escapeHTML(v.nombre)}</strong></td>
                <td><span class="badge badge-info" style="font-family:monospace; font-size:13px; font-weight:700;">${escapeHTML(v.identificador_unico)}</span></td>
                <td>${escapeHTML(v.usuario_nombre)}</td>
                <td><span style="opacity:0.8;">${escapeHTML(v.medio_transporte || 'PRIVADO')}</span></td>
                <td style="text-align:right;">
                    ${userData?.rol_id !== 3 ? `
                    <button class="btn-icon btn-edit" data-item='${JSON.stringify(v)}' style="color:var(--warning-color);"><i data-lucide="edit-2"></i></button>
                    ` : '<span style="opacity:0.5; font-size:12px;">Solo lectura</span>'}
                </td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function generateAccessTable(data) {
    if (!data.length) return `<div class="empty-state">
        <i data-lucide="shield-off" style="width:48px; height:48px; opacity:0.2; margin-bottom:16px;"></i>
        <h3>SIN REGISTROS</h3><p>No se han registrado eventos de acceso seguro en este período.</p>
    </div>`;
    return `<table>
        <thead><tr>
            <th class="sortable" data-sort="fecha_hora">FECHA / HORA <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="usuario_nombre">SUJETO DE SEGURIDAD <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="tipo">OPERACIÓN <i data-lucide="chevron-down" style="width:12px;"></i></th>
        </tr></thead>
        <tbody>
            ${data.map((a, i) => `<tr class="animate-row" style="animation-delay: ${i * 0.03}s">
                <td style="font-family:monospace; font-size:12px; color:var(--text-muted);">${new Date(a.fecha_hora).toLocaleString()}</td>
                <td><span style="font-weight:600; color:var(--text-primary)">${escapeHTML(a.usuario_nombre)}</span></td>
                <td><span class="badge ${a.tipo === 'Entrada' ? 'badge-success' : 'badge-info'}">${a.tipo.toUpperCase()}</span></td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

/**
 * CENTRO DE NOTIFICACIONES
 */
async function initNotifications() {
    // Escuchamos el clic en el contenedor principal de notificaciones
    const container = document.querySelector('.notification-container');
    const dropdown = document.getElementById('notifDropdown');
    
    if (!container || !dropdown) return;

    // Ya existe window.toggleNotifications vinculado en el HTML
    // Solo nos aseguramos de que al abrir se busquen las notificaciones
    const originalToggle = window.toggleNotifications;
    window.toggleNotifications = (e) => {
        if (originalToggle) originalToggle(e);
        if (!dropdown.classList.contains('hidden')) {
            fetchNotifications();
        }
    };

    // Cerrar si se hace clic fuera
    document.addEventListener('click', () => dropdown.classList.add('hidden'));

    // Intervalo de chequeo automático (cada 60 segundos)
    setInterval(fetchNotifications, 60000);
    fetchNotifications();

    const clearBtn = document.getElementById('btnClearNotifs');
    if (clearBtn) {
        clearBtn.onclick = async (e) => {
            e.stopPropagation();
            showToast("Notificaciones limpiadas", "info");
            // Aquí se podría llamar a un endpoint de 'read-all'
            const list = document.getElementById('notifList');
            if (list) list.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:13px;">Sin notificaciones nuevas</div>`;
            const badge = document.getElementById('notifBadge');
            if (badge) badge.style.display = 'none';
        };
    }
}

async function fetchNotifications() {
    const res = await apiRequest('/notificaciones');
    if (res.ok) {
        const notifs = res.data;
        const unreadCount = notifs.filter(n => !n.leido).length;
        const badge = document.getElementById('notifBadge');
        const list = document.getElementById('notifList');

        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }

        if (notifs.length === 0) {
            list.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:13px;">Sin notificaciones nuevas</div>`;
            return;
        }

        list.innerHTML = notifs.map(n => `
            <div class="notif-item ${n.leido ? '' : 'unread'}" onclick="markNotifRead(${n.id})">
                <i>${n.tipo === 'error' ? '🛑' : (n.tipo === 'warning' ? '⚠️' : 'ℹ️')}</i>
                <div class="notif-content">
                    <h4>${escapeHTML(n.titulo)}</h4>
                    <p>${escapeHTML(n.mensaje)}</p>
                    <div class="notif-time">${new Date(n.fecha_hora).toLocaleString()}</div>
                </div>
            </div>
        `).join('');
    }
}

async function markNotifRead(id) {
    await apiRequest(`/notificaciones/${id}/read`, 'PATCH');
    fetchNotifications();
}


/**
 * MODULO: CONFIGURACIÓN GLOBAL
 */
async function renderSettings(container) {
    if (userData.rol_id !== 1) return container.innerHTML = "Acceso restringido a Administradores";

    const res = await apiRequest('/config');
    if (!res.ok) return;
    const settings = res.data;

    container.innerHTML = `
        <div class="card glass-glow" style="max-width:900px; margin:0 auto; padding:30px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                <h3>Parametrización del Sistema</h3>
                <button id="btnSaveConfig" class="btn-table" style="background:var(--accent-green); color:white;">Guardar Cambios</button>
            </div>
            <div class="settings-grid">
                <div class="setting-item">
                    <label>Nombre de la Sede</label>
                    <input type="text" data-key="nombre_sede" value="${settings.nombre_sede}">
                </div>
                <div class="setting-item">
                    <label>Email de Alertas</label>
                    <input type="text" data-key="alerta_email" value="${settings.alerta_email}">
                </div>
                <div class="setting-item">
                    <label>Validez de QR (minutos)</label>
                    <input type="number" data-key="tiempo_qr_validez" value="${settings.tiempo_qr_validez}">
                </div>
                <div class="setting-item">
                    <label>Auto-Registro de Usuarios</label>
                    <select data-key="permite_registro_auto">
                        <option value="true" ${settings.permite_registro_auto === 'true' ? 'selected' : ''}>Habilitado</option>
                        <option value="false" ${settings.permite_registro_auto === 'false' ? 'selected' : ''}>Deshabilitado</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btnSaveConfig').onclick = async () => {
        const bodyArr = [...container.querySelectorAll('[data-key]')].reduce((acc, el) => {
            acc[el.dataset.key] = el.value;
            return acc;
        }, {});
        const save = await apiRequest('/config', 'PATCH', bodyArr);
        if (save.ok) showToast("Configuración guardada", "success");
    };
}

/**
 * MODULO: ANALÍTICAS AVANZADAS
 */
async function renderAnalytics(container) {
    const res = await apiRequest('/stats/advanced');
    if (!res.ok) return;
    const { weekly, byTransport, byRole } = res.data.data;

    container.innerHTML = `
        <div class="stats-grid">
            <div class="card glass-glow" style="grid-column: span 2;">
                <h3>Tendencia Seganal (Accesos)</h3>
                <div style="height:300px;"><canvas id="weeklyChart"></canvas></div>
            </div>
            <div class="card glass-glow">
                <h3>Distribución por Transporte</h3>
                <div style="height:250px;"><canvas id="transportChart"></canvas></div>
            </div>
            <div class="card glass-glow">
                <h3>Usuarios por Rol</h3>
                <div style="height:250px;"><canvas id="roleChart"></canvas></div>
            </div>
        </div>
    `;

    setTimeout(() => {
        // Grafico Semanal
        new Chart(document.getElementById('weeklyChart'), {
            type: 'line',
            data: {
                labels: weekly.map(w => w.date),
                datasets: [{ label: 'Accesos', data: weekly.map(w => w.count), borderColor: 'var(--accent-blue)', tension: 0.4, fill: true, backgroundColor: 'rgba(54, 162, 235, 0.1)' }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // Grafico Transporte (Dona)
        new Chart(document.getElementById('transportChart'), {
            type: 'doughnut',
            data: {
                labels: byTransport.map(t => t.label || 'Otros'),
                datasets: [{ data: byTransport.map(t => t.value), backgroundColor: ['#10b981', '#3b82f6', '#a78bfa', '#f59e0b', '#6366f1', '#ec4899'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // Grafico Roles
        new Chart(document.getElementById('roleChart'), {
            type: 'pie',
            data: {
                labels: byRole.map(r => r.label),
                datasets: [{ data: byRole.map(r => r.value), backgroundColor: ['#ef4444', '#3b82f6', '#10b981'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }, 100);
}

/**
 * MODULO: AYUDA / MANUALES
 */
async function renderHelp(container) {
    container.innerHTML = `
        <div style="max-width:800px; margin:0 auto;">
            <div class="card glass-glow" style="margin-bottom:30px; text-align:left;">
                <h3>Centro de Soporte Passly</h3>
                <p style="margin-top:10px; color:var(--text-secondary);">Accede a la documentación oficial del sistema para resolver dudas operativas.</p>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:30px;">
                    <div class="setting-item" style="cursor:pointer;" onclick="window.open('/docs/04_MANUALES.md', '_blank')">
                        <i style="font-size:30px;">📄</i>
                        <h4 style="margin-top:10px;">Manual de Usuario</h4>
                        <p style="font-size:11px;">Guía básica para el uso diario del sistema.</p>
                    </div>
                    <div class="setting-item" style="cursor:pointer;" onclick="window.open('/docs/04_MANUALES.md', '_blank')">
                        <i style="font-size:30px;">🛠️</i>
                        <h4 style="margin-top:10px;">Manual Técnico</h4>
                        <p style="font-size:11px;">Configuración avanzada para administradores.</p>
                    </div>
                </div>
            </div>
            
            <div class="card glass-glow" style="text-align:left;">
                <h3>Preguntas Frecuentes</h3>
                <details style="margin-top:20px; padding:10px; border-bottom:1px solid var(--border-color);">
                    <summary style="font-weight:600; cursor:pointer;">¿Cómo genero un nuevo código QR?</summary>
                    <p style="padding-top:10px; font-size:13px; color:var(--text-secondary);">En el panel de Inicio (Overview), busca la sección "Mi Llave QR" y presiona el botón "Generar".</p>
                </details>
                <details style="margin-top:10px; padding:10px; border-bottom:1px solid var(--border-color);">
                    <summary style="font-weight:600; cursor:pointer;">¿Qué hacer si un dispositivo no se reconoce?</summary>
                    <p style="padding-top:10px; font-size:13px; color:var(--text-secondary);">Asegúrese de que el ID único sea correcto y que el estado del dispositivo sea "Activo" en la gestión de dispositivos.</p>
                </details>
            </div>

            <div class="card glass-glow" style="margin-top:30px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%); text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0;">⚡ Soporte Rápido</h3>
                    <span class="badge badge-success">Online 24/7</span>
                </div>
                <p style="font-size:13px; color:var(--text-secondary); margin-bottom:20px;">¿Necesitas ayuda inmediata? Nuestro equipo técnico está a un clic.</p>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <button class="btn-table" style="background:#25D366; color:white; font-size:13px;" onclick="window.open('https://wa.me/573214567890?text=Hola,%20necesito%20soporte%20con%20Passly', '_blank')">
                        <i>💬</i> WhatsApp
                    </button>
                    <button class="btn-table" style="background:var(--accent-blue); color:white; font-size:13px;" onclick="location.href='mailto:soporte@passly.com?subject=Soporte Técnico Passly'">
                        <i>✉️</i> Email Directo
                    </button>
                </div>
                
                <div style="margin-top:20px; padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; font-size:11px; display:flex; align-items:center; gap:10px; border:1px solid var(--border-color);">
                    <span style="font-size:20px;">🤖</span>
                    <div>
                        <span style="font-weight:600; display:block;">PasslyBot</span>
                        <span style="opacity:0.7;">Para reportar errores técnicos críticos.</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateAuditTable(data) {
    if (!data.length) return `<div class="empty-state">
        <i data-lucide="file-search" style="width:48px; height:48px; font-size:24px;"></i>
        <h3>AUDITORÍA LIMPIA</h3><p>El rastro administrativo está actualmente vacío.</p>
    </div>`;
    return `<table>
        <thead><tr>
            <th class="sortable" data-sort="fecha_hora">MARCA DE TIEMPO <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="usuario_nombre">OPERADOR <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="accion">ACCIÓN <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="modulo">ÁMBITO <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="ip_address">IP DE ORIGEN <i data-lucide="chevron-down" style="width:12px;"></i></th>
        </tr></thead>
        <tbody>
            ${data.map((l, i) => `
                <tr class="animate-row" style="animation-delay: ${i * 0.02}s">
                    <td style="font-size:11px; font-family:monospace; color:var(--text-muted);">${new Date(l.fecha_hora).toLocaleString()}</td>
                    <td><strong style="color:var(--text-primary)">${escapeHTML(l.usuario_nombre || 'CORE')}</strong></td>
                    <td><span class="badge ${l.accion.includes('Crear') ? 'badge-success' : (l.accion.includes('Eliminar') ? 'badge-danger' : 'badge-info')}">${l.accion.toUpperCase()}</span></td>
                    <td><span style="font-size:11px; opacity:0.6;">${l.modulo.toUpperCase()}</span></td>
                    <td style="font-family:monospace; font-size:11px; opacity:0.8;">${l.ip_address || '::1'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>`;
}

function exportToPDF(title, columns, rows, fileName) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(46, 125, 50);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("Passly", 14, 20);
    doc.setFontSize(10);
    doc.text("Reporte de Sistema - " + new Date().toLocaleString(), 14, 30);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.text(title, 14, 55);

    doc.autoTable({
        startY: 65,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [46, 125, 50] },
        alternateRowStyles: { fillColor: [240, 240, 240] }
    });

    doc.save(`${fileName}_${new Date().getTime()}.pdf`);
    showToast("Reporte generado exitosamente", "success");
}

function exportToCSV(title, columns, rows, fileName) {
    let csvContent = "";
    csvContent += title + "\n\n";
    csvContent += columns.join(",") + "\n";
    
    rows.forEach(row => {
        const escapedRow = row.map(cell => {
            let cellStr = String(cell);
            // Si tiene comas o comillas, escaparlo
            if (cellStr.includes(',') || cellStr.includes('"')) {
                cellStr = '"' + cellStr.replace(/"/g, '""') + '"';
            }
            return cellStr;
        });
        csvContent += escapedRow.join(",") + "\n";
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for Excel UTF-8 BOM
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Archivo Excel/CSV descargado", "success");
}

/**
 * setupModuleEvents: Vincula los elementos de interacción de cada vista.
 * 
 * [ESTUDIO: OPTIMIZACIÓN DE BÚSQUEDA (DEBOUNCE)]
 * No queremos saturar al servidor con una petición por cada letra que el usuario escribe.
 * Por eso usamos un 'setTimeout'. El servidor solo se consulta cuando el usuario
 * deja de escribir por 350ms.
 */
function setupModuleEvents(container, type) {
    const searchInput = document.getElementById('moduleSearch');
    const tableContainer = document.getElementById('moduleTableContainer');
    const exportBtn = document.getElementById('btnExportPDF');
    const exportCSVBtn = document.getElementById('btnExportCSV');

    // Manejo de exportación de datos (Reportes)
    if (exportBtn || exportCSVBtn) {
        const handleExport = (format) => {
            if (type === 'accesos') {
                const cols = ["Fecha/Hora", "Usuario", "Tipo"];
                const rows = currentData.map(a => [new Date(a.fecha_hora).toLocaleString(), a.usuario_nombre, a.tipo]);
                if (format === 'pdf') exportToPDF("Historial de Accesos", cols, rows, "Passly_Accesos");
                else exportToCSV("Historial de Accesos", cols, rows, "Passly_Accesos");
            } else if (type === 'logs') {
                const cols = ["Fecha", "Usuario", "Acción", "Módulo", "IP"];
                const rows = currentData.map(l => [new Date(l.fecha_hora).toLocaleString(), l.usuario_nombre || 'Sistema', l.accion, l.modulo, l.ip_address]);
                if (format === 'pdf') exportToPDF("Registro de Auditoría", cols, rows, "Passly_Auditoria");
                else exportToCSV("Registro de Auditoría", cols, rows, "Passly_Auditoria");
            } else if (type === 'usuarios') {
                const cols = ["Nombre", "Email", "Rol"];
                const rows = currentData.map(u => [`${u.nombre} ${u.apellido}`, u.email, u.rol_id === 1 ? 'Admin' : (u.rol_id === 3 ? 'Seguridad' : 'Residente')]);
                if (format === 'pdf') exportToPDF("Base de Datos de Usuarios", cols, rows, "Passly_Usuarios");
                else exportToCSV("Base de Datos de Usuarios", cols, rows, "Passly_Usuarios");
            } else if (type === 'vehiculos') {
                const cols = ["Vehículo", "Placa", "Propietario"];
                const rows = currentData.map(v => [v.nombre, v.identificador_unico, v.usuario_nombre]);
                if (format === 'pdf') exportToPDF("Inventario de Flota", cols, rows, "Passly_Vehiculos");
                else exportToCSV("Inventario de Flota", cols, rows, "Passly_Vehiculos");
            } else if (type === 'dispositivos') {
                const cols = ["Equipo", "Serial", "Dueño"];
                const rows = currentData.map(d => [d.nombre, d.identificador_unico || d.serial, d.usuario_nombre]);
                if (format === 'pdf') exportToPDF("Equipos Tecnológicos", cols, rows, "Passly_Equipos");
                else exportToCSV("Equipos Tecnológicos", cols, rows, "Passly_Equipos");
            }
        };

        if (exportBtn) exportBtn.onclick = () => handleExport('pdf');
        if (exportCSVBtn) exportCSVBtn.onclick = () => handleExport('csv');
    }

    const refreshBtn = document.getElementById('btnRefreshLogs');
    if (refreshBtn) {
        refreshBtn.onclick = () => loadView('logs', true);
    }

    if (!searchInput || !tableContainer) return;

    /**
     * BÚSQUEDA SERVER-SIDE con debounce de 350ms.
     * Antes: filtraba solo currentData (la página actual) → incompleto.
     * Ahora: envía ?search= al backend y recarga la vista desde la primera página.
     */
    let searchDebounce = null;
    const renderFnMap = {
        'usuarios': (c, p) => renderUsuarios(c, p),
        'dispositivos': (c, p) => renderDispositivos(c, p),
        'vehiculos': (c, p) => renderVehiculos(c, p),
        'accesos': (c, p) => renderAccesos(c, p),
        'logs': (c, p) => renderAuditLogs(c, p),
    };

    searchInput.oninput = () => {
        clearTimeout(searchDebounce);

        // Visual feedback for search starting
        searchInput.parentElement.querySelector('i').textContent = '⏳';

        searchDebounce = setTimeout(async () => {
            const term = searchInput.value.trim();
            searchInput.dataset.activeSearch = term;

            const renderFn = renderFnMap[type];
            if (renderFn) {
                await renderFn(container, 1);
            }

            // Restore icon
            searchInput.parentElement.querySelector('i').textContent = '🔍';
        }, 500);
    };

    const addBtnMap = {
        'usuarios': 'btnAddUser',
        'dispositivos': 'btnAddDevice',
        'vehiculos': 'btnAddVehicle',
        'accesos': 'btnLogAccess'
    };
    const btn = document.getElementById(addBtnMap[type]);
    if (btn) btn.onclick = () => showModal(type);

    // Vincular botones de edición (Lápiz)
    container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.onclick = () => {
            const item = JSON.parse(btn.getAttribute('data-item'));
            showModal(type, item);
        };
    });

    // Vincular botones de detalle (Ojo / Ficha Maestra)
    container.querySelectorAll('.btn-detail').forEach(btn => {
        btn.onclick = () => {
            const id = parseInt(btn.getAttribute('data-id'));
            showUserDetail(id);
        };
    });

    // Bind sorting to headers
    setupTableSorting(container, type);
}

let activeSortOptions = { column: null, asc: true };

/**
 * Agrega eventos de clic a las cabeceras de tabla para ordenar 'currentData' en memoria.
 */
function setupTableSorting(container, type) {
    const headers = container.querySelectorAll('th.sortable');
    headers.forEach(th => {
        th.style.cursor = 'pointer';
        th.onclick = () => {
            const prop = th.dataset.sort;
            if (activeSortOptions.column === prop) {
                activeSortOptions.asc = !activeSortOptions.asc; // Invertir orden
            } else {
                activeSortOptions.column = prop;
                activeSortOptions.asc = true; // Primer clic ascendente
            }

            // Ordenar los datos
            currentData.sort((a, b) => {
                let valA = a[prop];
                let valB = b[prop];
                
                // Tratar nulos como strings vacíos
                if (valA == null) valA = '';
                if (valB == null) valB = '';

                // Strings case insensitive
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                if (valA < valB) return activeSortOptions.asc ? -1 : 1;
                if (valA > valB) return activeSortOptions.asc ? 1 : -1;
                return 0;
            });

            // Re-render del HTML de la tabla con la data ordenada
            const renderMap = {
                'usuarios': generateUserTable,
                'dispositivos': generateDeviceTable,
                'vehiculos': generateVehicleTable,
                'accesos': generateAccessTable,
                'logs': generateAuditTable
            };
            
            const tableContainer = document.getElementById('moduleTableContainer');
            if (tableContainer && renderMap[type]) {
                tableContainer.innerHTML = renderMap[type](currentData);
                // Restaurar eventos de los botones (Editar/Ver) usando DOM re-rendering
                setupModuleEvents(container, type); 
            }
        };
    });
}

/**
 * showModal: El centro de creación y edición de datos.
 * 
 * [ESTUDIO: REUTILIZACIÓN DE COMPONENTES]
 * Un solo modal se adapta para ser: Alta de Usuario, Edición de Vehículo o Generador de Invitaciones.
 * @param {string} type - Tipo de recurso (usuarios, vehiculos, etc.)
 * @param {object} item - Datos existentes si es edición, null si es creación.
 */
function showModal(type, item = null) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const saveBtn = document.getElementById('btnSave');

    if (!overlay || !body) return;

    // Cambiar el título según la acción
    title.textContent = item ? `Actualizar Registro: ${type}` : `Nuevo Registro: ${type.slice(0, -1)}`;
    saveBtn.style.display = 'block';
    saveBtn.onclick = () => handleModalSave(type, item?.id);

    if (type === 'vehiculos' || type === 'dispositivos') {
        body.innerHTML = `<div class="loading-spinner"></div> Cargando formulario...`;
        Promise.all([
            apiRequest('/usuarios?limit=1000'),
            apiRequest('/transportes')
        ]).then(([usersRes, transRes]) => {
            const users = usersRes.data.data || usersRes.data;
            const trans = transRes.data.data || transRes.data;
            body.innerHTML = renderDynamicForm(type, item, users, trans);
            if (window.lucide) window.lucide.createIcons();
        });
    } else {
        body.innerHTML = renderModalFields(type, item);
        if (window.lucide) window.lucide.createIcons();
    }

    // SINCRONIZACIÓN CON CSS: Usar 'active' en vez de 'show'
    overlay.classList.add('active');
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// Cerrar modales con la tecla Escape (Premium UX)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});


function renderModalFields(type, item) {
    if (type === 'usuarios') {
        return `
            <div class="form-group"><label>Nombre</label><input type="text" id="m_nombre" value="${item?.nombre || ''}"></div>
            <div class="form-group"><label>Apellido</label><input type="text" id="m_apellido" value="${item?.apellido || ''}"></div>
            <div class="form-group"><label>Email</label><input type="email" id="m_email" value="${item?.email || ''}"></div>
            <div class="form-group">
                <label>Rol de Acceso</label>
                <select id="m_rol">
                    <option value="1" ${item?.rol_id === 1 ? 'selected' : ''}>Administrador</option>
                    <option value="2" ${item?.rol_id === 2 ? 'selected' : ''}>Residente / Usuario</option>
                    <option value="3" ${item?.rol_id === 3 ? 'selected' : ''}>Personal de Seguridad</option>
                </select>
            </div>
            <div class="form-group">
                <label>${item ? 'Nueva Contraseña (Opcional)' : 'Contraseña Inicial'}</label>
                <input type="password" id="m_pass" placeholder="Mínimo 8 caracteres">
            </div>
        `;
    }
    if (type === 'accesos') {
        return `
            <div style="text-align:left;">
                <p style="font-size:14px; margin-bottom:15px; color:var(--text-muted);">Crea una invitación temporal para un invitado o registra un acceso manual.</p>
                <div class="form-group"><label>Nombre del Invitado</label><input type="text" id="guest_name" placeholder="Ej: Juan Pérez"></div>
                <div class="form-group"><label>Email del Invitado (Opcional)</label><input type="email" id="guest_email" placeholder="Para enviarle el QR directamente"></div>
                <div class="form-group"><label>Teléfono WhatsApp (Opcional)</label><input type="tel" id="guest_phone" placeholder="Ej: 573123456789"></div>
                <div class="form-group">
                    <label>Expiración (Horas)</label>
                    <select id="guest_expires">
                        <option value="1">1 hora</option>
                        <option value="4">4 horas</option>
                        <option value="24">24 horas</option>
                        <option value="48">48 horas</option>
                    </select>
                </div>
                <div id="invitationResult" style="margin-top:20px; display:none; text-align:center;">
                    <div id="guestQR" style="background:white; padding:10px; width:150px; height:150px; margin:0 auto; border-radius:8px;"></div>
                    <button class="btn-table" id="btnShareWA" style="background:#25D366; color:white; margin-top:15px; width:100%;">
                        <i>📱</i> Abrir WhatsApp Directo
                    </button>
                </div>
            </div>
        `;
    }
    if (type === 'transportes') {
        return `
            <div class="form-group"><label>Nombre de la Categoría</label><input type="text" id="t_nombre" value="${item?.nombre || ''}" placeholder="Ej: Carro, Moto, Blindado"></div>
            <div class="form-group"><label>Descripción</label><input type="text" id="t_desc" value="${item?.descripcion || ''}" placeholder="Opcional"></div>
        `;
    }
    if (type === 'logout_confirm') {
        return `
            <div style="text-align:center; padding:10px;">
                <p style="margin-bottom:20px; color:var(--text-secondary);">¿Estás seguro de que deseas cerrar tu sesión actual?</p>
                <div style="display:flex; gap:10px;">
                    <button id="btnConfirmLogout" class="btn-primary" style="background:var(--error-color)">Sí, Salir</button>
                    <button class="btn-secondary btn-close-modal">Cancelar</button>
                </div>
            </div>
        `;
    }
    return `<p>Formulario para ${type} en desarrollo...</p>`;
}

function renderDynamicForm(type, item, users, trans) {
    if (type === 'vehiculos') {
        return `
            <div class="form-group">
                <label>Propietario</label>
                <select id="v_usuario">
                    <option value="">Seleccione dueño...</option>
                    ${users.map(u => `<option value="${u.id}" ${item?.usuario_id === u.id ? 'selected' : ''}>${u.nombre} ${u.apellido}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Categoría</label>
                <select id="v_tipo">
                    <option value="">Seleccione tipo...</option>
                    ${trans.map(t => `<option value="${t.id}" ${item?.medio_transporte_id === t.id ? 'selected' : ''}>${t.nombre}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Marca / Modelo</label><input type="text" id="v_nombre" value="${item?.nombre || ''}" placeholder="Ej: Mazda CX-5"></div>
            <div class="form-group"><label>Placa (Matrícula)</label><input type="text" id="v_placa" value="${item?.identificador_unico || ''}" placeholder="Ej: ABC-123"></div>
        `;
    }
    if (type === 'dispositivos') {
        return `
            <div class="form-group">
                <label>Asignar a Usuario</label>
                <select id="d_usuario">
                    <option value="">Seleccione usuario...</option>
                    ${users.map(u => `<option value="${u.id}" ${item?.usuario_id === u.id ? 'selected' : ''}>${u.nombre} ${u.apellido}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Nombre del Equipo</label><input type="text" id="d_nombre" value="${item?.nombre || ''}" placeholder="Ej: Laptop Dell, iPad Admin"></div>
            <div class="form-group"><label>ID Único / Serial</label><input type="text" id="d_uid" value="${item?.identificador_unico || ''}" placeholder="Opcional"></div>
        `;
    }
}

/**
 * handleModalSave: El orquestador de persistencia.
 * Determina si debe hacer un POST (Crear) o un PUT (Actualizar) hacia el servidor.
 */
async function handleModalSave(type, id) {
    let payload = {};
    let url = `/${type}`;
    let method = id ? 'PUT' : 'POST'; // Si hay ID, estamos editando
    if (id) url += `/${id}`;

    // 🛡️ VALIDACIÓN LADO CLIENTE
    if (type === 'usuarios') {
        payload = {
            nombre: document.getElementById('m_nombre').value.trim(),
            apellido: document.getElementById('m_apellido').value.trim(),
            email: document.getElementById('m_email').value.trim().toLowerCase(),
            rol_id: parseInt(document.getElementById('m_rol').value)
        };
        const pass = document.getElementById('m_pass').value;
        if (pass) payload.password = pass; // Solo enviar si se escribió una clave

        if (!payload.nombre || !payload.email) return showToast("Nombre y Email son requeridos", "warning");
        if (!validarEmail(payload.email)) return showToast("Email inválido", "error");
        if (!id && !payload.password) return showToast("La contraseña es obligatoria para nuevos usuarios", "warning");
    } else if (type === 'vehiculos') {
        url = '/dispositivos'; // Los vehículos van a la tabla DISPOSITIVOS
        if (id) url = `/dispositivos/${id}`;
        payload = {
            usuario_id: document.getElementById('v_usuario').value,
            medio_transporte_id: document.getElementById('v_tipo').value,
            nombre: document.getElementById('v_nombre').value.trim(),
            identificador_unico: document.getElementById('v_placa').value.trim().toUpperCase()
        };
        if (!payload.usuario_id || !payload.nombre || !payload.identificador_unico) return showToast("Todos los campos son obligatorios", "warning");
    } else if (type === 'dispositivos') {
        url = '/equipos'; // Los equipos tech van a la tabla EQUIPOS
        if (id) url = `/equipos/${id}`;
        payload = {
            usuario_id: document.getElementById('d_usuario').value,
            nombre: document.getElementById('d_nombre').value.trim(),
            tipo: 'Personal Tech', // Valor por defecto
            serial: document.getElementById('d_uid').value.trim() || `SN-${Date.now()}`
        };
        if (!payload.usuario_id || !payload.nombre) return showToast("Asigne un dueño y nombre al equipo", "warning");
    } else if (type === 'accesos') {
        const guestName = document.getElementById('guest_name').value.trim();
        const guestEmail = document.getElementById('guest_email').value.trim();
        const expirationHours = document.getElementById('guest_expires').value;
        if (!guestName) return showToast("Nombre del invitado requerido", "warning");

        const btnSave = document.getElementById('btnSave');
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = `<span class="loading-spinner"></span> Generando...`;
            btnSave.classList.add('btn-loading');
        }

        try {
            const res = await apiRequest('/accesos/invitation', 'POST', { guestName, guestEmail, expirationHours });
            if (res.ok) {
                const resultDiv = document.getElementById('invitationResult');
                const qrDiv = document.getElementById('guestQR');
                const waBtn = document.getElementById('btnShareWA');

                qrDiv.innerHTML = `<img src="${res.data.qr}" style="width:100%;">`;
                resultDiv.style.display = 'block';

                waBtn.onclick = async () => {
                    const phone = document.getElementById('guest_phone').value;
                    const waRes = await apiRequest('/accesos/invitation/whatsapp', 'POST', { guestName, token: res.data.token, phone });
                    if (waRes.ok) window.open(waRes.data.waLink, '_blank');
                };

                showToast(res.data.sentByEmail ? "Invitación generada y enviada" : "Invitación generada", "success");
            }
        } finally {
            if (btnSave) btnSave.classList.remove('btn-loading');
        }
        return;
    }

    const btnSave = document.getElementById('btnSave');
    let originalText = "";
    if (btnSave) {
        originalText = btnSave.innerHTML;
        btnSave.disabled = true;
        btnSave.innerHTML = `<span class="loading-spinner"></span> Procesando...`;
        btnSave.classList.add('btn-loading');
    }

    try {
        const finalRes = await apiRequest(url, method, payload);
        if (finalRes && finalRes.ok) {
            showToast(id ? 'Actualizado correctamente' : 'Creado correctamente', 'success');
            closeModal();
            loadView(type);
        } else {
            showToast(finalRes?.data?.error || finalRes?.error || "Error al procesar la solicitud", "error");
        }
    } catch (err) {
        console.error("Save error:", err);
        showToast("Error de conexión con el servidor", "error");
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = originalText;
            btnSave.classList.remove('btn-loading');
        }
    }
}

// Helper functions are imported from utils.js

/**
 * [ESTUDIO: COMUNICACIÓN EN TIEMPO REAL (WEBSOCKETS)]
 * Passly usa Socket.io para que el Dashboard se actualice solo.
 * Si un guardia escanea un QR en la entrada, este socket recibe una señal
 * y refresca la tabla de accesos automáticamente sin que nadie toque nada.
 */
function setupSocket() {
    if (typeof io === 'undefined') {
        throw new Error("Librería socket.io no cargada.");
    }
    const socket = io(); // Conexión persistente con el servidor

    // Escucha eventos globales de actualización
    socket.on('stats_update', () => {
        if (currentView === 'overview') loadView('overview', true);
        if (currentView === 'accesos') loadView('accesos', true);
    });

    socket.on('disconnect', () => {
        console.warn('⚠️ Canal de tiempo real perdido...');
    });

    // Evento específico: Nuevo registro de acceso detectado
    socket.on('new_access', (data) => {
        showToast(`🔔 Acceso: ${data.usuario_nombre} (${data.tipo})`, 'info');
        addNotification('access', `Acceso de ${data.usuario_nombre} (${data.tipo})`);
        
        // Refrescamos la vista si el usuario está viendo los logs
        if (currentView === 'overview' || currentView === 'accesos') {
            loadView(currentView, true);
        }
    });
}

/**
 * Agrega y renderiza una nueva notificación en la campana superior.
 */
function addNotification(type, message) {
    notifications.unshift({ type, message, time: new Date() });
    if (notifications.length > 50) notifications.pop(); // Mantener solo las últimas 50
    updateNotificationUI();
}

function updateNotificationUI() {
    const badge = document.getElementById('notifBadge');
    const list = document.getElementById('notifList');
    if (!badge || !list) return;

    if (notifications.length === 0) {
        badge.style.display = 'none';
        list.innerHTML = `<div class="empty-state" style="padding:15px 0; border:none; background:transparent;">Nada nuevo por aquí 🎉</div>`;
        return;
    }

    badge.style.display = 'block';
    badge.textContent = notifications.length > 9 ? '9+' : notifications.length;

    list.innerHTML = notifications.map(n => `
        <div style="padding:10px; border-bottom:1px solid rgba(0,0,0,0.05); display:flex; align-items:start; gap:10px; animation: slideIn 0.3s ease-out;">
            <div style="font-size:16px; margin-top:2px;">${n.type === 'access' ? '🚪' : '⚠️'}</div>
            <div>
                <div style="font-size:13px; color:var(--text-primary); line-height:1.4;">${escapeHTML(n.message)}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${n.time.toLocaleTimeString()}</div>
            </div>
        </div>
    `).join('');
}

/**
 * showUserDetail: La "Ficha Maestra" del sistema.
 * 
 * [ESTUDIO: AGREGACIÓN DE DATOS]
 * Un perfil de usuario es aburrido sin contexto. Esta función consulta:
 * 1. Dispositivos (Laptops, Tablets).
 * 2. Vehículos vinculados.
 * 3. Últimos movimientos (Logs).
 * Luego une toda esa información en una vista unificada para el administrador.
 */
async function showUserDetail(userId) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const saveBtn = document.getElementById('btnSave');

    title.textContent = "Centro de Inteligencia de Identidad - Ficha Maestra";
    saveBtn.style.display = 'none'; // Vista de solo lectura para auditoría

    body.innerHTML = `<div class="loading-spinner"></div> Cruzando bases de datos...`;
    overlay.style.display = 'flex';
    overlay.classList.add('active');

    try {
        // Buscamos al usuario en la data actual (currentData) o lo pedimos al servidor si no está
        let user = currentData.find(u => Number(u.id) === Number(userId));

        if (!user) {
            const uRes = await apiRequest(`/usuarios/${userId}`);
            if (uRes.ok) user = uRes.data.data || uRes.data;
        }

        if (!user) throw new Error("Usuario no encontrado");

        const [dRes, aRes] = await Promise.all([
            apiRequest('/dispositivos'),
            apiRequest('/accesos')
        ]);

        const allDevices = dRes.data.data || dRes.data;
        const allAccess = aRes.data.data || aRes.data;

        const userVehicles = allDevices.filter(d => d.usuario_id === userId && d.medio_transporte_id);
        const userTech = allDevices.filter(d => d.usuario_id === userId && !d.medio_transporte_id);
        const userHistory = allAccess.filter(a => a.usuario_id === userId).slice(0, 5);

        body.innerHTML = `
            <div style="display:grid; grid-template-columns: 80px 1fr; gap:20px; text-align:left; border-bottom:1px solid var(--border-color); padding-bottom:20px; margin-bottom:20px;">
                <div class="user-avatar" style="width:70px; height:70px; font-size:28px;">
                    ${user.foto_url ? `<img src="${user.foto_url}" style="width:100%; border-radius:12px;">` : user.nombre.charAt(0)}
                </div>
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div>
                            <h2 style="color:var(--text-primary); margin:0; font-size:20px;">${user.nombre} ${user.apellido}</h2>
                            <p style="color:var(--accent-blue); font-weight:600; font-size:13px; margin:2px 0;">${user.email}</p>
                        </div>
                        <button class="btn-table btn-edit" id="btnEditFromDetail" style="padding: 5px 10px;">✏️ Editar Perfil</button>
                    </div>
                    <span class="badge badge-info" style="font-size:10px;">${user.rol_id === 1 ? 'Administrador' : (user.rol_id === 3 ? 'Seguridad' : 'Residente')}</span>
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; text-align:left;">
                <div class="card" style="background:rgba(255,255,255,0.02); padding:15px; border:1px solid var(--border-color);">
                    <h4 style="margin-bottom:12px; font-size:14px; display:flex; justify-content:space-between;">
                        🚗 Vehículos 
                        <button class="btn-table" onclick="window.closeModal(); showModal('vehiculos')" style="font-size:10px; padding:2px 5px;">+ Añadir</button>
                    </h4>
                    ${userVehicles.length ? userVehicles.map(v => `
                        <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:8px; margin-bottom:6px; border:1px solid var(--border-color);">
                            <div style="font-weight:600; font-size:12px;">${v.nombre}</div>
                            <div style="color:var(--accent-green); font-size:11px; font-family:monospace;">Placa: ${v.identificador_unico}</div>
                        </div>
                    `).join('') : `
                        <div style="text-align:center; padding:10px; opacity:0.6;">
                            <p style="font-size:11px; margin-bottom:10px;">No tiene vehículos registrados</p>
                            <button class="btn-table" onclick="window.closeModal(); showModal('vehiculos')" style="width:100%; border:1px dashed var(--accent-green); color:var(--accent-green);">Vincular primer vehículo</button>
                        </div>
                    `}
                </div>
                <div class="card" style="background:rgba(255,255,255,0.02); padding:15px; border:1px solid var(--border-color);">
                    <h4 style="margin-bottom:12px; font-size:14px; display:flex; justify-content:space-between;">
                        💻 Equipos Tech
                        <button class="btn-table" onclick="window.closeModal(); showModal('dispositivos')" style="font-size:10px; padding:2px 5px;">+ Añadir</button>
                    </h4>
                    ${userTech.length ? userTech.map(t => `
                        <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:8px; margin-bottom:6px; border:1px solid var(--border-color);">
                            <div style="font-weight:600; font-size:12px;">${t.nombre}</div>
                            <div style="opacity:0.6; font-size:10px;">SN: ${t.identificador_unico}</div>
                        </div>
                    `).join('') : `
                        <div style="text-align:center; padding:10px; opacity:0.6;">
                            <p style="font-size:11px; margin-bottom:10px;">Sin equipos tecnológicos</p>
                            <button class="btn-table" onclick="window.closeModal(); showModal('dispositivos')" style="width:100%; border:1px dashed var(--accent-blue); color:var(--accent-blue);">Vincular laptop/tablet</button>
                        </div>
                    `}
                </div>
            </div>

            <div style="margin-top:20px; text-align:left;">
                <h4 style="margin-bottom:10px; font-size:14px;">🚪 Últimos Movimientos</h4>
                <div class="data-table-container">
                    <table style="font-size:11px;">
                        <thead><tr><th>Fecha</th><th>Tipo</th><th>Observaciones</th></tr></thead>
                        <tbody>
                            ${userHistory.length ? userHistory.map(h => `
                                <tr>
                                    <td>${new Date(h.fecha_hora).toLocaleDateString()}</td>
                                    <td><span class="badge ${h.tipo === 'Entrada' ? 'badge-success' : 'badge-info'}" style="font-size:9px; padding:2px 6px;">${h.tipo}</span></td>
                                    <td style="opacity:0.7;">${h.observaciones || 'Ingreso registrado'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="3" style="text-align:center; padding:15px; opacity:0.5;">No registra movimientos recientes</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <button class="btn-table" onclick="window.closeModal()" style="width:100%; margin-top:20px; background:var(--bg-secondary); border:1px solid var(--border-color);">${userData.rol_id === 2 ? 'Cerrar Mi Información' : 'Cerrar Ficha Maestra'}</button>
`;

        // Vincular botón editar dentro del detalle
        const btnEditDetail = document.getElementById('btnEditFromDetail');
        if (btnEditDetail) btnEditDetail.onclick = () => { window.closeModal(); showModal('usuarios', user); };

    } catch (e) {
        body.innerHTML = `<p style="color:var(--error-color)">Error al cargar la ficha técnica.</p>`;
        console.error(e);
    }
}

/**
 * Renderiza el módulo de escáner integrado en el dashboard
 */
let html5QrCode = null;

async function renderScanner(container) {
    container.innerHTML = `
        <div class="card glass-glow animate-row" style="max-width: 600px; margin: 0 auto; padding: 25px; text-align: center;">
            <div id="reader-container" style="position: relative; border-radius: 16px; overflow: hidden; background: #000; min-height: 300px;">
                <div id="reader" style="width: 100%;"></div>
                <div id="scanner-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; border: 2px dashed rgba(16, 185, 129, 0.5); box-sizing: border-box; display: flex; align-items: center; justify-content: center;">
                    <div style="width: 200px; height: 200px; border: 2px solid var(--accent-green); position: relative;">
                        <div style="position: absolute; width: 100%; height: 2px; background: var(--accent-green); top: 0; animation: scanAnim 2s infinite linear;"></div>
                    </div>
                </div>
            </div>

            <div id="scan-result" style="display:none; margin-top:25px; animation: fadeInUp 0.4s ease;">
                <div id="scan-user-photo" style="width:100px; height:100px; margin:0 auto 15px; border-radius:50%; border:3px solid var(--accent-green); overflow:hidden; background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; font-size:40px;">👤</div>
                <h3 id="scan-user-name" style="margin-bottom:5px;">-</h3>
                <p id="scan-user-type" style="color:var(--text-muted); font-size:14px; margin-bottom:15px;">-</p>
                <div class="badge badge-success" style="font-size:14px; padding:10px;">Acceso Autorizado</div>
                <button class="btn-primary" onclick="window.startDashboardScanner()" style="margin-top:20px;">Siguiente Escaneo</button>
            </div>

            <div id="scan-error" style="display:none; margin-top:25px; color:var(--error-color); background:rgba(244, 63, 94, 0.1); padding:15px; border-radius:12px; border:1px solid var(--error-color);">
                <p id="scan-error-msg">Error</p>
                <button class="btn-secondary" onclick="window.startDashboardScanner()" style="margin-top:15px; width:auto; padding:8px 16px;">Reintentar</button>
            </div>
            
            <p id="scanner-status" style="margin-top:15px; font-size:12px; color:var(--text-muted);">Iniciando cámara...</p>
        </div>
    <style>
        @keyframes scanAnim {
            0% { top: 0; }
            100% { top: 100%; }
        }
    </style>
`;

    window.startDashboardScanner = startDashboardScanner;
    setTimeout(startDashboardScanner, 500);
}

async function startDashboardScanner() {
    const status = document.getElementById('scanner-status');
    const resultDiv = document.getElementById('scan-result');
    const errorDiv = document.getElementById('scan-error');
    const readerDiv = document.getElementById('reader-container');

    if (resultDiv) resultDiv.style.display = 'none';
    if (errorDiv) errorDiv.style.display = 'none';
    if (readerDiv) readerDiv.style.display = 'block';

    try {
        if (html5QrCode) {
            await html5QrCode.stop().catch(() => { });
            html5QrCode = null;
        }

        html5QrCode = new Html5Qrcode("reader");
        await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 250, height: 250 } },
            async (decodedText) => {
                await html5QrCode.stop();
                processDashboardScan(decodedText);
            }
        );
        if (status) status.textContent = "Cámara activa - Escaneando...";
    } catch (err) {
        if (status) status.textContent = "Error al acceder a la cámara";
        console.error(err);
    }
}

async function processDashboardScan(scanData) {
    const resultDiv = document.getElementById('scan-result');
    const errorDiv = document.getElementById('scan-error');
    const readerDiv = document.getElementById('reader-container');
    const status = document.getElementById('scanner-status');

    if (readerDiv) readerDiv.style.display = 'none';
    if (status) status.style.display = 'none';

    const res = await apiRequest('/accesos/scan', 'POST', { scanData });

    if (res.ok) {
        const data = res.data.data;
        document.getElementById('scan-user-name').textContent = data.nombre;
        document.getElementById('scan-user-type').textContent = data.esInvitado ? 'Invitado' : 'Usuario Permanente';

        const photoEl = document.getElementById('scan-user-photo');
        if (data.foto) {
            photoEl.innerHTML = `<img src="${data.foto}" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            photoEl.textContent = data.nombre.charAt(0).toUpperCase();
        }

        resultDiv.style.display = 'block';
    } else {
        errorDiv.style.display = 'block';
        document.getElementById('scan-error-msg').textContent = res.data?.error || 'QR inválido';
    }
}

// Global Exports
window.showUserDetail = showUserDetail;
window.closeModal = closeModal;
window.startDashboardScanner = startDashboardScanner;
window.loadView = loadView;
window.handleLogout = handleLogout;
window.showModal = showModal;

/**
 * renderHelpCenter: Centro de Ayuda Interactivo.
 * 
 * Muestra guías por rol, información sobre la app, y preguntas frecuentes.
 * Se adapta al rol del usuario activo.
 */
function renderHelpCenter(container) {
    const role = userData?.rol_id || 2;
    const roleName = role === 1 ? 'Administrador' : (role === 3 ? 'Seguridad' : 'Residente');

    container.innerHTML = `
        <div class="help-center">
            <!-- Hero -->
            <div class="help-hero">
                <div class="help-hero-icon">📖</div>
                <h2>Centro de Ayuda Passly</h2>
                <p>Encuentra guías, tutoriales y respuestas a todas tus preguntas sobre el sistema de control de acceso.</p>
                <div class="help-quick-actions">
                    <div class="help-pill" data-scroll="help-about">🏠 ¿Qué es Passly?</div>
                    <div class="help-pill" data-scroll="help-role-guide">🎯 Guía para mi Rol</div>
                    <div class="help-pill" data-scroll="help-features">⚡ Funciones Clave</div>
                    <div class="help-pill" data-scroll="help-faq">❓ Preguntas Frecuentes</div>
                </div>
            </div>

            <!-- Sección 1: ¿Qué es Passly? -->
            <div class="help-section open" id="help-about">
                <div class="help-section-header">
                    <div class="help-section-icon" style="background: hsla(150, 70%, 45%, 0.12); color: hsla(150, 70%, 45%, 1);">🛡️</div>
                    <div>
                        <h3>¿Qué es Passly?</h3>
                        <div class="help-section-desc">Conoce la plataforma de control de acceso inteligente</div>
                    </div>
                    <span class="help-section-chevron">▼</span>
                </div>
                <div class="help-section-body">
                    <div class="help-section-content">
                        <p><strong>Passly</strong> es un sistema de control de acceso inteligente diseñado para copropiedades, conjuntos residenciales y empresas. Digitaliza completamente la gestión de entradas y salidas, eliminando los registros en papel y los procesos manuales lentos.</p>
                        <p>Con Passly puedes:</p>
                        <ul>
                            <li><span class="step-num">✓</span> Controlar accesos en tiempo real con notificaciones instantáneas</li>
                            <li><span class="step-num">✓</span> Generar códigos QR dinámicos para residentes e invitados temporales</li>
                            <li><span class="step-num">✓</span> Proteger cuentas con Autenticación de Dos Factores (MFA/2FA)</li>
                            <li><span class="step-num">✓</span> Visualizar estadísticas y analíticas de tráfico en tiempo real</li>
                            <li><span class="step-num">✓</span> Gestionar usuarios, dispositivos y vehículos desde un solo panel</li>
                            <li><span class="step-num">✓</span> Exportar reportes profesionales en CSV y PDF</li>
                        </ul>
                        <div class="help-tip-box">
                            <span>💡</span>
                            <span>Passly funciona como una <strong>Progressive Web App (PWA)</strong>, lo que significa que puedes instalarla en tu celular como una app nativa desde el navegador.</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sección 2: Guía por Rol -->
            <div class="help-section" id="help-role-guide">
                <div class="help-section-header">
                    <div class="help-section-icon" style="background: hsla(220, 90%, 65%, 0.12); color: hsla(220, 90%, 65%, 1);">🎯</div>
                    <div>
                        <h3>Guía según tu Rol</h3>
                        <div class="help-section-desc">Actualmente estás como: <strong style="color:var(--accent-primary)">${roleName}</strong></div>
                    </div>
                    <span class="help-section-chevron">▼</span>
                </div>
                <div class="help-section-body">
                    <div class="help-section-content">
                        <p>Selecciona un rol para ver la guía específica de sus funciones y permisos:</p>
                        <div class="help-role-grid">
                            <div class="help-role-card ${role === 1 ? 'selected' : ''}" data-role="admin">
                                <span class="help-role-emoji">👨‍💼</span>
                                <h4>Administrador</h4>
                                <p>Control total del sistema, usuarios, configuración y auditoría</p>
                            </div>
                            <div class="help-role-card ${role === 2 ? 'selected' : ''}" data-role="residente">
                                <span class="help-role-emoji">🏠</span>
                                <h4>Residente</h4>
                                <p>Gestión personal, QR propio, invitados y vehículos</p>
                            </div>
                            <div class="help-role-card ${role === 3 ? 'selected' : ''}" data-role="seguridad">
                                <span class="help-role-emoji">🔒</span>
                                <h4>Seguridad</h4>
                                <p>Monitoreo en vivo, escaneo QR y registro de accesos</p>
                            </div>
                        </div>
                        <div id="help-role-detail"></div>
                    </div>
                </div>
            </div>

            <!-- Sección 3: Funciones Clave -->
            <div class="help-section" id="help-features">
                <div class="help-section-header">
                    <div class="help-section-icon" style="background: hsla(280, 50%, 60%, 0.12); color: hsla(280, 50%, 60%, 1);">⚡</div>
                    <div>
                        <h3>Funciones y Módulos</h3>
                        <div class="help-section-desc">Aprende a usar cada función del sistema paso a paso</div>
                    </div>
                    <span class="help-section-chevron">▼</span>
                </div>
                <div class="help-section-body">
                    <div class="help-section-content">
                        <h4 style="margin-bottom:16px; font-size:15px; color:var(--text-primary);">📲 Inicio de Sesión</h4>
                        <ul>
                            <li><span class="step-num">1</span> Ingresa tu correo electrónico y contraseña en la pantalla de login</li>
                            <li><span class="step-num">2</span> Selecciona tu nivel de autorización (Administrador, Residente o Seguridad)</li>
                            <li><span class="step-num">3</span> Si tienes MFA activado, ingresa el código de 6 dígitos de tu app autenticadora</li>
                        </ul>

                        <h4 style="margin-bottom:16px; margin-top:24px; font-size:15px; color:var(--text-primary);">🔑 Recuperación de Contraseña</h4>
                        <ul>
                            <li><span class="step-num">1</span> Haz clic en "¿Olvidaste tu contraseña?" en la pantalla de login</li>
                            <li><span class="step-num">2</span> Ingresa el correo registrado y recibirás un código de 6 dígitos (válido por 15 minutos)</li>
                            <li><span class="step-num">3</span> Ingresa el código y tu nueva contraseña para restablecer el acceso</li>
                        </ul>

                        <h4 style="margin-bottom:16px; margin-top:24px; font-size:15px; color:var(--text-primary);">📊 Dashboard (Resumen)</h4>
                        <ul>
                            <li><span class="step-num">→</span> El panel superior muestra estadísticas en tiempo real: usuarios activos, accesos del día, dispositivos y alertas</li>
                            <li><span class="step-num">→</span> La tabla "Actividad en Tiempo Real" se actualiza automáticamente vía WebSockets</li>
                            <li><span class="step-num">→</span> La gráfica de tendencias muestra las horas con más tráfico del día</li>
                        </ul>

                        <h4 style="margin-bottom:16px; margin-top:24px; font-size:15px; color:var(--text-primary);">📷 Sistema QR</h4>
                        <ul>
                            <li><span class="step-num">→</span> <strong>QR Personal:</strong> Genera tu llave digital desde el dashboard → "Generar Llave Segura" → Descárgala</li>
                            <li><span class="step-num">→</span> <strong>Invitación QR:</strong> En "Accesos" → "+ Manual" → Ingresa nombre y email del invitado → Selecciona duración</li>
                            <li><span class="step-num">→</span> <strong>Escáner QR:</strong> Ve al Terminal QR → Permite acceso a la cámara → Apunta al código QR</li>
                        </ul>

                        <h4 style="margin-bottom:16px; margin-top:24px; font-size:15px; color:var(--text-primary);">🔐 Autenticación MFA (2FA)</h4>
                        <ul>
                            <li><span class="step-num">1</span> Ve a "Escudo 2FA" en el menú lateral</li>
                            <li><span class="step-num">2</span> Haz clic en "CONFIGURAR" para generar un código QR de vinculación</li>
                            <li><span class="step-num">3</span> Escanea el QR con tu app autenticadora (Google Authenticator, Authy)</li>
                            <li><span class="step-num">4</span> Ingresa el código de verificación de 6 dígitos para activar la protección</li>
                        </ul>

                        <h4 style="margin-bottom:16px; margin-top:24px; font-size:15px; color:var(--text-primary);">📄 Exportación de Reportes</h4>
                        <ul>
                            <li><span class="step-num">CSV</span> En "Historial de Accesos" → Haz clic en el ícono de hoja de cálculo → Se descarga un archivo .csv para Excel</li>
                            <li><span class="step-num">PDF</span> En "Historial de Accesos" → Haz clic en el ícono de documento → Se genera un PDF profesional con el logo de Passly</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Sección 4: Preguntas Frecuentes -->
            <div class="help-section" id="help-faq">
                <div class="help-section-header">
                    <div class="help-section-icon" style="background: hsla(40, 90%, 55%, 0.12); color: hsla(40, 90%, 55%, 1);">❓</div>
                    <div>
                        <h3>Preguntas Frecuentes</h3>
                        <div class="help-section-desc">Respuestas rápidas a las dudas más comunes</div>
                    </div>
                    <span class="help-section-chevron">▼</span>
                </div>
                <div class="help-section-body">
                    <div class="help-section-content">
                        <div class="help-faq-item">
                            <div class="help-faq-question">
                                <span>¿Cómo cambio mi contraseña?</span>
                                <span class="help-faq-chevron">▼</span>
                            </div>
                            <div class="help-faq-answer">Puedes cambiar tu contraseña desde la pantalla de login haciendo clic en "¿Olvidaste tu contraseña?". Recibirás un código de 6 dígitos en tu correo electrónico (válido por 15 minutos) para restablecer tu clave.</div>
                        </div>

                        <div class="help-faq-item">
                            <div class="help-faq-question">
                                <span>¿Cómo activo la autenticación de dos factores (MFA)?</span>
                                <span class="help-faq-chevron">▼</span>
                            </div>
                            <div class="help-faq-answer">Ve al menú lateral → "Escudo 2FA" → Haz clic en "CONFIGURAR" → Escanea el código QR con Google Authenticator o Authy → Ingresa el código de 6 dígitos que genera la app para verificar y activar la protección.</div>
                        </div>

                        <div class="help-faq-item">
                            <div class="help-faq-question">
                                <span>¿Cómo genero mi código QR personal?</span>
                                <span class="help-faq-chevron">▼</span>
                            </div>
                            <div class="help-faq-answer">En el Dashboard (Resumen), localiza la sección "LLAVE DIGITAL (MFA)" y haz clic en "GENERAR LLAVE SEGURA". Tu QR aparecerá instantáneamente y podrás descargarlo como imagen haciendo clic en el botón de descarga.</div>
                        </div>

                        <div class="help-faq-item">
                            <div class="help-faq-question">
                                <span>¿Cómo invito a un visitante temporal?</span>
                                <span class="help-faq-chevron">▼</span>
                            </div>
                            <div class="help-faq-answer">Ve a "Historial de Accesos" → Haz clic en "+ Manual" → Selecciona la pestaña "Nuevo Invitado (QR)" → Ingresa el nombre y email del invitado → Selecciona la duración (desde 4 horas hasta 1 semana) → El invitado recibirá un correo automático con su QR de acceso temporal.</div>
                        </div>

                        <div class="help-faq-item">
                            <div class="help-faq-question">
                                <span>¿Qué hago si el escáner QR no reconoce mi código?</span>
                                <span class="help-faq-chevron">▼</span>
                            </div>
                            <div class="help-faq-answer">Asegúrate de que: 1) La cámara tiene permiso de acceso al navegador, 2) El código QR no está borroso o dañado, 3) Tu QR no ha expirado (los QR de invitados tienen fecha de vencimiento), 4) Hay suficiente iluminación. Si el problema persiste, genera un nuevo QR desde el dashboard.</div>
                        </div>

                        <div class="help-faq-item">
                            <div class="help-faq-question">
                                <span>¿Cómo registro un vehículo nuevo?</span>
                                <span class="help-faq-chevron">▼</span>
                            </div>
                            <div class="help-faq-answer">Ve al menú lateral → "Gestión de Vehículos" (o "Flota") → Haz clic en "+ Vehículo" → Completa los datos: tipo (Auto, Moto, Bicicleta), placa o identificador, y asigna al propietario.</div>
                        </div>

                        <div class="help-faq-item">
                            <div class="help-faq-question">
                                <span>¿Puedo exportar los reportes de acceso?</span>
                                <span class="help-faq-chevron">▼</span>
                            </div>
                            <div class="help-faq-answer">¡Sí! Ve a "Historial de Accesos" y encontrarás dos botones de exportación: el ícono de hoja de cálculo verde genera un archivo <strong>CSV</strong> que puedes abrir en Excel. El ícono de documento rojo genera un <strong>PDF profesional</strong> con el logo de Passly y formato corporativo.</div>
                        </div>

                        <div class="help-faq-item">
                            <div class="help-faq-question">
                                <span>¿Qué significan los roles del sistema?</span>
                                <span class="help-faq-chevron">▼</span>
                            </div>
                            <div class="help-faq-answer"><strong>Administrador:</strong> Control total del sistema, puede gestionar usuarios, ver auditorías, configurar la sede y todos los módulos. <strong>Residente:</strong> Gestión personal (su perfil, vehículos, dispositivos, QR e historial propio). <strong>Seguridad:</strong> Monitoreo en vivo, escaneo de QR, búsqueda de usuarios y dispositivos, registro de accesos.</div>
                        </div>

                        <div class="help-faq-item">
                            <div class="help-faq-question">
                                <span>¿Cómo cambio entre modo oscuro y claro?</span>
                                <span class="help-faq-chevron">▼</span>
                            </div>
                            <div class="help-faq-answer">Puedes cambiar el tema visual haciendo clic en el botón "MODO NOCHE/DÍA" que se encuentra en la parte inferior del menú lateral. Tu preferencia se guardará automáticamente para futuras sesiones.</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer info -->
            <div style="text-align:center; padding:24px 0 48px; color:var(--text-muted); font-size:13px;">
                <p>¿No encontraste lo que buscabas? Contacta al administrador del sistema.</p>
                <p style="margin-top:8px; font-size:11px; opacity:0.6;">Passly v2.0 · Centro de Ayuda</p>
            </div>
        </div>
    `;

    // Initialize help center interactivity
    initHelpCenterEvents(container);

    // Auto-show role detail for current user's role
    const roleMap = { 1: 'admin', 2: 'residente', 3: 'seguridad' };
    showRoleDetail(roleMap[role] || 'residente');
}

/**
 * Initializes all interactive events for the Help Center:
 * - Accordion sections
 * - Quick-action pills
 * - Role cards
 * - FAQ expand/collapse
 */
function initHelpCenterEvents(container) {
    // Accordion sections
    container.querySelectorAll('.help-section-header').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.parentElement;
            section.classList.toggle('open');
        });
    });

    // Quick pills scroll
    container.querySelectorAll('.help-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const targetId = pill.getAttribute('data-scroll');
            const target = document.getElementById(targetId);
            if (target) {
                // Open the section
                if (!target.classList.contains('open')) {
                    target.classList.add('open');
                }
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // Active state on pill
                container.querySelectorAll('.help-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            }
        });
    });

    // Role cards
    container.querySelectorAll('.help-role-card').forEach(card => {
        card.addEventListener('click', () => {
            container.querySelectorAll('.help-role-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            showRoleDetail(card.getAttribute('data-role'));
        });
    });

    // FAQ accordion
    container.querySelectorAll('.help-faq-item').forEach(item => {
        item.addEventListener('click', () => {
            item.classList.toggle('open');
        });
    });
}

/**
 * Shows the detailed guide for a specific role.
 */
function showRoleDetail(role) {
    const detailContainer = document.getElementById('help-role-detail');
    if (!detailContainer) return;

    const guides = {
        admin: {
            emoji: '👨‍💼',
            title: 'Guía del Administrador',
            intro: 'Como Administrador, tienes control total del sistema Passly. Puedes gestionar todos los usuarios, dispositivos, vehículos, configuraciones y acceder a los registros de auditoría.',
            sections: [
                {
                    subtitle: '📋 Panel de Control',
                    items: [
                        'Visualiza estadísticas en tiempo real: usuarios activos, accesos del día, alertas del sistema',
                        'Monitorea la gráfica de tráfico por horas para identificar picos de actividad',
                        'Accede rápidamente a cualquier módulo desde las tarjetas de estadísticas'
                    ]
                },
                {
                    subtitle: '👥 Gestión de Identidades',
                    items: [
                        'Crea nuevos usuarios con el botón "+ Usuario" asignando nombre, email, rol y contraseña',
                        'Edita datos de cualquier usuario con el ícono de lápiz (✏️)',
                        'Inspecciona fichas detalladas con el ícono de lupa (🔍)',
                        'Desactiva usuarios (soft delete) sin perder su historial'
                    ]
                },
                {
                    subtitle: '📊 Auditoría y Reportes',
                    items: [
                        'Revisa el registro completo de auditoría en "Auditoría" (logs del sistema)',
                        'Exporta historial de accesos en formato CSV para análisis en Excel',
                        'Genera reportes PDF profesionales con logo y formato corporativo'
                    ]
                }
            ],
            tip: 'Como administrador, te recomendamos activar el MFA (2FA) en tu cuenta para máxima seguridad. También revisa periódicamente los logs de auditoría para detectar actividad sospechosa.'
        },
        residente: {
            emoji: '🏠',
            title: 'Guía del Residente',
            intro: 'Como Residente, puedes gestionar tu información personal, tus vehículos, dispositivos tecnológicos y generar tu código QR de acceso.',
            sections: [
                {
                    subtitle: '🏠 Tu Panel Personal',
                    items: [
                        'Visualiza tu estado de identidad verificada y tus estadísticas del día',
                        'Revisa tus dispositivos y vehículos registrados desde las tarjetas resumen',
                        'Genera y descarga tu Llave Digital (QR) para acceso rápido'
                    ]
                },
                {
                    subtitle: '🚗 Mis Vehículos y Equipos',
                    items: [
                        'Registra tus vehículos (auto, moto, bicicleta) con placa e identificador',
                        'Añade tus dispositivos tecnológicos (portátiles, tablets, etc.)',
                        'Edita o elimina tus registros cuando sea necesario'
                    ]
                },
                {
                    subtitle: '📱 Acceso QR e Invitados',
                    items: [
                        'Genera tu QR personal desde el dashboard y descárgalo para usarlo',
                        'Crea invitaciones QR temporales para visitantes con fecha de expiración',
                        'El invitado recibirá automáticamente un correo con su QR de acceso'
                    ]
                }
            ],
            tip: 'Mantén tu QR personal actualizado y descárgalo en tu celular para un acceso más rápido. Si cambias de dispositivo, genera un nuevo QR desde el dashboard.'
        },
        seguridad: {
            emoji: '🔒',
            title: 'Guía del Personal de Seguridad',
            intro: 'Como Personal de Seguridad, tu rol principal es monitorear accesos en tiempo real, escanear códigos QR y garantizar que solo personas autorizadas ingresen a las instalaciones.',
            sections: [
                {
                    subtitle: '📡 Monitoreo en Vivo',
                    items: [
                        'El dashboard muestra accesos en tiempo real actualizados vía WebSockets',
                        'Las alertas del sistema te notifican eventos importantes instantáneamente',
                        'La gráfica de tráfico te ayuda a anticipar horarios de mayor afluencia'
                    ]
                },
                {
                    subtitle: '📷 Terminal de Escaneo QR',
                    items: [
                        'Abre "Cámara Escáner" desde el menú lateral para iniciar el escaneo',
                        'Permite el acceso a la cámara cuando el navegador lo solicite',
                        'Apunta la cámara al código QR del visitante o residente',
                        'El sistema validará automáticamente si el QR es válido y registrará el acceso'
                    ]
                },
                {
                    subtitle: '🔍 Búsqueda Rápida',
                    items: [
                        'Busca usuarios por nombre o email en "Identidades"',
                        'Consulta dispositivos y vehículos registrados en modo solo lectura',
                        'Revisa el historial de accesos recientes para verificar entradas'
                    ]
                }
            ],
            tip: 'Si un QR no es reconocido, pide al visitante que regenere su código o contacta al administrador. Recuerda que los QR de invitados tienen fecha de expiración automática.'
        }
    };

    const guide = guides[role];
    if (!guide) return;

    detailContainer.innerHTML = `
        <div class="help-role-detail">
            <h4>${guide.emoji} ${guide.title}</h4>
            <p style="font-size:14px; color:var(--text-secondary); line-height:1.7; margin-bottom:20px;">${guide.intro}</p>
            ${guide.sections.map(sec => `
                <h5 style="font-size:14px; font-weight:700; margin:20px 0 12px; color:var(--text-primary);">${sec.subtitle}</h5>
                <ul>
                    ${sec.items.map((item, i) => `
                        <li><span class="step-num">${i + 1}</span> ${item}</li>
                    `).join('')}
                </ul>
            `).join('')}
            <div class="help-tip-box">
                <span>💡</span>
                <span>${guide.tip}</span>
            </div>
        </div>
    `;
}
