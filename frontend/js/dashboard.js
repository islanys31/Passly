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
window.showModal = showModal;
window.showUserDetail = (id) => showUserDetail(id); // Exposición global inmediata
// Fallback para botones en HTML que no pueden esperar a que el módulo cargue
if (!window.closeModal) window.closeModal = () => {
    const o = document.getElementById('modalOverlay');
    if (o) o.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', async () => {
    userData = checkAuth();
    if (!userData) return;

    initTheme();
    setupUI();
    setupSidebarToggle(); // Nueva función
    await loadView('overview');
    setupSocket();
});

function setupSidebarToggle() {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');

    // Recuperar estado previo
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (isCollapsed) sidebar.classList.add('collapsed');

    toggleBtn.onclick = () => {
        const collapsed = sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebar_collapsed', collapsed);
    };
}

function setupUI() {
    if (!userData) return;

    // Etiquetas de sección para el menú estático
    const navMenu = document.querySelector('.nav-menu');
    const items = navMenu.querySelectorAll('.nav-item');

    // Insertar "OPERACIONES" al inicio
    const opHeader = document.createElement('div');
    opHeader.className = 'nav-section';
    opHeader.textContent = 'Gestión Principal';
    navMenu.insertBefore(opHeader, items[0]);

    // Insertar "SISTEMA" antes de Auditoría (que es el item 5 originalmente, ahora 6 con Operaciones)
    const sysHeader = document.createElement('div');
    sysHeader.className = 'nav-section';
    sysHeader.textContent = 'Seguridad y Logs';
    navMenu.insertBefore(sysHeader, document.getElementById('navAudit'));

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
    const views = ['overview', 'usuarios', 'dispositivos', 'vehiculos', 'accesos', 'logs', 'security'];

    navItems.forEach((item, index) => {
        if (!navItems[index]) return;
        item.onclick = (e) => {
            e.preventDefault();
            loadView(views[index]);
        };
    });

    if (userData.rol_id === 1 || userData.rol_id === 3) {
        // Sección divisor "Recuerda"
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

    document.querySelector('.sidebar-footer .nav-item').onclick = () => {
        if (confirm('¿Deseas cerrar sesión?')) handleLogout();
    };

    // Vincular botón cancelar del modal de forma segura
    const cancelBtn = document.querySelector('#modalOverlay .btn-table[onclick="closeModal()"]');
    if (cancelBtn) {
        cancelBtn.removeAttribute('onclick');
        cancelBtn.addEventListener('click', closeModal);
    }
}

async function loadView(view, force = false) {
    if (currentView === view && view !== 'overview' && !force) return;
    currentView = view;

    const content = document.getElementById('view-content');
    const title = document.getElementById('view-title');

    // Transición ultra-rápida
    content.style.opacity = '0';
    content.style.transform = 'translateY(5px)';
    content.style.transition = 'all 0.15s ease-out';

    const navItems = document.querySelectorAll('.nav-menu .nav-item');
    navItems.forEach(i => i.classList.remove('active'));

    let activeItem = [...navItems].find(item => item.textContent.toLowerCase().includes(view.toLowerCase()));
    if (activeItem) activeItem.classList.add('active');

    // Mostrar skeleton inmediatamente para feedback visual
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
    const [statsRes, accessRes] = await Promise.all([
        apiRequest('/stats'),
        apiRequest('/accesos')
    ]);

    const stats = statsRes?.data?.stats || { users: 0, accessToday: 0, devices: 0, alerts: 0 };
    const recentAccess = (accessRes?.data?.data || accessRes?.data || []).slice(0, 5);

    const grid = [
        { label: 'Usuarios Activos', val: stats.users, icon: '👥', color: 'var(--accent-blue)' },
        { label: 'Accesos Hoy', val: stats.accessToday, icon: '🚪', color: 'var(--accent-green)' },
        { label: 'Equipos Tech', val: stats.tech, icon: '💻', color: 'var(--accent-lavender)' },
        { label: 'Vehículos', val: stats.vehicles, icon: '🚗', color: 'var(--accent-emerald)' },
        { label: 'Alertas', val: stats.alerts, icon: '⚠️', color: 'var(--error-color)' }
    ];

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
async function renderDispositivos(container) {
    const { ok, data } = await apiRequest('/dispositivos');
    if (!ok) return;
    // Filtrar: Solo dispositivos sin medio de transporte (tecnología)
    const techData = (data.data || data).filter(d => !d.medio_transporte_id);

    renderModuleHeader(container, { buttonId: 'btnAddDevice', buttonText: '+ Dispositivo', buttonColor: 'var(--accent-blue)', searchPlaceholder: 'Buscar equipo...', module: 'dispositivos' });
    const div = document.createElement('div');
    div.className = "data-table-container";
    div.id = "moduleTableContainer";
    div.innerHTML = generateDeviceTable(techData);
    container.appendChild(div);
    setupModuleEvents(container, 'dispositivos');
}

async function renderVehiculos(container) {
    const { ok, data } = await apiRequest('/dispositivos');
    if (!ok) return;
    // Filtrar: Solo aquellos que tienen medio de transporte
    const vehicleData = (data.data || data).filter(d => d.medio_transporte_id);

    renderModuleHeader(container, { buttonId: 'btnAddVehicle', buttonText: '+ Vehículo', buttonColor: 'var(--accent-lavender)', searchPlaceholder: 'Buscar placa...', module: 'vehiculos' });
    const div = document.createElement('div');
    div.className = "data-table-container";
    div.id = "moduleTableContainer";
    div.innerHTML = generateVehicleTable(vehicleData);
    container.appendChild(div);
    setupModuleEvents(container, 'vehiculos');
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

    searchInput.oninput = () => {
        const term = searchInput.value.toLowerCase();
        const filtered = currentData.filter(item => JSON.stringify(item).toLowerCase().includes(term));
        if (type === 'usuarios') tableContainer.innerHTML = generateUserTable(filtered);
        else if (type === 'dispositivos') tableContainer.innerHTML = generateDeviceTable(filtered);
        else if (type === 'vehiculos') tableContainer.innerHTML = generateVehicleTable(filtered);
        else if (type === 'accesos') tableContainer.innerHTML = generateAccessTable(filtered);
        else if (type === 'logs') tableContainer.innerHTML = generateAuditTable(filtered);
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
            return;
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

    const finalRes = await apiRequest(url, method, payload);
    if (finalRes.ok) {
        showToast(id ? 'Actualizado correctamente' : 'Creado correctamente', 'success');
        closeModal();
        loadView(type);
    } else {
        showToast(finalRes.data?.error || "Error al guardar", "error");
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
                        <button class="btn-table" onclick="closeModal(); showModal('vehiculos')" style="font-size:10px; padding:2px 5px;">+ Añadir</button>
                    </h4>
                    ${userVehicles.length ? userVehicles.map(v => `
                        <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:8px; margin-bottom:6px; border:1px solid var(--border-color);">
                            <div style="font-weight:600; font-size:12px;">${v.nombre}</div>
                            <div style="color:var(--accent-green); font-size:11px; font-family:monospace;">Placa: ${v.identificador_unico}</div>
                        </div>
                    `).join('') : `
                        <div style="text-align:center; padding:10px; opacity:0.6;">
                            <p style="font-size:11px; margin-bottom:10px;">No tiene vehículos registrados</p>
                            <button class="btn-table" onclick="closeModal(); showModal('vehiculos')" style="width:100%; border:1px dashed var(--accent-green); color:var(--accent-green);">Vincular primer vehículo</button>
                        </div>
                    `}
                </div>
                <div class="card" style="background:rgba(255,255,255,0.02); padding:15px; border:1px solid var(--border-color);">
                    <h4 style="margin-bottom:12px; font-size:14px; display:flex; justify-content:space-between;">
                        💻 Equipos Tech
                        <button class="btn-table" onclick="closeModal(); showModal('dispositivos')" style="font-size:10px; padding:2px 5px;">+ Añadir</button>
                    </h4>
                    ${userTech.length ? userTech.map(t => `
                        <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:8px; margin-bottom:6px; border:1px solid var(--border-color);">
                            <div style="font-weight:600; font-size:12px;">${t.nombre}</div>
                            <div style="opacity:0.6; font-size:10px;">SN: ${t.identificador_unico}</div>
                        </div>
                    `).join('') : `
                        <div style="text-align:center; padding:10px; opacity:0.6;">
                            <p style="font-size:11px; margin-bottom:10px;">Sin equipos tecnológicos</p>
                            <button class="btn-table" onclick="closeModal(); showModal('dispositivos')" style="width:100%; border:1px dashed var(--accent-blue); color:var(--accent-blue);">Vincular laptop/tablet</button>
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
        if (btnEditDetail) btnEditDetail.onclick = () => { closeModal(); showModal('usuarios', user); };

    } catch (e) {
        body.innerHTML = `<p style="color:var(--error-color)">Error al cargar la ficha técnica.</p>`;
    }
}

window.showUserDetail = showUserDetail;

