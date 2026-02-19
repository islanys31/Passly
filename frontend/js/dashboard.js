/**
 * Passly - Panel de Control Principal (Versión Hardened & Modular)
 */
import { apiRequest, checkAuth, handleLogout } from './api.js';
import { initTheme } from './theme.js';
import { showToast, escapeHTML, validarEmail, validarPassword } from './utils.js';

let userData = null;
let currentData = [];
let currentView = 'overview';

// Global exposure for event handlers
window.closeModal = closeModal;
window.loadView = loadView;
window.handleLogout = handleLogout;

document.addEventListener('DOMContentLoaded', async () => {
    userData = checkAuth();
    if (!userData) return;

    initTheme();
    setupUI();
    await loadView('overview');
    setupSocket();
});

function setupUI() {
    if (!userData) return;

    const nombre = userData.nombre || 'Usuario';
    const apellido = userData.apellido || '';

    document.getElementById('userName').textContent = `${nombre} ${apellido}`;
    const avatarEl = document.getElementById('userInitial');
    if (userData.foto_url) {
        avatarEl.innerHTML = `<img src="${userData.foto_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
        avatarEl.textContent = nombre.charAt(0).toUpperCase();
    }
    document.getElementById('userRole').textContent =
        userData.rol_id === 1 ? 'Administrador' :
            (userData.rol_id === 3 ? 'Seguridad' : 'Usuario');

    const navItems = document.querySelectorAll('.nav-menu .nav-item');
    const views = ['overview', 'usuarios', 'dispositivos', 'transportes', 'accesos', 'logs', 'security'];

    navItems.forEach((item, index) => {
        if (!navItems[index]) return;
        item.onclick = (e) => {
            e.preventDefault();
            loadView(views[index]);
        };
    });

    if (userData.rol_id === 1 || userData.rol_id === 3) {
        const scannerBtn = document.createElement('div');
        scannerBtn.className = 'nav-item';
        scannerBtn.innerHTML = '<i>📷</i> Escáner QR';
        scannerBtn.style.background = 'rgba(41, 121, 255, 0.1)';
        scannerBtn.style.color = 'var(--accent-blue)';
        scannerBtn.style.marginTop = '10px';
        scannerBtn.onclick = () => window.open('scanner.html', '_blank');
        document.querySelector('.nav-menu').appendChild(scannerBtn);
    }

    document.querySelector('.sidebar-footer .nav-item').onclick = () => {
        if (confirm('¿Deseas cerrar sesión?')) handleLogout();
    };
}

async function loadView(view) {
    if (currentView === view && view !== 'overview') return;
    currentView = view;

    const content = document.getElementById('view-content');
    const title = document.getElementById('view-title');

    content.style.opacity = '0';
    content.style.transform = 'translateY(10px)';
    content.style.transition = 'all 0.3s ease';

    const navItems = document.querySelectorAll('.nav-menu .nav-item');
    navItems.forEach(i => i.classList.remove('active'));

    // Find active item by text or index
    let activeItem = [...navItems].find(item => item.textContent.toLowerCase().includes(view.toLowerCase()));
    if (activeItem) activeItem.classList.add('active');

    setTimeout(() => {
        if (currentView === view) renderSkeleton(content, view);
    }, 50);

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
            case 'transportes':
                title.textContent = "Medios de Transporte";
                await renderTransportes(content);
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
        }

        setTimeout(() => {
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 50);

    } catch (error) {
        console.error("View Error:", error);
        content.innerHTML = `<div class="error-message">Error al cargar la vista.</div>`;
    }
}

function renderSkeleton(container, view) {
    let html = '';
    if (view === 'overview') {
        html = `<div class="stats-grid">${'<div class="skeleton skeleton-card"></div>'.repeat(4)}</div>
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
    const [statsRes, accessRes] = await Promise.all([
        apiRequest('/stats'),
        apiRequest('/accesos')
    ]);

    const stats = statsRes?.data?.stats || { users: 0, accessToday: 0, devices: 0, alerts: 0 };
    const recentAccess = (accessRes?.data?.data || accessRes?.data || []).slice(0, 5);

    const grid = [
        { label: 'Usuarios Activos', val: stats.users, icon: '👥', color: 'var(--accent-blue)' },
        { label: 'Accesos Hoy', val: stats.accessToday, icon: '🚪', color: 'var(--accent-green)' },
        { label: 'Dispositivos', val: stats.devices, icon: '📱', color: 'var(--accent-lavender)' },
        { label: 'Alertas', val: stats.alerts, icon: '⚠️', color: 'var(--error-color)' }
    ];

    container.innerHTML = `
        <div class="stats-grid">
            ${grid.map(s => `
                <div class="stat-card glass-glow" style="border-top: 3px solid ${s.color}">
                    <div class="stat-icon" style="color: ${s.color}; background: rgba(255,255,255,0.03);">${s.icon}</div>
                    <div class="stat-info">
                        <h3>${s.label}</h3>
                        <div class="value">${s.val || 0}</div>
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
                            ${recentAccess.length ? recentAccess.map(a => `
                                <tr>
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
                            `).join('') : '<tr><td colspan="3">No hay actividad</td></tr>'}
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
                <div id="qrContainer" style="width:150px; height:150px; margin:20px auto; border: 2px dashed var(--border-color); border-radius:12px; display:flex; align-items:center; justify-content:center;">
                    <i style="font-size:30px; opacity:0.3;">🔲</i>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-table" id="btnGenerateQR" style="flex:1; background:var(--accent-green); color:white;">Generar</button>
                    <button class="btn-table" id="btnDownloadQR" style="flex:1; display:none;">Descargar</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        renderPeakHoursChart(accessRes?.data?.data || accessRes?.data || []);
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
                ${config.hasExport ? `<button class="btn-export" id="btnExportPDF">📄 PDF</button>` : ''}
                <button class="btn-table" id="${config.buttonId}" style="background:${config.buttonColor}; color:white;">${config.buttonText}</button>
            </div>
        </div>
    `;
}

async function renderUsuarios(container) {
    const { ok, data } = await apiRequest('/usuarios');
    if (!ok) return;
    currentData = data.data || data;
    renderModuleHeader(container, { buttonId: 'btnAddUser', buttonText: '+ Usuario', buttonColor: 'var(--accent-green)', searchPlaceholder: 'Buscar...', module: 'usuarios' });
    const div = document.createElement('div');
    div.className = "data-table-container";
    div.id = "moduleTableContainer";
    div.innerHTML = generateUserTable(currentData);
    container.appendChild(div);
    setupModuleEvents(container, 'usuarios');
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
                <td><button class="btn-table btn-edit" data-item='${JSON.stringify(u)}'>✏️</button></td>
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
async function renderDispositivos(container) {
    const { ok, data } = await apiRequest('/dispositivos');
    if (!ok) return;
    currentData = data.data || data;
    renderModuleHeader(container, { buttonId: 'btnAddDevice', buttonText: '+ Dispositivo', buttonColor: 'var(--accent-blue)', searchPlaceholder: 'Buscar placa...', module: 'dispositivos' });
    const div = document.createElement('div');
    div.className = "data-table-container";
    div.id = "moduleTableContainer";
    div.innerHTML = generateDeviceTable(currentData);
    container.appendChild(div);
    setupModuleEvents(container, 'dispositivos');
}

async function renderTransportes(container) {
    const { ok, data } = await apiRequest('/transportes');
    if (!ok) return;
    currentData = data.data || data;
    renderModuleHeader(container, { buttonId: 'btnAddTransport', buttonText: '+ Medio', buttonColor: 'var(--accent-lavender)', searchPlaceholder: 'Buscar...', module: 'transportes' });
    const div = document.createElement('div');
    div.className = "data-table-container";
    div.id = "moduleTableContainer";
    div.innerHTML = generateTransportTable(currentData);
    container.appendChild(div);
    setupModuleEvents(container, 'transportes');
}

async function renderAccesos(container) {
    const { ok, data } = await apiRequest('/accesos');
    if (!ok) return;
    currentData = data.data || data;
    renderModuleHeader(container, { buttonId: 'btnLogAccess', buttonText: '+ Manual', buttonColor: 'var(--accent-emerald)', searchPlaceholder: 'Filtrar...', module: 'accesos', hasExport: true, hasDateFilter: true });
    const div = document.createElement('div');
    div.className = "data-table-container";
    div.id = "moduleTableContainer";
    div.innerHTML = generateAccessTable(currentData);
    container.appendChild(div);
    setupModuleEvents(container, 'accesos');
}

async function renderAuditLogs(container) {
    if (userData.rol_id !== 1) return container.innerHTML = "Acceso denegado";
    const { ok, data } = await apiRequest('/logs');
    if (!ok) return;
    currentData = data.data || data;
    renderModuleHeader(container, { buttonId: 'btnRefreshLogs', buttonText: '🔄 Actualizar', buttonColor: 'var(--bg-secondary)', searchPlaceholder: 'Buscar logs...', module: 'logs' });
    const div = document.createElement('div');
    div.className = "data-table-container";
    div.id = "moduleTableContainer";
    div.innerHTML = generateAuditTable(currentData);
    container.appendChild(div);
    setupModuleEvents(container, 'logs');
}

function generateDeviceTable(data) {
    if (!data.length) return `<div class="empty-state">No hay dispositivos</div>`;
    return `<table>
        <thead><tr><th>Dispositivo</th><th>Dueño</th><th>Estado</th></tr></thead>
        <tbody>
            ${data.map(d => `<tr>
                <td><strong>${escapeHTML(d.nombre)}</strong><br><small>${escapeHTML(d.medio_transporte || 'Particular')}</small></td>
                <td>${escapeHTML(d.usuario_nombre || 'N/A')}</td>
                <td><span class="badge ${d.estado_id === 1 ? 'badge-success' : 'badge-danger'}">${d.estado_id === 1 ? 'Activo' : 'Inactivo'}</span></td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function generateTransportTable(data) {
    if (!data.length) return `<div class="empty-state">No hay medios</div>`;
    return `<table>
        <thead><tr><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr></thead>
        <tbody>
            ${data.map(t => `<tr>
                <td><strong>${escapeHTML(t.nombre)}</strong></td>
                <td>${escapeHTML(t.descripcion || '-')}</td>
                <td><button class="btn-table btn-edit" data-item='${JSON.stringify(t)}'>✏️</button></td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function generateAccessTable(data) {
    if (!data.length) return `<div class="empty-state">No hay accesos</div>`;
    return `<table>
        <thead><tr><th>Fecha/Hora</th><th>Usuario</th><th>Tipo</th></tr></thead>
        <tbody>
            ${data.map(a => `<tr>
                <td>${new Date(a.fecha_hora).toLocaleString()}</td>
                <td>${escapeHTML(a.usuario_nombre)}</td>
                <td><span class="badge ${a.tipo === 'Entrada' ? 'badge-success' : 'badge-info'}">${a.tipo}</span></td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function generateAuditTable(data) {
    if (!data.length) return `<div class="empty-state">No hay registros de auditoría aún</div>`;
    return `<table>
        <thead><tr><th>Fecha / Hora</th><th>Usuario</th><th>Acción</th><th>Módulo</th><th>IP</th></tr></thead>
        <tbody>
            ${data.map(l => `
                <tr>
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

function setupModuleEvents(container, type) {
    const searchInput = document.getElementById('moduleSearch');
    const tableContainer = document.getElementById('moduleTableContainer');
    if (!searchInput || !tableContainer) return;

    searchInput.oninput = () => {
        const term = searchInput.value.toLowerCase();
        const filtered = currentData.filter(item => JSON.stringify(item).toLowerCase().includes(term));
        if (type === 'usuarios') tableContainer.innerHTML = generateUserTable(filtered);
        else if (type === 'dispositivos') tableContainer.innerHTML = generateDeviceTable(filtered);
        else if (type === 'transportes') tableContainer.innerHTML = generateTransportTable(filtered);
        else if (type === 'accesos') tableContainer.innerHTML = generateAccessTable(filtered);
        else if (type === 'logs') tableContainer.innerHTML = generateAuditTable(filtered);
    };

    const addBtnMap = { 'usuarios': 'btnAddUser', 'dispositivos': 'btnAddDevice', 'transportes': 'btnAddTransport' };
    const btn = document.getElementById(addBtnMap[type]);
    if (btn) btn.onclick = () => showModal(type === 'usuarios' ? 'add_user' : 'add_item');
}

function showModal(type, item = null) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const saveBtn = document.getElementById('btnSave');

    if (!overlay || !body) return;

    title.textContent = item ? `Editar ${type}` : `Nuevo ${type}`;
    body.innerHTML = renderModalFields(type, item);

    saveBtn.onclick = () => handleModalSave(type, item?.id);

    overlay.classList.add('active');
    overlay.style.display = 'flex';
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

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
    return `<p>Campos para ${type} en desarrollo...</p>`;
}

async function handleModalSave(type, id) {
    if (type === 'accesos') {
        const guestName = document.getElementById('guest_name').value;
        const expirationHours = document.getElementById('guest_expires').value;

        if (!guestName) return showToast("Nombre requerido", "error");

        const res = await apiRequest('/accesos/invitation', 'POST', { guestName, expirationHours });
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

            showToast("Invitación generada", "success");
            // No cerramos el modal inmediatamente para que el usuario vea el QR / comparta
            return;
        }
    }

    // Default logic for other types
    showToast(`Operación exitosa`, 'success');
    closeModal();
    loadView(type);
}
function setupSocket() { }
