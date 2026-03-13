/**
 * @file dashboard.js
 * @description Controlador principal del Panel de Control (Dashboard) de Passly.
 * Maneja la navegación entre módulos, carga de datos dinámica, WebSockets y gestión de sesión.
 */
import { apiRequest, checkAuth, handleLogout } from './api.js';
import { initTheme } from './theme.js';
import { showToast, escapeHTML, validarEmail, validarPassword } from './utils.js';

let userData = null;          // Datos del usuario logueado
let currentData = [];         // Datos del módulo actual para filtrado/búsqueda
let currentView = 'overview'; // Nombre de la vista activa
let currentPagination = null; // Metadatos de paginación de la última respuesta
let notifications = [];       // Almacena notificaciones recibidas por websocket

// Exposición al objeto global 'window' para que los botones con onclick en HTML funcionen con módulos ES
window.closeModal = closeModal;
window.loadView = loadView;
window.handleLogout = handleLogout;
window.showModal = showModal;
window.showUserDetail = (id) => showUserDetail(id);

/**
 * CICLO DE VIDA INICIAL:
 * Se ejecuta cuando el navegador termina de procesar el HTML.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar seguridad: ¿Hay un usuario autenticado?
    userData = checkAuth();
    if (!userData) return; // checkAuth se encarga de redirigir al login si no hay token

    // 2. Inicializar componentes visuales
    initTheme();          // Cargar modo oscuro/claro preferido
    setupUI();            // Personalizar el Sidebar con el nombre y rol del usuario
    setupSidebarToggle(); // Permitir colapsar el menú lateral

    // 3. Cargar la vista por defecto (Resumen)
    await loadView('overview');

    // 4. Conectar WebSockets para actualizaciones en tiempo real
    setupSocket();
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
 * Personaliza los elementos de la interfaz según el perfil del usuario.
 */
function setupUI() {
    if (!userData) return;

    const navMenu = document.querySelector('.nav-menu');
    navMenu.innerHTML = ''; // Limpiar previo

    const role = userData.rol_id;

    // Inyección dinámica de cabeceras en el menú
    const opHeader = document.createElement('div');
    opHeader.className = 'nav-section';
    opHeader.textContent = role === 2 ? 'Mis Datos' : 'Gestión Principal';
    navMenu.appendChild(opHeader);

    // Vistas según rol
    let views = [];
    if (role === 1) { // Admin
        views = [
            { id: 'overview', icon: '📊', text: 'Inicio' },
            { id: 'usuarios', icon: '👥', text: 'Usuarios' },
            { id: 'dispositivos', icon: '📱', text: 'Dispositivos' },
            { id: 'vehiculos', icon: '🚗', text: 'Vehículos' },
            { id: 'accesos', icon: '🚪', text: 'Accesos' }
        ];
    } else if (role === 3) { // Seguridad
        views = [
            { id: 'overview', icon: '📊', text: 'Inicio' },
            { id: 'accesos', icon: '🚪', text: 'Accesos' }
        ];
    } else { // Usuario
        views = [
            { id: 'overview', icon: '📊', text: 'Mi Resumen' },
            { id: 'dispositivos', icon: '📱', text: 'Mis Dispositivos' },
            { id: 'vehiculos', icon: '🚗', text: 'Mis Vehículos' },
            { id: 'accesos', icon: '🚪', text: 'Mis Accesos' }
        ];
    }

    views.forEach(v => {
        const div = document.createElement('div');
        div.className = 'nav-item';
        div.dataset.view = v.id;
        div.innerHTML = `<i>${v.icon}</i> <span class="nav-text">${v.text}</span>`;
        div.onclick = (e) => { e.preventDefault(); loadView(v.id); };
        navMenu.appendChild(div);
    });

    // Menú de escáner para Admin y Seguridad
    if (role === 1 || role === 3) {
        const terminalHeader = document.createElement('div');
        terminalHeader.className = 'nav-section';
        terminalHeader.style.marginTop = '20px';
        terminalHeader.textContent = 'Terminales';
        navMenu.appendChild(terminalHeader);

        const scannerBtn = document.createElement('div');
        scannerBtn.className = 'nav-item';
        scannerBtn.innerHTML = '<i>📷</i> <span class="nav-text">Escáner QR</span>';
        scannerBtn.style.background = 'rgba(41, 121, 255, 0.1)';
        scannerBtn.style.color = 'var(--accent-blue)';
        scannerBtn.onclick = () => window.open('scanner.html', '_blank');
        navMenu.appendChild(scannerBtn);
    }

    // Seguridad y Logs
    const sysHeader = document.createElement('div');
    sysHeader.className = 'nav-section';
    sysHeader.textContent = role === 1 ? 'Seguridad y Logs' : 'Ajustes de Cuenta';
    navMenu.appendChild(sysHeader);

    if (role === 1) {
        const auditBtn = document.createElement('div');
        auditBtn.className = 'nav-item';
        auditBtn.dataset.view = 'logs';
        auditBtn.innerHTML = `<i>📋</i> <span class="nav-text">Auditoría</span>`;
        auditBtn.onclick = (e) => { e.preventDefault(); loadView('logs'); };
        navMenu.appendChild(auditBtn);
    }

    const profBtn = document.createElement('div');
    profBtn.className = 'nav-item';
    profBtn.dataset.view = 'perfil';
    profBtn.innerHTML = `<i>👤</i> <span class="nav-text">Mi Perfil</span>`;
    profBtn.onclick = (e) => { e.preventDefault(); loadView('perfil'); };
    navMenu.appendChild(profBtn);

    const secBtn = document.createElement('div');
    secBtn.className = 'nav-item';
    secBtn.dataset.view = 'security';
    secBtn.innerHTML = `<i>🛡️</i> <span class="nav-text">Seguridad</span>`;
    secBtn.onclick = (e) => { e.preventDefault(); loadView('security'); };
    navMenu.appendChild(secBtn);

    const nombre = userData.nombre || 'Usuario';
    const apellido = userData.apellido || '';

    // Mostrar nombre completo y avatar (o inicial)
    document.getElementById('userName').textContent = `${nombre} ${apellido}`;
    const avatarEl = document.getElementById('userInitial');
    if (userData.foto_url) {
        avatarEl.innerHTML = `<img src="${userData.foto_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
        avatarEl.textContent = nombre.charAt(0).toUpperCase();
    }

    // Mostrar etiqueta de Rol traducida
    document.getElementById('userRole').textContent =
        userData.rol_id === 1 ? 'Administrador' :
            (userData.rol_id === 3 ? 'Seguridad' : 'Usuario');

    // Botón de Cerrar Sesión con confirmación
    document.querySelector('.sidebar-footer .nav-item').onclick = () => {
        if (confirm('¿Deseas cerrar sesión?')) handleLogout();
    };

    // Botón Limpiar Notificaciones
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
 * NAVEGACIÓN SPA (Single Page Application):
 * Carga el contenido de un módulo dinámicamente en el contenedor central.
 * Evita la recarga de toda la página para una experiencia más fluida.
 * 
 * @param {string} view - Nombre del módulo a cargar
 * @param {boolean} force - Si se debe recargar el contenido incluso si ya está cargado
 */
async function loadView(view, force = false) {
    if (currentView === view && view !== 'overview' && !force) return;
    currentView = view;

    const content = document.getElementById('view-content');
    const title = document.getElementById('view-title');

    // Reset de estilos para animación de entrada
    content.style.opacity = '0';
    content.style.transform = 'translateY(5px)';
    content.style.transition = 'all 0.15s ease-out';

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
                title.textContent = "Mi Perfil";
                await renderMiPerfil(content);
                break;
            case 'security':
                title.textContent = "Seguridad de la Cuenta";
                await renderSecurity(content);
                break;
        }

        // Aparecer suavemente con un pequeño delay para forzar el reflow del navegador
        setTimeout(() => {
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 50);

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

async function renderOverview(container) {
    const [statsRes, trafficRes] = await Promise.all([
        apiRequest('/stats'),
        apiRequest('/stats/traffic')
    ]);

    const stats = statsRes?.data?.stats || { users: 0, accessToday: 0, tech: 0, vehicles: 0, alerts: 0 };
    const recentAccess = (trafficRes?.data?.data || []).slice(0, 5);

    // Ajustar etiquetas según el rol
    const role = userData.rol_id;
    const isUser = role === 2;

    const grid = [
        { label: isUser ? 'Mi Cuenta' : 'Usuarios Activos', val: isUser ? 'Activa' : stats.users, icon: '👥', color: 'var(--accent-blue)' },
        { label: isUser ? 'Mis Accesos Hoy' : 'Accesos Hoy', val: stats.accessToday, icon: '🚪', color: 'var(--accent-green)' },
        { label: isUser ? 'Mis Equipos' : 'Equipos Tech', val: stats.tech, icon: '💻', color: 'var(--accent-lavender)' },
        { label: isUser ? 'Mis Vehículos' : 'Vehículos', val: stats.vehicles, icon: '🚗', color: 'var(--accent-emerald)' }
    ];

    if (role === 1 || role === 3) {
        grid.push({ label: 'Alertas', val: stats.alerts, icon: '⚠️', color: 'var(--error-color)' });
    }

    container.innerHTML = `
        <div class="stats-grid">
            ${grid.map(s => `
                <div class="stat-card glass-glow" style="border-top: 3px solid ${s.color}">
                    <div class="stat-icon" style="color: ${s.color}; background: rgba(255,255,255,0.03);">${s.icon}</div>
                    <div class="stat-info">
                        <h3>${s.label}</h3>
                        <div class="value">${s.val ?? 0}</div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="dashboard-row" style="display: flex; gap: 20px; margin-top: 30px; flex-wrap: wrap;">
            <div class="card glass-glow" style="flex: 1.5; min-width: 300px; padding: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>🚨 Última Actividad</h3>
                    <button class="btn-table" onclick="loadView('accesos')">Ver Todo</button>
                </div>
                <div class="data-table-container">
                    <table>
                        <thead><tr><th>Usuario</th><th>Tipo</th><th>Hora</th></tr></thead>
                        <tbody>
                            ${recentAccess.length ? recentAccess.map((a, index) => `
                                <tr class="animate-row" style="animation-delay: ${index * 0.1}s">
                                    <td>
                                        <div style="display:flex; align-items:center; gap:10px;">
                                            <div class="user-avatar" style="width:25px; height:25px; font-size:10px;">
                                                ${a.usuario_foto ? `<img src="${a.usuario_foto}" style="width:100%; border-radius:50%;">` : (a.usuario_nombre?.charAt(0) || '?')}
                                            </div>
                                            <strong>${escapeHTML(a.usuario_nombre)}</strong>
                                        </div>
                                    </td>
                                    <td><span class="badge ${a.tipo === 'Entrada' ? 'badge-success' : 'badge-info'}">${a.tipo}</span></td>
                                    <td>${new Date(a.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="3">
                                        <div class="empty-state" style="padding: 20px; border:none; background:transparent;">
                                            <div class="empty-state-icon" style="font-size:24px;">🚪</div>
                                            <div class="empty-state-text"><p>No hay actividad hoy</p></div>
                                        </div>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>

            ${role !== 2 ? `
            <div class="card glass-glow" style="flex: 1; min-width: 300px; padding: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>📈 Tráfico</h3>
                    <div class="badge badge-success">● Vivo</div>
                </div>
                <div style="height: 180px;"><canvas id="peakHoursChart"></canvas></div>
            </div>` : ''}

            <div class="card glass-glow" style="flex: 0.8; min-width: 250px; text-align: center; padding: 25px;">
                <h3>🔑 Mi Llave QR</h3>
                <div id="qrContainer" style="width:150px; height:150px; margin:20px auto; border: 2px dashed var(--border-color); border-radius:12px; display:flex; align-items:center; justify-content:center; overflow:hidden; background:white;">
                    <i style="font-size:30px; opacity:0.3; color:#000;">🔲</i>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-table" id="btnGenerateQR" style="flex:1; background:var(--accent-green); color:white;">Generar</button>
                    <button class="btn-table" id="btnDownloadQR" style="flex:1; display:none;">💾 Guardar</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        if (role !== 2) renderPeakHoursChart(trafficRes?.data?.data || []);
        setupQRButton();
    }, 100);
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
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`).slice(6, 22),
            datasets: [{ label: 'Accesos', data: data.slice(6, 22), backgroundColor: 'rgba(46,125,50,0.4)', borderColor: 'rgb(46,125,50)', borderWidth: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function renderModuleHeader(container, config) {
    container.innerHTML = `
        <div class="table-controls">
            <div class="search-container"><i>🔍</i><input type="text" id="moduleSearch" placeholder="${config.searchPlaceholder}"></div>
            ${config.hasDateFilter ? `<div style="display:flex; gap:10px;"><input type="date" id="dateStart"><input type="date" id="dateEnd"></div>` : ''}
            <div class="action-buttons">
                ${config.hasExport ? `
                    <button class="btn-export" id="btnExportCSV" style="background:#107c41; color:white;">📊 Excel/CSV</button>
                    <button class="btn-export" id="btnExportPDF" style="background:#e13028; color:white;">📄 PDF</button>
                ` : ''}
                <button class="btn-table" id="${config.buttonId}" style="background:${config.buttonColor}; color:white;">${config.buttonText}</button>
            </div>
        </div>
    `;
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

async function renderUsuarios(container, page = 1) {
    const search = document.getElementById('moduleSearch')?.dataset.activeSearch || '';
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const { ok, data } = await apiRequest(`/usuarios?page=${page}&limit=20${searchParam}`);
    if (!ok) return;
    currentData = data.data || data;
    currentPagination = data.pagination || null;
    if (page === 1 && !search) {
        renderModuleHeader(container, { buttonId: 'btnAddUser', buttonText: '+ Usuario', buttonColor: 'var(--accent-green)', searchPlaceholder: 'Buscar nombre, email...', module: 'usuarios' });
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

function generateUserTable(data) {
    if (!data.length) return `<div class="empty-state">No hay usuarios</div>`;
    return `<table>
        <thead><tr>
            <th class="sortable" data-sort="foto_url">Foto ↕</th>
            <th class="sortable" data-sort="nombre">Nombre ↕</th>
            <th class="sortable" data-sort="email">Email ↕</th>
            <th class="sortable" data-sort="rol_id">Rol ↕</th>
            <th>Acciones</th>
        </tr></thead>
        <tbody>
            ${data.map(u => `<tr>
                <td><div class="user-avatar" style="width:30px; height:30px;">${u.foto_url ? `<img src="${u.foto_url}" style="width:100%; border-radius:50%;">` : u.nombre.charAt(0)}</div></td>
                <td><strong>${escapeHTML(u.nombre)} ${escapeHTML(u.apellido || '')}</strong></td>
                <td>${escapeHTML(u.email)}</td>
                <td>${u.rol_id === 1 ? 'Admin' : 'Usuario'}</td>
                <td>
                    <button class="btn-table btn-detail" data-id="${u.id}" title="Ver ficha maestra">👁️</button>
                    <button class="btn-table btn-edit" data-item='${JSON.stringify(u)}' title="Editar usuario">✏️</button>
                </td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

async function renderSecurity(container) {
    container.innerHTML = `
        <div class="card glass-glow" style="max-width:600px; margin:20px auto;">
            <h3>🛡️ Autenticación de Dos Factores (2FA)</h3>
            <div id="mfaStatusContainer" style="margin-top:20px; padding:20px; border:1px solid var(--border-color); border-radius:12px;">
                <span id="mfaStatusBadge" class="badge">Verificando...</span>
                <button id="btnToggleMFA" class="btn-table" style="float:right;">Configurar</button>
            </div>
            <div id="mfaSetupPanel" style="display:none; margin-top:20px;">
                <div id="mfaQRCode" style="background:white; padding:10px; width:150px; height:150px; margin:0 auto;"></div>
                <input type="text" id="mfaConfirmCode" placeholder="000000" style="margin-top:15px; text-align:center;">
                <button id="btnVerifyMFA" class="btn-primary" style="margin-top:10px;">Activar MFA</button>
            </div>
        </div>
    `;
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
            if (ver.ok) { showToast("MFA Activado", "success"); loadView('security'); }
        };
    }
}

async function renderMiPerfil(container) {
    const res = await apiRequest('/usuarios/me');
    if (!res.ok) return container.innerHTML = "Error al cargar el perfil.";
    const u = res.data.user;

    container.innerHTML = `
        <div class="card glass-glow" style="max-width:600px; margin:20px auto;">
            <h3 style="margin-bottom:20px;">👤 Datos de la Cuenta</h3>
            
            <div style="display:flex; gap:20px; align-items:center; margin-bottom: 30px; padding: 20px; background: rgba(0,0,0,0.05); border-radius:12px;">
                <div style="position:relative; width:100px; height:100px;">
                    <div id="profileAvatarPreview" style="width:100%; height:100%; border-radius:50%; background:var(--bg-secondary); overflow:hidden; display:flex; justify-content:center; align-items:center; font-size:40px;">
                        ${u.foto_url ? `<img src="${u.foto_url}" style="width:100%; height:100%; object-fit:cover;">` : u.nombre.charAt(0)}
                    </div>
                </div>
                <div>
                    <h4>Foto de Perfil</h4>
                    <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">JPG o PNG. Máximo 2MB.</p>
                    <input type="file" id="profileImageInput" accept="image/png, image/jpeg" style="display:none;">
                    <button class="btn-table" id="btnUploadPhoto" style="background:var(--accent-blue); color:white;">Subir Nueva Foto</button>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom: 20px;">
                <div>
                    <label>Nombre</label>
                    <input type="text" id="profileNombre" value="${escapeHTML(u.nombre)}" class="form-input">
                </div>
                <div>
                    <label>Apellido</label>
                    <input type="text" id="profileApellido" value="${escapeHTML(u.apellido || '')}" class="form-input">
                </div>
            </div>
            <div style="margin-bottom: 20px;">
                <label>Correo Electrónico (No modificable)</label>
                <input type="email" value="${escapeHTML(u.email)}" class="form-input" disabled style="opacity:0.7">
            </div>
            
            <button id="btnSaveProfile" class="btn-primary" style="width:100%;">Guardar Cambios</button>
        </div>

        <div class="card glass-glow" style="max-width:600px; margin:20px auto;">
            <h3 style="margin-bottom:15px; color:var(--error-color);">🔑 Seguridad de Contraseña</h3>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">Cambia tu contraseña activa. Se cerrará tu sesión por seguridad al terminar.</p>
            <div style="margin-bottom: 15px;">
                <input type="password" id="profileCurrentPass" placeholder="Contraseña Actual" style="margin:0;">
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom: 10px;">
                <input type="password" id="profileNewPass" placeholder="Nueva Contraseña" style="margin:0;">
                <input type="password" id="profileConfirmPass" placeholder="Confirmar Nueva" style="margin:0;">
            </div>
            <div style="height:4px; background:var(--bg-secondary); border-radius:2px; margin-bottom:20px; overflow:hidden;">
                <div id="passStrengthMeter" style="height:100%; width:0%; background:var(--error-color); transition:all 0.3s ease;"></div>
            </div>
            <button id="btnChangePassword" class="btn-table" style="width:100%; border-color:var(--error-color); color:var(--error-color);">Actualizar Contraseña</button>
        </div>
    `;

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
                userData.foto_url = result.url;
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
async function renderDispositivos(container, page = 1) {
    const search = document.getElementById('moduleSearch')?.dataset.activeSearch || '';
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const { ok, data } = await apiRequest(`/equipos?page=${page}&limit=20${searchParam}`);
    if (!ok) return;
    currentData = data.data || data;
    currentPagination = data.pagination || null;

    if (page === 1 && !search) {
        renderModuleHeader(container, { buttonId: 'btnAddDevice', buttonText: '+ Dispositivo', buttonColor: 'var(--accent-blue)', searchPlaceholder: 'Buscar equipo, serial...', module: 'dispositivos' });
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

async function renderVehiculos(container, page = 1) {
    const search = document.getElementById('moduleSearch')?.dataset.activeSearch || '';
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const { ok, data } = await apiRequest(`/dispositivos?page=${page}&limit=20&soloVehiculos=true${searchParam}`);
    if (!ok) return;
    currentData = data.data || data;
    currentPagination = data.pagination || null;

    if (page === 1 && !search) {
        renderModuleHeader(container, { buttonId: 'btnAddVehicle', buttonText: '+ Vehículo', buttonColor: 'var(--accent-lavender)', searchPlaceholder: 'Buscar placa, marca...', module: 'vehiculos' });
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

async function renderAccesos(container, page = 1) {
    const search = document.getElementById('moduleSearch')?.dataset.activeSearch || '';
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const { ok, data } = await apiRequest(`/accesos?page=${page}&limit=25${searchParam}`);
    if (!ok) return;
    currentData = data.data || data;
    currentPagination = data.pagination || null;
    if (page === 1 && !search) {
        renderModuleHeader(container, { buttonId: 'btnLogAccess', buttonText: '+ Manual', buttonColor: 'var(--accent-emerald)', searchPlaceholder: 'Filtrar usuario, tipo...', module: 'accesos', hasExport: true, hasDateFilter: true });
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
    if (!data.length) return `<div class="empty-state">No hay dispositivos tecnológicos vinculados</div>`;
    return `<table>
        <thead><tr>
            <th class="sortable" data-sort="nombre">Nombre Equipo ↕</th>
            <th class="sortable" data-sort="usuario_nombre">Dueño ↕</th>
            <th class="sortable" data-sort="last_connection">Última Conexión ↕</th>
            <th class="sortable" data-sort="estado_id">Estado ↕</th>
        </tr></thead>
        <tbody>
            ${data.map(d => `<tr>
                <td><strong>${escapeHTML(d.nombre)}</strong><br><small>UID: ${escapeHTML(d.identificador_unico)}</small></td>
                <td>${escapeHTML(d.usuario_nombre || 'Sin asignar')}</td>
                <td>${d.last_connection ? new Date(d.last_connection).toLocaleString() : 'N/A'}</td>
                <td><span class="badge ${d.estado_id === 1 ? 'badge-success' : 'badge-danger'}">${d.estado_id === 1 ? 'Activo' : 'Inactivo'}</span></td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function generateVehicleTable(data) {
    if (!data.length) return `<div class="empty-state">No hay vehículos registrados</div>`;
    return `<table>
        <thead><tr>
            <th class="sortable" data-sort="nombre">Vehículo ↕</th>
            <th class="sortable" data-sort="identificador_unico">Placa ↕</th>
            <th class="sortable" data-sort="usuario_nombre">Propietario ↕</th>
            <th class="sortable" data-sort="medio_transporte">Categoría ↕</th>
            <th>Acciones</th>
        </tr></thead>
        <tbody>
            ${data.map(v => `<tr>
                <td><strong>${escapeHTML(v.nombre)}</strong></td>
                <td><span class="badge badge-info" style="font-family:monospace; font-size:14px;">${escapeHTML(v.identificador_unico)}</span></td>
                <td>${escapeHTML(v.usuario_nombre)}</td>
                <td>${escapeHTML(v.medio_transporte || 'Particular')}</td>
                <td><button class="btn-table btn-edit" data-item='${JSON.stringify(v)}'>✏️</button></td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function generateAccessTable(data) {
    if (!data.length) return `<div class="empty-state">
        <div class="empty-state-icon">🚪</div>
        <div class="empty-state-text"><h3>Sin accesos</h3><p>No se han registrado entradas o salidas aún.</p></div>
    </div>`;
    return `<table>
        <thead><tr>
            <th class="sortable" data-sort="fecha_hora">Fecha/Hora ↕</th>
            <th class="sortable" data-sort="usuario_nombre">Usuario ↕</th>
            <th class="sortable" data-sort="tipo">Tipo ↕</th>
        </tr></thead>
        <tbody>
            ${data.map((a, i) => `<tr class="animate-row" style="animation-delay: ${i * 0.05}s">
                <td>${new Date(a.fecha_hora).toLocaleString()}</td>
                <td>${escapeHTML(a.usuario_nombre)}</td>
                <td><span class="badge ${a.tipo === 'Entrada' ? 'badge-success' : 'badge-info'}">${a.tipo}</span></td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function generateAuditTable(data) {
    if (!data.length) return `<div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text"><h3>Sin auditoría</h3><p>El registro de acciones administrativas está vacío.</p></div>
    </div>`;
    return `<table>
        <thead><tr>
            <th class="sortable" data-sort="fecha_hora">Fecha / Hora ↕</th>
            <th class="sortable" data-sort="usuario_nombre">Usuario ↕</th>
            <th class="sortable" data-sort="accion">Acción ↕</th>
            <th class="sortable" data-sort="modulo">Módulo ↕</th>
            <th class="sortable" data-sort="ip_address">IP ↕</th>
        </tr></thead>
        <tbody>
            ${data.map((l, i) => `
                <tr class="animate-row" style="animation-delay: ${i * 0.05}s">
                    <td style="font-size:12px;">${new Date(l.fecha_hora).toLocaleString()}</td>
                    <td><strong>${escapeHTML(l.usuario_nombre || 'Sistema')}</strong></td>
                    <td><span class="badge ${l.accion.includes('Crear') ? 'badge-success' : (l.accion.includes('Eliminar') ? 'badge-danger' : 'badge-info')}">${l.accion}</span></td>
                    <td><small>${l.modulo}</small></td>
                    <td style="font-family:monospace; font-size:11px; opacity:0.7;">${l.ip_address || '-'}</td>
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

function setupModuleEvents(container, type) {
    const searchInput = document.getElementById('moduleSearch');
    const tableContainer = document.getElementById('moduleTableContainer');
    const exportBtn = document.getElementById('btnExportPDF');
    const exportCSVBtn = document.getElementById('btnExportCSV');

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
        searchDebounce = setTimeout(() => {
            const term = searchInput.value.trim();
            // Guardar término activo para que las funciones de render lo usen
            searchInput.dataset.activeSearch = term;
            const renderFn = renderFnMap[type];
            if (renderFn) renderFn(container, 1); // Siempre vuelve a página 1 al buscar
        }, 350);
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

function showModal(type, item = null) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const saveBtn = document.getElementById('btnSave');

    if (!overlay || !body) return;

    title.textContent = item ? `Editar ${type}` : `Nuevo ${type.slice(0, -1)}`;
    saveBtn.style.display = 'block'; // Asegurar que sea visible si venimos de Ficha Médica
    saveBtn.onclick = () => handleModalSave(type, item?.id);

    if (type === 'vehiculos' || type === 'dispositivos') {
        body.innerHTML = `<div class="loading-spinner"></div> Cargando formulario...`;
        Promise.all([
            apiRequest('/usuarios'),
            apiRequest('/transportes')
        ]).then(([usersRes, transRes]) => {
            const users = usersRes.data.data || usersRes.data;
            const trans = transRes.data.data || transRes.data;
            body.innerHTML = renderDynamicForm(type, item, users, trans);
        });
    } else {
        body.innerHTML = renderModalFields(type, item);
    }

    overlay.classList.add('active');
    overlay.style.display = 'flex';
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        // Esperar a que termine la transición de opacidad antes de ocultar el display
        setTimeout(() => {
            if (!overlay.classList.contains('active')) {
                overlay.style.display = 'none';
            }
        }, 300);
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
                <label>Rol</label>
                <select id="m_rol">
                    <option value="1" ${item?.rol_id === 1 ? 'selected' : ''}>Administrador</option>
                    <option value="2" ${item?.rol_id === 2 ? 'selected' : ''}>Usuario</option>
                    <option value="3" ${item?.rol_id === 3 ? 'selected' : ''}>Seguridad</option>
                </select>
            </div>
        `;
    }
    if (type === 'accesos') {
        return `
            <div style="text-align:left;">
                <p style="font-size:14px; margin-bottom:15px; color:var(--text-muted);">Crea una invitación temporal para un invitado o registra un acceso manual.</p>
                <div class="form-group"><label>Nombre del Invitado</label><input type="text" id="guest_name" placeholder="Ej: Juan Pérez"></div>
                <div class="form-group"><label>Email del Invitado (Opcional)</label><input type="email" id="guest_email" placeholder="Para enviarle el QR directamente"></div>
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
                        <i>📱</i> Compartir por WhatsApp
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

async function handleModalSave(type, id) {
    let payload = {};
    let url = type === 'vehiculos' ? '/dispositivos' : `/${type}`;
    let method = id ? 'PUT' : 'POST';
    if (id) url += `/${id}`;

    if (type === 'vehiculos') {
        payload = {
            usuario_id: document.getElementById('v_usuario').value,
            medio_transporte_id: document.getElementById('v_tipo').value,
            nombre: document.getElementById('v_nombre').value,
            identificador_unico: document.getElementById('v_placa').value
        };
        if (!payload.usuario_id || !payload.medio_transporte_id || !payload.nombre || !payload.identificador_unico) return showToast("Faltan campos", "error");
    } else if (type === 'dispositivos') {
        payload = {
            usuario_id: document.getElementById('d_usuario').value,
            nombre: document.getElementById('d_nombre').value,
            identificador_unico: document.getElementById('d_uid').value || `TECH-${Date.now()}`
        };
        if (!payload.usuario_id || !payload.nombre) return showToast("Faltan campos", "error");
    } else if (type === 'accesos') {
        const guestName = document.getElementById('guest_name').value;
        const guestEmail = document.getElementById('guest_email').value;
        const expirationHours = document.getElementById('guest_expires').value;
        if (!guestName) return showToast("Nombre requerido", "error");

        const btnSave = document.getElementById('btnSave');
        if (btnSave) btnSave.classList.add('btn-loading');

        try {
            const res = await apiRequest('/accesos/invitation', 'POST', { guestName, guestEmail, expirationHours });
            if (res.ok) {
                const resultDiv = document.getElementById('invitationResult');
                const qrDiv = document.getElementById('guestQR');
                const waBtn = document.getElementById('btnShareWA');

                qrDiv.innerHTML = `<img src="${res.data.qr}" style="width:100%;">`;
                resultDiv.style.display = 'block';

                waBtn.onclick = async () => {
                    const waRes = await apiRequest('/accesos/invitation/whatsapp', 'POST', { guestName, token: res.data.token });
                    if (waRes.ok) window.open(waRes.data.waLink, '_blank');
                };

                showToast(res.data.sentByEmail ? "Invitación generada y enviada" : "Invitación generada", "success");
            }
        } finally {
            if (btnSave) btnSave.classList.remove('btn-loading');
        }
        return;
    } else if (type === 'usuarios') {
        payload = {
            nombre: document.getElementById('m_nombre').value,
            apellido: document.getElementById('m_apellido').value,
            email: document.getElementById('m_email').value,
            rol_id: parseInt(document.getElementById('m_rol').value)
        };
    }

    const btnSave = document.getElementById('btnSave');
    if (btnSave) btnSave.classList.add('btn-loading');

    try {
        const finalRes = await apiRequest(url, method, payload);
        if (finalRes.ok) {
            showToast(id ? 'Actualizado correctamente' : 'Creado correctamente', 'success');
            closeModal();
            loadView(type);
        } else {
            showToast(finalRes.data?.error || "Error al guardar", "error");
        }
    } finally {
        if (btnSave) btnSave.classList.remove('btn-loading');
    }
}

// Helper to escape HTML for safe display
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function setupSocket() {
    const socket = io();
    socket.on('stats_update', () => {
        if (currentView === 'overview') loadView('overview', true);
        if (currentView === 'accesos') loadView('accesos', true);
    });

    socket.on('disconnect', () => {
        console.warn('WebSocket Desconectado');
    });

    socket.on('new_access', (data) => {
        showToast(`🔔 Acceso: ${data.usuario_nombre} (${data.tipo})`, 'info');
        addNotification('access', `Acceso de ${data.usuario_nombre} (${data.tipo})`); // Add notification for new access
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

async function showUserDetail(userId) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const saveBtn = document.getElementById('btnSave');

    title.textContent = "Ficha Maestra - Perfil de Usuario";
    saveBtn.style.display = 'none'; // No se edita aquí

    body.innerHTML = `<div class="loading-spinner"></div> Consultando historial...`;
    overlay.style.display = 'flex';
    overlay.classList.add('active');

    try {
        const [dRes, aRes] = await Promise.all([
            apiRequest('/dispositivos'),
            apiRequest('/accesos')
        ]);

        const allDevices = dRes.data.data || dRes.data;
        const allAccess = aRes.data.data || aRes.data;

        const user = currentData.find(u => u.id === userId);
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
                    <span class="badge badge-info" style="font-size:10px;">${user.rol_id === 1 ? 'Administrador' : 'Usuario Regular'}</span>
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
            
            <button class="btn-table" onclick="window.closeModal()" style="width:100%; margin-top:20px; background:var(--bg-secondary); border:1px solid var(--border-color);">Cerrar Ficha Maestra</button>
        `;

        // Vincular botón editar dentro del detalle
        const btnEditDetail = document.getElementById('btnEditFromDetail');
        if (btnEditDetail) btnEditDetail.onclick = () => { window.closeModal(); showModal('usuarios', user); };

    } catch (e) {
        body.innerHTML = `<p style="color:var(--error-color)">Error al cargar la ficha técnica.</p>`;
    }
}

// Al final del archivo, reafirmamos las exportaciones por seguridad
window.showUserDetail = showUserDetail;
window.closeModal = closeModal;

