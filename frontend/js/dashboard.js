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

    // Configuration of views by role
    const viewConfigs = {
        1: [ // Admin
            { section: 'SYSTEM CONTROL', views: [
                { id: 'overview', icon: 'layout-dashboard', text: 'Dashboard' },
                { id: 'usuarios', icon: 'users', text: 'Identity Manager' },
                { id: 'dispositivos', icon: 'monitor', text: 'Hardware Assets' },
                { id: 'vehiculos', icon: 'truck', text: 'Fleet Registry' },
                { id: 'accesos', icon: 'lock', text: 'Access Logs' }
            ]},
            { section: 'TERMINALS', views: [
                { id: 'scanner', icon: 'qr-code', text: 'QR Scanner', external: 'scanner.html' }
            ]},
            { section: 'SECURITY & AUDIT', views: [
                { id: 'logs', icon: 'clipboard-list', text: 'Audit Trail' },
                { id: 'perfil', icon: 'user-cog', text: 'Account Settings' },
                { id: 'security', icon: 'shield-check', text: 'Shield 2FA' }
            ]}
        ],
        3: [ // Security
            { section: 'OPERATIONS', views: [
                { id: 'overview', icon: 'layout-dashboard', text: 'Operations' },
                { id: 'accesos', icon: 'lock', text: 'Live Logs' }
            ]},
            { section: 'TERMINALS', views: [
                { id: 'scanner', icon: 'qr-code', text: 'QR Scanner', external: 'scanner.html' }
            ]},
            { section: 'IDENTITY', views: [
                { id: 'perfil', icon: 'user-cog', text: 'Profile' },
                { id: 'security', icon: 'shield-check', text: 'Security' }
            ]}
        ],
        2: [ // User
            { section: 'PERSONAL ASSETS', views: [
                { id: 'overview', icon: 'layout-dashboard', text: 'My Summary' },
                { id: 'dispositivos', icon: 'monitor', text: 'My Devices' },
                { id: 'vehiculos', icon: 'truck', text: 'My Vehicles' },
                { id: 'accesos', icon: 'lock', text: 'My History' }
            ]},
            { section: 'ACCOUNT', views: [
                { id: 'perfil', icon: 'user-cog', text: 'Settings' },
                { id: 'security', icon: 'shield-check', text: 'Security' }
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

    const roleLabel = role === 1 ? 'ADMINISTRATOR' : (role === 3 ? 'SECURITY' : 'RESIDENT');
    document.getElementById('userRole').textContent = roleLabel;

    // Session Management
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm('Verify exit from secure session?')) handleLogout();
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

    const role = userData.rol_id;
    const isUser = role === 2;

    const grid = [
        { label: isUser ? 'ACCOUNT STATUS' : 'ACTIVE USERS', val: isUser ? 'VERIFIED' : stats.users, icon: 'users', color: 'hsla(220, 90%, 65%, 1)' },
        { label: isUser ? 'MY LOGS TODAY' : 'ENTRIES TODAY', val: stats.accessToday, icon: 'door-open', color: 'hsla(150, 70%, 45%, 1)' },
        { label: isUser ? 'MY ASSETS' : 'HARDWARE ASSETS', val: stats.tech, icon: 'monitor', color: 'hsla(280, 50%, 60%, 1)' },
        { label: isUser ? 'MY VEHICLES' : 'FLEET UNITS', val: stats.vehicles, icon: 'truck', color: 'hsla(170, 60%, 50%, 1)' }
    ];

    if (role === 1 || role === 3) {
        grid.push({ label: 'SYSTEM ALERTS', val: stats.alerts, icon: 'shield-alert', color: 'hsla(0, 85%, 65%, 1)' });
    }

    container.innerHTML = `
        <div class="stats-grid">
            ${grid.map(s => `
                <div class="stat-card glass-glow">
                    <div class="stat-icon" style="color: ${s.color}; background: ${s.color.replace('1)', '0.1)')}">
                        <i data-lucide="${s.icon}"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${s.label}</h3>
                        <div class="value">${s.val ?? 0}</div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="dashboard-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; margin-top: 32px;">
            <div class="card glass-glow" style="padding: 32px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h3 style="margin:0; font-size:18px; letter-spacing:-0.02em;">REAL-TIME ACTIVITY</h3>
                    <button class="btn-table" onclick="loadView('accesos')">View History</button>
                </div>
                <div class="data-table-container">
                    <table>
                        <thead><tr><th>Security Subject</th><th>Operation</th><th>Timestamp</th></tr></thead>
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
                                    <td><span class="badge ${a.tipo === 'Entrada' ? 'badge-success' : 'badge-info'}">${a.tipo.toUpperCase()}</span></td>
                                    <td style="color:var(--text-muted); font-family:monospace;">${new Date(a.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="3" style="padding:48px 0; text-align:center; color:var(--text-muted);">
                                        <div style="font-size:32px; margin-bottom:12px;">📡</div>
                                        <div>Waiting for system activity...</div>
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
                        <h3 style="margin:0; font-size:18px;">TRAFFIC TRENDS</h3>
                        <div class="badge badge-success"><span class="pulse-online" style="margin-right:8px;"></span>LIVE</div>
                    </div>
                    <div style="height: 200px;"><canvas id="peakHoursChart"></canvas></div>
                </div>` : ''}

                <div class="card glass-glow" style="padding: 32px; text-align: center;">
                    <h3 style="margin-bottom:20px; font-size:18px;">DIGITAL KEY (MFA)</h3>
                    <div id="qrContainer" style="width:160px; height:160px; margin:0 auto 24px; border-radius:16px; display:flex; align-items:center; justify-content:center; overflow:hidden; background:white; box-shadow:0 8px 24px rgba(0,0,0,0.1); border:4px solid var(--bg-secondary);">
                        <i data-lucide="qr-code" style="width:48px; height:48px; color:var(--bg-primary); opacity:0.2;"></i>
                    </div>
                    <div style="display:flex; gap:12px;">
                        <button id="btnGenerateQR" style="flex:2;">GENERATE SECURE KEY</button>
                        <button id="btnDownloadQR" class="btn-icon" style="flex:0.5; display:none; height:auto; padding:12px;" title="Export Key">
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
                <button id="${config.buttonId}" style="height:44px; display:flex; align-items:center; gap:8px; padding:0 20px; border-radius:12px;">
                    <i data-lucide="plus" style="width:18px;"></i>
                    ${config.buttonText}
                </button>
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
    if (!data.length) return `<div class="empty-state">No users matching current criteria.</div>`;
    return `<table>
        <thead><tr>
            <th>IDENTITY</th>
            <th class="sortable" data-sort="nombre">FULL NAME <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="email">EMAIL ADDRESS <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="rol_id">ACCESS LEVEL <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th style="text-align:right;">OPERATIONS</th>
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
                    <button class="btn-icon btn-detail" data-id="${u.id}" title="Inspección" style="color:var(--accent-blue);">
                        <i data-lucide="search"></i>
                    </button>
                    <button class="btn-icon btn-edit" data-item='${JSON.stringify(u)}' title="Modificar" style="color:var(--warning-color);">
                        <i data-lucide="edit-3"></i>
                    </button>
                </td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

async function renderSecurity(container) {
    container.innerHTML = `
        <div class="card glass-glow animate-fade-in" style="max-width:640px; margin:20px auto; padding:40px;">
            <div style="display:flex; align-items:center; gap:20px; margin-bottom:32px;">
                <div class="stat-icon" style="color:hsla(220, 90%, 65%, 1); background:hsla(220, 90%, 65%, 0.1); width:56px; height:56px;">
                    <i data-lucide="shield-check" style="width:28px; height:28px;"></i>
                </div>
                <div>
                    <h3 style="margin:0; font-size:20px;">SECURITY CENTER</h3>
                    <p style="margin:0; font-size:13px; color:var(--text-muted);">Manage your multi-factor authentication and session security.</p>
                </div>
            </div>

            <div id="mfaStatusContainer" style="padding:24px; background:hsla(0,0%,100%,0.03); border:1px solid var(--glass-border); border-radius:16px; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span style="font-size:11px; font-weight:700; color:var(--text-muted); letter-spacing:0.05em;">PROTECTION STATUS</span>
                    <span id="mfaStatusBadge" class="badge">VERIFYING...</span>
                </div>
                <button id="btnToggleMFA" style="height:40px; padding:0 16px; font-size:13px;">CONFIGURE</button>
            </div>

            <div id="mfaSetupPanel" style="display:none; margin-top:32px; padding-top:32px; border-top:1px solid var(--glass-border); text-align:center;">
                <p style="font-size:14px; color:var(--text-secondary); margin-bottom:24px;">Scan this QR code with your authenticator app (Google, Authy, etc.)</p>
                <div id="mfaQRCode" style="background:white; padding:16px; width:180px; height:180px; margin:0 auto; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.2);"></div>
                
                <div style="margin-top:32px; max-width:280px; margin-inline:auto;">
                    <label style="display:block; font-size:11px; font-weight:700; color:var(--text-muted); text-align:left; margin-bottom:8px;">VERIFICATION CODE</label>
                    <input type="text" id="mfaConfirmCode" placeholder="000 000" style="text-align:center; font-size:24px; letter-spacing:0.2em; height:64px;">
                    <button id="btnVerifyMFA" class="btn-primary" style="width:100%; margin-top:16px; height:52px;">ACTIVATE PROTECTION</button>
                </div>
            </div>
            
            <div style="margin-top:40px; padding:20px; border-radius:12px; background:hsla(150, 70%, 45%, 0.05); border:1px solid hsla(150, 70%, 45%, 0.1); display:flex; gap:16px; align-items:flex-start;">
                <i data-lucide="info" style="width:18px; color:hsla(150, 70%, 45%, 1); margin-top:2px;"></i>
                <p style="margin:0; font-size:12px; line-height:1.6; color:hsla(150, 70%, 45%, 0.8);">MFA adds an extra layer of security to your account by requiring more than just a password to log in.</p>
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
                    <p style="margin:4px 0 0; color:var(--text-muted); font-size:14px;">Resident Identity & Profile Access</p>
                    <div class="badge badge-info" style="margin-top:12px;">${u.rol_id === 1 ? 'ADMINISTRATOR' : 'RESIDENT'}</div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-bottom:32px;">
                <div class="input-group">
                    <label style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; display:block;">GIVEN NAME</label>
                    <input type="text" id="profileNombre" value="${escapeHTML(u.nombre)}" placeholder="e.g. John">
                </div>
                <div class="input-group">
                    <label style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; display:block;">SURNAME</label>
                    <input type="text" id="profileApellido" value="${escapeHTML(u.apellido || '')}" placeholder="e.g. Doe">
                </div>
            </div>

            <div class="input-group" style="margin-bottom:40px;">
                <label style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; display:block;">REGISTERED EMAIL (PROTECTED)</label>
                <div style="position:relative;">
                    <i data-lucide="mail" style="position:absolute; left:16px; top:50%; transform:translateY(-50%); width:16px; opacity:0.3;"></i>
                    <input type="email" value="${escapeHTML(u.email)}" disabled style="padding-left:48px; opacity:0.6; cursor:not-allowed;">
                </div>
            </div>
            
            <button id="btnSaveProfile" class="btn-primary" style="width:100%; height:56px; font-size:15px; letter-spacing:0.02em;">
                <i data-lucide="save" style="width:18px; margin-right:8px;"></i> COMMIT IDENTITY CHANGES
            </button>
        </div>

        <div class="card glass-glow animate-fade-in" style="max-width:720px; margin:40px auto; padding:40px; border-bottom: 4px solid var(--error);">
            <div style="display:flex; align-items:center; gap:16px; margin-bottom:32px;">
                <i data-lucide="key-round" style="width:24px; color:var(--error);"></i>
                <h3 style="margin:0; font-size:18px; color:var(--error);">CREDENTIAL ROTATION</h3>
            </div>
            
            <div class="input-group" style="margin-bottom:24px;">
                <input type="password" id="profileCurrentPass" placeholder="Current Security Password" style="height:52px;">
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-bottom:24px;">
                <input type="password" id="profileNewPass" placeholder="New Secret Code" style="height:52px;">
                <input type="password" id="profileConfirmPass" placeholder="Repeat New Code" style="height:52px;">
            </div>

            <div style="height:6px; background:var(--bg-secondary); border-radius:10px; margin-bottom:32px; overflow:hidden;">
                <div id="passStrengthMeter" style="height:100%; width:0%; background:var(--error); transition:all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
            </div>

            <button id="btnChangePassword" style="width:100%; height:52px; background:transparent; border:1px solid var(--error); color:var(--error);">
                EXECUTE CREDENTIAL UPDATE
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
    if (!data.length) return `<div class="empty-state">No hardware assets registered.</div>`;
    return `<table>
        <thead><tr>
            <th class="sortable" data-sort="nombre">HARDWARE NAME <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="usuario_nombre">ASSIGNED OWNER <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="last_connection">LAST HEARTBEAT <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="estado_id">HEALTH STATUS <i data-lucide="chevron-down" style="width:12px;"></i></th>
        </tr></thead>
        <tbody>
            ${data.map(d => `<tr>
                <td>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600; color:var(--text-primary)">${escapeHTML(d.nombre)}</span>
                        <code style="font-size:10px; opacity:0.5;">UID: ${escapeHTML(d.identificador_unico)}</code>
                    </div>
                </td>
                <td><span style="display:flex; align-items:center; gap:8px;"><i data-lucide="user" style="width:14px; opacity:0.5;"></i> ${escapeHTML(d.usuario_nombre || 'Unassigned')}</span></td>
                <td style="font-family:monospace; font-size:12px;">${d.last_connection ? new Date(d.last_connection).toLocaleString() : 'PENDING'}</td>
                <td><span class="badge ${d.estado_id === 1 ? 'badge-success' : 'badge-danger'}">${d.estado_id === 1 ? 'ONLINE' : 'OFFLINE'}</span></td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function generateVehicleTable(data) {
    if (!data.length) return `<div class="empty-state">No fleet units found.</div>`;
    return `<table>
        <thead><tr>
            <th class="sortable" data-sort="nombre">UNIT MODEL <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="identificador_unico">PLATE LICENSE <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="usuario_nombre">LEGAL PROPRIETOR <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="medio_transporte">CLASSIFICATION <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th style="text-align:right;">EDIT</th>
        </tr></thead>
        <tbody>
            ${data.map(v => `<tr>
                <td><strong style="color:var(--text-primary)">${escapeHTML(v.nombre)}</strong></td>
                <td><span class="badge badge-info" style="font-family:monospace; font-size:13px; font-weight:700;">${escapeHTML(v.identificador_unico)}</span></td>
                <td>${escapeHTML(v.usuario_nombre)}</td>
                <td><span style="opacity:0.8;">${escapeHTML(v.medio_transporte || 'PRIVATE')}</span></td>
                <td style="text-align:right;"><button class="btn-icon btn-edit" data-item='${JSON.stringify(v)}' style="color:var(--warning-color);"><i data-lucide="edit-2"></i></button></td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function generateAccessTable(data) {
    if (!data.length) return `<div class="empty-state">
        <i data-lucide="shield-off" style="width:48px; height:48px; opacity:0.2; margin-bottom:16px;"></i>
        <h3>VOID LOGS</h3><p>No secure access events recorded for this period.</p>
    </div>`;
    return `<table>
        <thead><tr>
            <th class="sortable" data-sort="fecha_hora">EVENT TIMESTAMP <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="usuario_nombre">SECURITY SUBJECT <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="tipo">OPERATION <i data-lucide="chevron-down" style="width:12px;"></i></th>
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

function generateAuditTable(data) {
    if (!data.length) return `<div class="empty-state">
        <i data-lucide="file-search" style="width:48px; height:48px; font-size:24px;"></i>
        <h3>CLEAN AUDIT</h3><p>Administrative trace is currently empty.</p>
    </div>`;
    return `<table>
        <thead><tr>
            <th class="sortable" data-sort="fecha_hora">SYSTEM TIMESTAMP <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="usuario_nombre">OPERATOR <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="accion">ACTION <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="modulo">SCOPE <i data-lucide="chevron-down" style="width:12px;"></i></th>
            <th class="sortable" data-sort="ip_address">SOURCE IP <i data-lucide="chevron-down" style="width:12px;"></i></th>
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

// Helper functions are imported from utils.js

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

