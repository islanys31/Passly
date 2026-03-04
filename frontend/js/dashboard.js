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

    // 5. Vincular eventos globales (Delegación de eventos para robustez)
    document.addEventListener('click', (e) => {
        // Cerrar modales (clase btn-close-modal o ID btnCancelGlobal)
        if (e.target && (e.target.id === 'btnCancelGlobal' || e.target.classList.contains('btn-close-modal') || e.target.closest('.btn-close-modal'))) {
            closeModal();
            return;
        }

        // Abrir modal de logout (ID btnSidebarLogout o ancestros)
        if (e.target && (e.target.id === 'btnSidebarLogout' || e.target.closest('#btnSidebarLogout'))) {
            showModal('logout_confirm');
            return;
        }

        // Ejecutar logout final (ID btnConfirmLogout)
        if (e.target && e.target.id === 'btnConfirmLogout') {
            handleLogout();
            return;
        }
    });

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
    const items = navMenu.querySelectorAll('.nav-item');

    // Inyección dinámica de cabeceras en el menú según la importancia
    const opHeader = document.createElement('div');
    opHeader.className = 'nav-section';
    opHeader.textContent = 'Gestión Principal';
    navMenu.insertBefore(opHeader, items[0]);

    const sysHeader = document.createElement('div');
    sysHeader.className = 'nav-section';
    sysHeader.textContent = 'Seguridad y Logs';
    const auditItem = document.getElementById('navAudit');
    if (auditItem) {
        navMenu.insertBefore(sysHeader, auditItem);
    } else {
        navMenu.appendChild(sysHeader);
    }


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

    // Configurar los botones de navegación del Sidebar
    const navItems = document.querySelectorAll('.nav-menu .nav-item');
    const views = ['overview', 'usuarios', 'dispositivos', 'vehiculos', 'accesos', 'logs', 'security', 'scanner'];

    navItems.forEach((item, index) => {
        if (!navItems[index]) return;
        item.onclick = (e) => {
            e.preventDefault();
            loadView(views[index]); // Carga la sección correspondiente sin recargar la página
        };
    });

    /**
     * ACCESO RÁPIDO: Si el usuario es Admin o Seguridad, añadimos botón al Escáner QR.
     */
    if (userData.rol_id === 1 || userData.rol_id === 3) {
        const divider = document.createElement('div');
        divider.className = 'nav-section';
        divider.style.marginTop = '20px';
        divider.textContent = 'Terminales';
        navMenu.appendChild(divider);

        const scannerBtn = document.createElement('div');
        scannerBtn.className = 'nav-item';
        scannerBtn.innerHTML = '<i>📷</i> <span class="nav-text">Escáner QR</span>';
        scannerBtn.style.background = 'rgba(41, 121, 255, 0.1)';
        scannerBtn.style.color = 'var(--accent-blue)';
        scannerBtn.onclick = () => window.open('scanner.html', '_blank');
        navMenu.appendChild(scannerBtn);
    }

    // Ya no es necesario vincular aquí, se maneja por delegación arriba
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

    let activeItem = [...navItems].find(item => item.textContent.toLowerCase().includes(view.toLowerCase()));
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
            case 'security':
                title.textContent = "Seguridad de la Cuenta";
                await renderSecurity(content);
                break;
            case 'scanner':
                title.textContent = "Escáner de Acceso";
                await renderScanner(content);
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

    const stats = statsRes?.data?.stats || { users: 0, accessToday: 0, devices: 0, alerts: 0 };
    const recentAccess = (trafficRes?.data?.data || []).slice(0, 5);

    const grid = [
        { label: 'Usuarios Activos', val: stats.users, icon: '👥', color: 'var(--accent-blue)' },
        { label: 'Accesos Hoy', val: stats.accessToday, icon: '🚪', color: 'var(--accent-green)' },
        { label: 'Equipos Tech', val: stats.tech, icon: '💻', color: 'var(--accent-lavender)' },
        { label: 'Vehículos', val: stats.vehicles, icon: '🚗', color: 'var(--accent-emerald)' },
        { label: 'Alertas', val: stats.alerts, icon: '⚠️', color: 'var(--error-color)' }
    ];

    container.innerHTML = `
        <div class="stats-grid">
            ${grid.map((s, i) => `
                <div class="stat-card glass-glow animate-row" style="border-top: 3px solid ${s.color}; animation-delay: ${i * 0.1}s">
                    <div class="stat-icon" style="color: ${s.color}; background: rgba(255,255,255,0.03);">${s.icon}</div>
                    <div class="stat-info">
                        <h3>${s.label}</h3>
                        <div class="value counter" data-value="${s.val ?? 0}">${s.val ?? 0}</div>
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

            <div class="card glass-glow" style="flex: 1; min-width: 300px; padding: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>📈 Tráfico</h3>
                    <div class="badge badge-success">● Vivo</div>
                </div>
                <div style="height: 180px;"><canvas id="peakHoursChart"></canvas></div>
            </div>

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
        renderPeakHoursChart(trafficRes?.data?.data || []);
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
                ${config.hasExport ? `<button class="btn-export" id="btnExportPDF">📄 PDF</button>` : ''}
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
        <thead><tr><th>Foto</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Acciones</th></tr></thead>
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
        <thead><tr><th>Nombre Equipo</th><th>Dueño</th><th>Última Conexión</th><th>Estado</th></tr></thead>
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
        <thead><tr><th>Vehículo</th><th>Placa</th><th>Propietario</th><th>Categoría</th><th>Acciones</th></tr></thead>
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
        <thead><tr><th>Fecha/Hora</th><th>Usuario</th><th>Tipo</th></tr></thead>
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
        <thead><tr><th>Fecha / Hora</th><th>Usuario</th><th>Acción</th><th>Módulo</th><th>IP</th></tr></thead>
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

function setupModuleEvents(container, type) {
    const searchInput = document.getElementById('moduleSearch');
    const tableContainer = document.getElementById('moduleTableContainer');
    const exportBtn = document.getElementById('btnExportPDF');

    if (exportBtn) {
        exportBtn.onclick = () => {
            if (type === 'accesos') {
                const cols = ["Fecha/Hora", "Usuario", "Tipo"];
                const rows = currentData.map(a => [new Date(a.fecha_hora).toLocaleString(), a.usuario_nombre, a.tipo]);
                exportToPDF("Historial de Accesos", cols, rows, "Passly_Accesos");
            } else if (type === 'logs') {
                const cols = ["Fecha", "Usuario", "Acción", "Módulo", "IP"];
                const rows = currentData.map(l => [new Date(l.fecha_hora).toLocaleString(), l.usuario_nombre || 'Sistema', l.accion, l.modulo, l.ip_address]);
                exportToPDF("Registro de Auditoría", cols, rows, "Passly_Auditoria");
            }
        };
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
}

function showModal(type, item = null) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const saveBtn = document.getElementById('btnSave');
    const modalFooter = document.getElementById('modalFooter');

    if (!overlay || !body) return;

    // Reset view
    title.textContent = item ? `Editar ${type}` : (type === 'logout_confirm' ? 'Cerrar Sesión' : `Nuevo ${type.slice(0, -1)}`);

    if (type === 'logout_confirm') {
        saveBtn.style.display = 'none';
        if (modalFooter) modalFooter.style.display = 'none';
    } else {
        saveBtn.style.display = 'block';
        if (modalFooter) modalFooter.style.display = 'flex';
    }

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

    overlay.classList.add('show');
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
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

async function handleModalSave(type, id) {
    const saveBtn = document.getElementById('btnSave');
    const originalText = saveBtn.textContent;

    // 🛡️ VALIDACIÓN LADO CLIENTE
    let payload = {};
    if (type === 'usuarios') {
        payload = {
            nombre: document.getElementById('m_nombre').value.trim(),
            apellido: document.getElementById('m_apellido').value.trim(),
            email: document.getElementById('m_email').value.trim().toLowerCase(),
            rol_id: parseInt(document.getElementById('m_rol').value)
        };
        if (!payload.nombre || !payload.email) return showToast("Nombre y Email son requeridos", "warning");
        if (!validarEmail(payload.email)) return showToast("Email inválido", "error");
    } else if (type === 'vehiculos') {
        payload = {
            usuario_id: document.getElementById('v_usuario').value,
            medio_transporte_id: document.getElementById('v_tipo').value,
            nombre: document.getElementById('v_nombre').value.trim(),
            identificador_unico: document.getElementById('v_placa').value.trim().toUpperCase()
        };
        if (!payload.usuario_id || !payload.nombre || !payload.identificador_unico) return showToast("Todos los campos son obligatorios", "warning");
    } else if (type === 'dispositivos') {
        payload = {
            usuario_id: document.getElementById('d_usuario').value,
            nombre: document.getElementById('d_nombre').value.trim(),
            identificador_unico: document.getElementById('d_uid').value.trim() || `TECH-${Date.now()}`
        };
        if (!payload.usuario_id || !payload.nombre) return showToast("Asigne un dueño y nombre al equipo", "warning");
    } else if (type === 'accesos') {
        const guestName = document.getElementById('guest_name').value.trim();
        const guestEmail = document.getElementById('guest_email').value.trim();
        const expirationHours = document.getElementById('guest_expires').value;
        if (!guestName) return showToast("Nombre del invitado requerido", "warning");

        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="loading-spinner"></span> Generando...`;

        const res = await apiRequest('/accesos/invitation', 'POST', { guestName, guestEmail, expirationHours });

        saveBtn.disabled = false;
        saveBtn.textContent = originalText;

        if (res.ok) {
            const resultDiv = document.getElementById('invitationResult');
            const qrDiv = document.getElementById('guestQR');
            const waBtn = document.getElementById('btnShareWA');

            qrDiv.innerHTML = `<img src="${res.data.qr}" style="width:100%; border-radius:8px;">`;
            resultDiv.style.display = 'block';

            waBtn.onclick = async () => {
                const waRes = await apiRequest('/accesos/invitation/whatsapp', 'POST', { guestName, token: res.data.token });
                if (waRes.ok) window.open(waRes.data.waLink, '_blank');
            };

            showToast(res.data.sentByEmail ? "Email enviado e Invitación lista" : "Invitación lista para compartir", "success");
            return;
        }
        return;
    }

    // Efecto de carga en el botón
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="loading-spinner"></span> Guardando...`;

    let url = type === 'vehiculos' ? '/dispositivos' : `/${type}`;
    let method = id ? 'PUT' : 'POST';
    if (id) url += `/${id}`;

    const finalRes = await apiRequest(url, method, payload);

    saveBtn.disabled = false;
    saveBtn.textContent = originalText;

    if (finalRes && finalRes.ok) {
        showToast(id ? 'Actualizado correctamente' : 'Creado correctamente', 'success');
        closeModal();
        loadView(type, true);
    } else {
        showToast(finalRes?.data?.error || "Error al procesar la solicitud", "error");
    }
}

function setupSocket() {
    const socket = io();
    socket.on('stats_update', () => {
        if (currentView === 'overview') loadView('overview', true);
    });

    socket.on('new_access', (data) => {
        showToast(`🔔 Acceso: ${data.usuario_nombre} (${data.tipo})`, 'info');
        if (currentView === 'overview' || currentView === 'accesos') {
            loadView(currentView, true);
        }
    });
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

window.showUserDetail = showUserDetail;
window.closeModal = closeModal;
window.startDashboardScanner = startDashboardScanner;

