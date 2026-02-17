/**
 * Passly - Panel de Control Principal (Versión Hardened & Modular)
 */
import { apiRequest, checkAuth, handleLogout } from './api.js';
import { initTheme } from './theme.js';
import { showToast, escapeHTML, validarEmail, validarPassword } from './utils.js';

let userData = null;
let currentData = [];
let currentView = 'overview';

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
    document.getElementById('userInitial').textContent = nombre.charAt(0).toUpperCase();
    document.getElementById('userRole').textContent =
        userData.rol_id === 1 ? 'Administrador' :
            (userData.rol_id === 3 ? 'Seguridad' : 'Usuario');

    // Sidebar navigation
    const navItems = document.querySelectorAll('.nav-menu .nav-item');
    const views = ['overview', 'usuarios', 'dispositivos', 'accesos'];

    navItems.forEach((item, index) => {
        item.onclick = (e) => {
            e.preventDefault();
            loadView(views[index]);
        };
    });

    // Botón de escáner (solo para Seguridad y Admin)
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

/**
 * --- SISTEMA DE NAVEGACIÓN Y VISTAS ---
 */
async function loadView(view) {
    currentView = view;
    const content = document.getElementById('view-content');
    const title = document.getElementById('view-title');

    // Update Sidebar Active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        const text = item.textContent.trim().toLowerCase();
        if (view === 'overview' && text.includes('inicio')) item.classList.add('active');
        else if (text.includes(view)) item.classList.add('active');
    });

    content.innerHTML = `
        <div class="empty-state">
            <div class="loading-spinner" style="width:40px; height:40px; border-width:4px;"></div>
            <p style="margin-top:15px; font-weight:500;">Sincronizando datos seguros...</p>
        </div>
    `;

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
            case 'accesos':
                title.textContent = "Historial de Accesos";
                await renderAccesos(content);
                break;
        }
    } catch (error) {
        console.error("View Error:", error);
        content.innerHTML = `<div class="error-message">Error al cargar la vista. Por favor reintente.</div>`;
    }
}

/**
 * --- RENDERERS ---
 */

async function renderOverview(container) {
    const [statsRes, accessRes] = await Promise.all([
        apiRequest('/stats'),
        apiRequest('/accesos')
    ]);

    const stats = statsRes?.data?.stats || { usuariosActivos: 0, accesosHoy: 0, dispositivosActivos: 0, alertas: 0 };
    const recentAccess = (accessRes?.data?.data || accessRes?.data || []).slice(0, 5);

    const grid = [
        { label: 'Usuarios Activos', val: stats.usuariosActivos, icon: '👥', color: 'var(--accent-blue)' },
        { label: 'Accesos Hoy', val: stats.accesosHoy, icon: '🚪', color: 'var(--accent-green)' },
        { label: 'Dispositivos', val: stats.dispositivosActivos, icon: '📱', color: 'var(--accent-lavender)' },
        { label: 'Alertas', val: stats.alertas, icon: '⚠️', color: 'var(--error-color)' }
    ];

    container.innerHTML = `
        <div class="stats-grid">
            ${grid.map(s => `
                <div class="stat-card" style="border-left: 5px solid ${s.color}">
                    <div class="stat-icon" style="color: ${s.color}">${s.icon}</div>
                    <div class="stat-info">
                        <h3>${s.label}</h3>
                        <div class="value">${s.val}</div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="dashboard-row" style="display: flex; gap: 20px; margin-top: 30px; flex-wrap: wrap;">
            <!-- Fila 1: Actividad y Gráfica -->
            <div class="card" style="flex: 1.5; min-width: 300px; text-align: left; padding: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin:0">🚨 Última Actividad</h3>
                    <button class="btn-table" onclick="loadView('accesos')">Ver Todo</button>
                </div>
                <div class="data-table-container">
                    <table>
                        <thead>
                            <tr><th>Usuario</th><th>Tipo</th><th>Hora</th></tr>
                        </thead>
                        <tbody>
                            ${recentAccess.length ? recentAccess.map(a => `
                                <tr>
                                    <td><strong>${escapeHTML(a.usuario_nombre)}</strong></td>
                                    <td><span class="badge ${a.tipo === 'Entrada' ? 'badge-success' : 'badge-info'}">${a.tipo}</span></td>
                                    <td>${new Date(a.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="3" style="text-align:center">No hay actividad reciente</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card" style="flex: 1; min-width: 300px; text-align: left; padding: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin:0">📈 Tráfico</h3>
                    <div id="socketStatus" class="badge badge-success">● Vivo</div>
                </div>
                <div style="height: 180px; position: relative;">
                    <canvas id="peakHoursChart"></canvas>
                </div>
            </div>

            <div class="card" style="flex: 0.8; min-width: 250px; text-align: center; padding: 25px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <h3 style="margin-bottom: 15px;">🔑 Mi Llave QR</h3>
                <div id="qrContainer" style="width: 150px; height: 150px; background: rgba(255,255,255,0.05); border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--border-color);">
                    <i style="font-size: 30px; opacity: 0.3;">🔲</i>
                </div>
                <div style="display:flex; gap:10px; margin-top:15px; width:100%;">
                    <button class="btn-table" id="btnGenerateQR" style="flex:1; background: var(--accent-green); color: white; font-size:12px; margin:0;">Generar</button>
                    <button class="btn-table" id="btnDownloadQR" style="flex:1; background: var(--bg-secondary); font-size:12px; margin:0; display:none;">Descargar</button>
                </div>
            </div>
        </div>
    `;

    // Inicializar gráfica después de renderizar el contenedor
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
            container.innerHTML = `<img id="currentUserQR" src="${res.data.qr}" style="width: 100%; height: 100%; border-radius: 8px; filter: drop-shadow(0 0 5px rgba(46,125,50,0.3));">`;
            btn.textContent = "Actualizar";
            dlBtn.style.display = 'block';

            dlBtn.onclick = () => {
                const link = document.createElement('a');
                link.download = `Passly_QR_${userData.nombre}.png`;
                link.href = res.data.qr;
                link.click();
                showToast("Descargando imagen...", "info");
            };
        } else {
            showToast("Error al generar QR", "error");
            btn.textContent = "Reintentar";
        }
        btn.disabled = false;
    };
}

/**
 * --- ANALYTICS ENGINE ---
 */
function renderPeakHoursChart(logs) {
    const ctx = document.getElementById('peakHoursChart');
    if (!ctx) return;

    // Procesar datos para la gráfica (Agrupar por hora)
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const data = Array(24).fill(0);

    logs.forEach(log => {
        const hour = new Date(log.fecha_hora).getHours();
        data[hour]++;
    });

    // Destruir instancia previa si existe (importante en SPAs)
    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours.slice(6, 22), // Mostrar de 6am a 10pm para mejor visibilidad
            datasets: [{
                label: 'Entradas/Salidas',
                data: data.slice(6, 22),
                backgroundColor: 'rgba(46, 125, 50, 0.4)',
                borderColor: 'rgb(46, 125, 50)',
                borderWidth: 2,
                borderRadius: 5,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                }
            }
        }
    });
}

async function renderUsuarios(container) {
    const { ok, data } = await apiRequest('/usuarios');
    if (!ok) return;
    currentData = data.data || data;

    renderModuleHeader(container, {
        buttonId: 'btnAddUser',
        buttonText: '+ Nuevo Usuario',
        buttonColor: 'var(--accent-green)',
        searchPlaceholder: 'Buscar por nombre o email...',
        module: 'usuarios'
    });

    const tableHtml = `
        <div class="data-table-container" id="moduleTableContainer">
            ${generateUserTable(data)}
        </div>
    `;
    container.insertAdjacentHTML('beforeend', tableHtml);

    setupModuleEvents(container, 'usuarios');
}

async function renderDispositivos(container) {
    const { ok, data } = await apiRequest('/dispositivos');
    if (!ok) return;
    currentData = data.data || data;

    renderModuleHeader(container, {
        buttonId: 'btnAddDevice',
        buttonText: '+ Nuevo Dispositivo',
        buttonColor: 'var(--accent-blue)',
        searchPlaceholder: 'Buscar por placa o dueño...',
        module: 'dispositivos'
    });

    const tableHtml = `
        <div class="data-table-container" id="moduleTableContainer">
            ${generateDeviceTable(data)}
        </div>
    `;
    container.insertAdjacentHTML('beforeend', tableHtml);

    setupModuleEvents(container, 'dispositivos');
}

async function renderAccesos(container) {
    const { ok, data } = await apiRequest('/accesos');
    if (!ok) return;
    currentData = data.data || data;

    renderModuleHeader(container, {
        buttonId: 'btnLogAccess',
        buttonText: '+ Registro Manual',
        buttonColor: 'var(--accent-lavender)',
        searchPlaceholder: 'Filtrar historial...',
        module: 'accesos',
        hasExport: true,
        hasDateFilter: true
    });

    const tableHtml = `
        <div class="data-table-container" id="moduleTableContainer">
            ${generateAccessTable(data)}
        </div>
    `;
    container.insertAdjacentHTML('beforeend', tableHtml);

    setupModuleEvents(container, 'accesos');
}

/**
 * --- HELPERS DE RENDERIZADO ---
 */

function renderModuleHeader(container, config) {
    container.innerHTML = `
        <div class="table-controls">
            <div class="search-container">
                <i>🔍</i>
                <input type="text" id="moduleSearch" placeholder="${config.searchPlaceholder}">
            </div>
            
            ${config.hasDateFilter ? `
            <div style="display:flex; gap:10px; align-items:center;">
                <input type="date" id="dateStart" style="width:auto; margin:0; padding:8px 12px; font-size:12px;">
                <span style="color:var(--text-muted); font-size:12px;">a</span>
                <input type="date" id="dateEnd" style="width:auto; margin:0; padding:8px 12px; font-size:12px;">
            </div>
            ` : ''}

            <div class="action-buttons">
                ${config.hasExport ? `
                    <button class="btn-export" id="btnExportCSV" title="Descargar Excel">📊 CSV</button>
                    <button class="btn-export" id="btnExportPDF" style="border-color:var(--error-color); color:var(--error-color); background:rgba(239,68,68,0.05);" title="Descargar Reporte Formal">📄 PDF</button>
                ` : ''}
                <button class="btn-table" id="${config.buttonId}" style="background: ${config.buttonColor}; color: ${config.buttonId === 'btnLogAccess' ? '#222' : 'white'}; font-weight:600;">
                    ${config.buttonText}
                </button>
            </div>
        </div>
    `;
}

function setupModuleEvents(container, type) {
    const searchInput = document.getElementById('moduleSearch');
    const tableContainer = document.getElementById('moduleTableContainer');
    const dateStart = document.getElementById('dateStart');
    const dateEnd = document.getElementById('dateEnd');

    const triggerFilter = () => {
        const term = searchInput.value.toLowerCase();
        const start = dateStart?.value ? new Date(dateStart.value) : null;
        const end = dateEnd?.value ? new Date(dateEnd.value) : null;

        const filtered = currentData.filter(item => {
            const searchStr = JSON.stringify(item).toLowerCase();
            const matchesSearch = searchStr.includes(term);

            let matchesDate = true;
            if (type === 'accesos' && (start || end)) {
                const itemDate = new Date(item.fecha_hora);
                itemDate.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
                if (start && itemDate < start) matchesDate = false;
                if (end) {
                    const endDateAdjusted = new Date(end);
                    endDateAdjusted.setHours(23, 59, 59, 999); // Adjust end date to include the whole day
                    if (itemDate > endDateAdjusted) matchesDate = false;
                }
            }

            return matchesSearch && matchesDate;
        });

        if (type === 'usuarios') tableContainer.innerHTML = generateUserTable(filtered);
        else if (type === 'dispositivos') tableContainer.innerHTML = generateDeviceTable(filtered);
        else if (type === 'accesos') tableContainer.innerHTML = generateAccessTable(filtered);

        attachTableActionEvents(tableContainer, type);
    };

    searchInput.oninput = triggerFilter;
    if (dateStart) dateStart.onchange = triggerFilter;
    if (dateEnd) dateEnd.onchange = triggerFilter;

    // Actions
    if (type === 'usuarios') document.getElementById('btnAddUser').onclick = () => showModal('add_user');
    if (type === 'dispositivos') document.getElementById('btnAddDevice').onclick = () => showModal('add_device');
    if (type === 'accesos') {
        document.getElementById('btnLogAccess').onclick = () => showModal('add_access');
        document.getElementById('btnExportCSV').onclick = exportCurrentData;
        document.getElementById('btnExportPDF').onclick = exportToPDF;
    }

    attachTableActionEvents(tableContainer, type);
}

function attachTableActionEvents(container, type) {
    container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.onclick = () => {
            const item = JSON.parse(btn.getAttribute('data-item'));
            showModal(type === 'usuarios' ? 'user' : 'device', item);
        };
    });

    container.querySelectorAll('.btn-delete').forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            const endpoint = type === 'usuarios' ? `/usuarios/${id}` : `/dispositivos/${id}`;
            if (confirm(`¿Estás seguro de desactivar este registro?`)) {
                const res = await apiRequest(endpoint, 'DELETE');
                if (res.ok) {
                    showToast("Registro actualizado correctamente", "success");
                    loadView(type);
                }
            }
        };
    });
}

/**
 * --- GENERADORES DE TABLAS ---
 */

function generateUserTable(data) {
    if (!data.length) return `<div class="empty-state"><i>🔍</i> No se encontraron usuarios.</div>`;
    return `
        <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
                ${data.map(u => `
                    <tr>
                        <td><strong>${escapeHTML(u.nombre)} ${escapeHTML(u.apellido || '')}</strong></td>
                        <td>${escapeHTML(u.email)}</td>
                        <td><span class="badge badge-info">${u.rol_id === 1 ? 'Admin' : (u.rol_id === 3 ? 'Seguridad' : 'Usuario')}</span></td>
                        <td><span class="badge ${u.estado_id === 1 ? 'badge-success' : 'badge-danger'}">${u.estado_id === 1 ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                            <button class="btn-table btn-edit" data-item='${JSON.stringify(u)}'>✏️</button>
                            <button class="btn-table btn-delete" data-id="${u.id}" style="color:var(--error-color)">🗑️</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function generateDeviceTable(data) {
    if (!data.length) return `<div class="empty-state"><i>🔍</i> No hay dispositivos registrados.</div>`;
    return `
        <table>
            <thead><tr><th>Dispositivo</th><th>Usuario</th><th>UID / Placa</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
                ${data.map(d => `
                    <tr>
                        <td><strong>${escapeHTML(d.nombre)}</strong><br><small>${escapeHTML(d.medio_transporte || 'Particular')}</small></td>
                        <td>${escapeHTML(d.usuario_nombre || 'No asignado')}</td>
                        <td><code>${escapeHTML(d.identificador_unico)}</code></td>
                        <td><span class="badge ${d.estado_id === 1 ? 'badge-success' : 'badge-danger'}">${d.estado_id === 1 ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                            <button class="btn-table btn-edit" data-item='${JSON.stringify(d)}'>✏️</button>
                            <button class="btn-table btn-delete" data-id="${d.id}" style="color:var(--error-color)">🗑️</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function generateAccessTable(data) {
    if (!data.length) return `<div class="empty-state"><i>🚪</i> No hay accesos registrados aún.</div>`;
    return `
        <table id="accesosTable">
            <thead><tr><th>Fecha / Hora</th><th>Usuario</th><th>Tipo</th><th>Medio / Detalle</th></tr></thead>
            <tbody>
                ${data.map(a => `
                    <tr>
                        <td style="font-family: var(--font-metrics); font-size:13px;">${new Date(a.fecha_hora).toLocaleString()}</td>
                        <td><strong>${escapeHTML(a.usuario_nombre)} ${escapeHTML(a.usuario_apellido || '')}</strong></td>
                        <td><span class="badge ${a.tipo === 'Entrada' ? 'badge-success' : 'badge-info'}">${a.tipo}</span></td>
                        <td>${escapeHTML(a.dispositivo_nombre || 'Puerta Peatonal')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

/**
 * --- SISTEMA DE EXPORTACIÓN ---
 */
function exportCurrentData() {
    if (!currentData.length) return showToast("No hay datos para exportar", "error");

    // Header
    let csv = "Fecha,Usuario,Apellido,Tipo,Detalle\n";

    // Rows
    currentData.forEach(row => {
        csv += `"${new Date(row.fecha_hora).toLocaleString()}",`;
        csv += `"${row.usuario_nombre}","${row.usuario_apellido || ''}",`;
        csv += `"${row.tipo}","${row.dispositivo_nombre || 'Peatonal'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Passly_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Reporte exportado como CSV", "success");
}

function exportToPDF() {
    if (!currentData.length) return showToast("No hay datos para el reporte", "error");

    // Intentar obtener el constructor jsPDF de varias fuentes posibles
    const jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

    if (!jsPDF) {
        return showToast("La librería PDF aún se está cargando o fue bloqueada. Intente de nuevo en segundos.", "error");
    }

    const doc = new jsPDF();

    // Estilo de encabezado
    doc.setFillColor(46, 125, 50); // Verde Passly
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("PASSLY - Reporte de Seguridad", 15, 25);

    doc.setFontSize(10);
    doc.text(`Generado por: ${userData.nombre} ${userData.apellido || ''}`, 15, 33);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 150, 33);

    // Tabla de datos
    const tableData = currentData.map(row => [
        new Date(row.fecha_hora).toLocaleString(),
        `${row.usuario_nombre} ${row.usuario_apellido || ''}`,
        row.tipo,
        row.dispositivo_nombre || 'Peatonal'
    ]);

    doc.autoTable({
        startY: 50,
        head: [['Fecha/Hora', 'Usuario', 'Evento', 'Detalle/Medio']],
        body: tableData,
        headStyles: { fillColor: [46, 125, 50] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        styles: { fontSize: 9 }
    });

    doc.save(`Passly_Reporte_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast("PDF generado correctamente", "success");
}

/**
 * --- SISTEMA DE MODALES ---
 */
async function showModal(type, data = null) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const saveBtn = document.getElementById('btnSave');

    overlay.style.display = 'flex';
    body.innerHTML = '';
    saveBtn.textContent = "Procesar Cambios";
    saveBtn.disabled = false;

    if (type === 'user' || type === 'add_user' || type === 'usuarios') {
        const isEdit = type === 'user';
        title.textContent = isEdit ? `Editar: ${data.nombre}` : "Nuevo Usuario Maestro";
        body.innerHTML = `
            <input type="text" id="mNombre" value="${data?.nombre || ''}" placeholder="Nombre(s)">
            <input type="text" id="mApellido" value="${data?.apellido || ''}" placeholder="Apellido(s)">
            <input type="email" id="mEmail" value="${data?.email || ''}" placeholder="Correo Electrónico @gmail.com">
            ${!isEdit ? '<input type="password" id="mPassword" placeholder="Contraseña Temporal">' : ''}
            <select id="mRol">
                <option value="1" ${data?.rol_id === 1 ? 'selected' : ''}>Administrador</option>
                <option value="2" ${data?.rol_id === 2 ? 'selected' : ''}>Usuario Residente</option>
                <option value="3" ${data?.rol_id === 3 ? 'selected' : ''}>Personal de Seguridad</option>
            </select>
            ${isEdit ? `
            <select id="mEstado">
                <option value="1" ${data?.estado_id === 1 ? 'selected' : ''}>Estado: Activo</option>
                <option value="2" ${data?.estado_id === 2 ? 'selected' : ''}>Estado: Suspendido / Inactivo</option>
            </select>
            <div style="margin-top: 15px; padding: 15px; background: var(--bg-secondary); border-radius: 12px;">
                <label style="display: block; color: var(--text-muted); font-size: 12px; margin-bottom: 8px;">📸 Foto de Perfil (Opcional)</label>
                ${data?.foto_url ? `<img src="${data.foto_url}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 3px solid var(--accent-green);">` : ''}
                <input type="file" id="mPhoto" accept="image/jpeg,image/png" style="width: 100%; padding: 8px; background: var(--bg-primary); border: 2px dashed var(--border-color); border-radius: 8px; color: var(--text-primary); cursor: pointer;">
                <small style="display: block; margin-top: 5px; color: var(--text-muted);">JPG o PNG, máx. 2MB</small>
            </div>` : ''}
        `;
        saveBtn.onclick = async () => {
            const payload = {
                nombre: document.getElementById('mNombre').value.trim(),
                apellido: document.getElementById('mApellido').value.trim(),
                email: document.getElementById('mEmail').value.trim(),
                rol_id: parseInt(document.getElementById('mRol').value),
                cliente_id: 1
            };
            if (isEdit) payload.estado_id = parseInt(document.getElementById('mEstado').value);
            if (!isEdit) payload.password = document.getElementById('mPassword').value;

            // Hardened validation
            if (!payload.nombre || !payload.apellido || !payload.email) {
                return showToast("Todos los campos personales son obligatorios", "error");
            }

            if (!validarEmail(payload.email)) {
                return showToast("Correo no válido (debe ser @gmail.com o @hotmail.com en minúsculas)", "error");
            }

            if (!isEdit) {
                const passError = validarPassword(payload.password);
                if (passError) return showToast(`Contraseña: ${passError}`, "error");
            }

            saveBtn.disabled = true;
            const endpoint = isEdit ? `/usuarios/${data.id}` : '/usuarios';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await apiRequest(endpoint, method, payload);
            if (res.ok) {
                // Si hay foto y es edición, subirla
                if (isEdit) {
                    const photoInput = document.getElementById('mPhoto');
                    if (photoInput && photoInput.files && photoInput.files[0]) {
                        const formData = new FormData();
                        formData.append('photo', photoInput.files[0]);

                        const photoRes = await fetch(`/api/usuarios/${data.id}/photo`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                            body: formData
                        });

                        if (photoRes.ok) {
                            showToast("Usuario y foto actualizados", "success");
                        } else {
                            showToast("Usuario actualizado, pero hubo un error con la foto", "warning");
                        }
                    } else {
                        showToast("Usuario actualizado", "success");
                    }
                } else {
                    showToast("Usuario creado", "success");
                }
                closeModal();
                loadView('usuarios');
            } else {
                showToast(res.data?.error || "Error en el servidor", "error");
                saveBtn.disabled = false;
            }
        };
    } else if (type === 'device' || type === 'add_device' || type === 'dispositivos') {
        const isEdit = type === 'device';
        title.textContent = isEdit ? "Editar Dispositivo" : "Vincular Nuevo Dispositivo";

        body.innerHTML = `<div class="loading">Cargando catálogos...</div>`;
        const [medios, usuarios] = await Promise.all([apiRequest('/medios-transporte'), apiRequest('/usuarios')]);

        body.innerHTML = `
            <input type="text" id="mDevName" value="${data?.nombre || ''}" placeholder="Ejem: Ford Raptor / Placa XYZ-123">
            <input type="text" id="mDevUid" value="${data?.identificador_unico || ''}" placeholder="Serial / Placa">
            <select id="mDevUser">
                <option value="">-- Seleccionar Propietario --</option>
                ${usuarios.data.map(u => `<option value="${u.id}" ${data?.usuario_id === u.id ? 'selected' : ''}>${u.nombre} ${u.apellido || ''}</option>`).join('')}
            </select>
            <select id="mDevMedio">
                <option value="">-- Medio de Transporte --</option>
                ${medios.data.map(m => `<option value="${m.id}" ${m.id === data?.medio_transporte_id ? 'selected' : ''}>${m.nombre}</option>`).join('')}
            </select>
        `;
        // Correction for selection logic in template literal
        const medioSelect = body.querySelector('#mDevMedio');
        medioSelect.innerHTML = `<option value="">-- Medio de Transporte --</option>` +
            medios.data.map(m => `<option value="${m.id}" ${m.id === data?.medio_transporte_id ? 'selected' : ''}>${m.nombre}</option>`).join('');

        saveBtn.onclick = async () => {
            const payload = {
                nombre: document.getElementById('mDevName').value,
                identificador_unico: document.getElementById('mDevUid').value,
                usuario_id: parseInt(document.getElementById('mDevUser').value),
                medio_transporte_id: parseInt(document.getElementById('mDevMedio').value),
                estado_id: 1
            };
            if (isEdit) payload.estado_id = data.estado_id;

            const endpoint = isEdit ? `/dispositivos/${data.id}` : '/dispositivos';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await apiRequest(endpoint, method, payload);
            if (res.ok) { showToast("Dispositivo sincronizado", "success"); closeModal(); loadView('dispositivos'); }
        };
    } else if (type === 'add_access') {
        title.textContent = "Registro de Acceso / Invitación";
        const [usuarios, dispositivos] = await Promise.all([apiRequest('/usuarios'), apiRequest('/dispositivos')]);

        body.innerHTML = `
            <div style="display:flex; border-bottom:1px solid var(--border-color); margin-bottom:20px;">
                <button id="tabManual" style="flex:1; background:none; color:var(--accent-green); border-bottom:2px solid var(--accent-green); border-radius:0; margin:0; padding:10px;">Manual</button>
                <button id="tabGuest" style="flex:1; background:none; color:var(--text-muted); border-radius:0; margin:0; padding:10px;">Nuevo Invitado (QR)</button>
            </div>
            
            <div id="panelManual">
                <select id="mAccUser"><option value="">-- Persona Registrada --</option>${usuarios.data.data ? usuarios.data.data.map(u => `<option value="${u.id}">${u.nombre} ${u.apellido || ''}</option>`).join('') : ''}</select>
                <select id="mAccDev"><option value="">-- Acceso Peatonal (Manual) --</option>${dispositivos.data.data ? dispositivos.data.data.filter(d => d.estado_id === 1).map(d => `<option value="${d.id}">${d.nombre} (${d.identificador_unico})</option>`).join('') : ''}</select>
                <select id="mAccType"><option value="Entrada">Registrar: Entrada</option><option value="Salida">Registrar: Salida</option></select>
                <textarea id="mAccObs" placeholder="Motivo o detalle del acceso manual..." style="width:100%; margin-top:10px; border:2px solid var(--border-color); background:var(--bg-secondary); color:white; border-radius:12px; padding:12px; min-height:80px; font-family:inherit;"></textarea>
            </div>

            <div id="panelGuest" style="display:none;">
                <input type="text" id="mGuestName" placeholder="Nombre completo del invitado">
                <div style="text-align:left; margin-bottom:8px;"><small style="color:var(--text-muted)">Tiempo de validez (horas):</small></div>
                <select id="mGuestExp">
                    <option value="4">4 Horas (Visita corta)</option>
                    <option value="12">12 Horas (Día completo)</option>
                    <option value="24">24 Horas (Un día)</option>
                    <option value="48">48 Horas (Fin de semana)</option>
                    <option value="168">1 Semana (Permiso extendido)</option>
                </select>
                <div id="guestQRResult" style="margin-top:20px; text-align:center;"></div>
            </div>
        `;

        const tabManual = body.querySelector('#tabManual');
        const tabGuest = body.querySelector('#tabGuest');
        const panelManual = body.querySelector('#panelManual');
        const panelGuest = body.querySelector('#panelGuest');

        tabManual.onclick = () => {
            panelManual.style.display = 'block';
            panelGuest.style.display = 'none';
            tabManual.style.color = 'var(--accent-green)';
            tabManual.style.borderBottom = '2px solid var(--accent-green)';
            tabGuest.style.color = 'var(--text-muted)';
            tabGuest.style.borderBottom = 'none';
            saveBtn.textContent = "Confirmar Registro";
            saveBtn.style.display = 'block';
        };

        tabGuest.onclick = () => {
            panelManual.style.display = 'none';
            panelGuest.style.display = 'block';
            tabGuest.style.color = 'var(--accent-blue)';
            tabGuest.style.borderBottom = '2px solid var(--accent-blue)';
            tabManual.style.color = 'var(--text-muted)';
            tabManual.style.borderBottom = 'none';
            saveBtn.textContent = "Generar Invitación QR";
            saveBtn.style.display = 'block';
        };

        saveBtn.textContent = "Confirmar Registro";
        saveBtn.onclick = async () => {
            if (panelManual.style.display !== 'none') {
                const payload = {
                    usuario_id: parseInt(document.getElementById('mAccUser').value),
                    dispositivo_id: document.getElementById('mAccDev').value ? parseInt(document.getElementById('mAccDev').value) : null,
                    tipo: document.getElementById('mAccType').value,
                    observaciones: document.getElementById('mAccObs').value
                };
                if (!payload.usuario_id) return showToast("Seleccione un usuario", "error");

                const res = await apiRequest('/accesos', 'POST', payload);
                if (res.ok) { showToast("Acceso forzado exitosamente", "success"); closeModal(); loadView('accesos'); }
            } else {
                const guestName = document.getElementById('mGuestName').value.trim();
                const expirationHours = parseInt(document.getElementById('mGuestExp').value);

                if (!guestName) return showToast("Escriba el nombre del invitado", "error");

                saveBtn.disabled = true;
                const res = await apiRequest('/accesos/invitation', 'POST', { guestName, expirationHours });
                if (res.ok) {
                    const qrResult = document.getElementById('guestQRResult');
                    qrResult.innerHTML = `
                        <img src="${res.data.qr}" style="width:200px; border-radius:12px; margin-bottom:10px; border:4px solid white;">
                        <p style="font-size:12px; color:var(--accent-green);">Válido hasta: ${res.data.expiresAt}</p>
                        <button class="btn-table" onclick="this.parentElement.innerHTML='Copiado!'; showToast('Enlace copiado al portapapeles', 'info');" style="margin-top:10px; background:var(--bg-secondary);">Compartir Imagen</button>
                    `;
                    saveBtn.style.display = 'none';
                    showToast("Invitación generada correctamente", "success");
                }
                saveBtn.disabled = false;
            }
        };
    }

    window.onclick = (e) => { if (e.target === overlay) closeModal(); };
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

/**
 * --- WEBSOCKETS ENGINE ---
 */
function setupSocket() {
    if (typeof io !== 'undefined') {
        const socket = io();

        socket.on('connect', () => {
            const statusEl = document.getElementById('socketStatus');
            if (statusEl) {
                statusEl.className = 'badge badge-success';
                statusEl.textContent = '● Online';
            }
        });

        socket.on('disconnect', () => {
            const statusEl = document.getElementById('socketStatus');
            if (statusEl) {
                statusEl.className = 'badge badge-danger';
                statusEl.textContent = '● Offline';
            }
        });

        socket.on('new_access', (newLog) => {
            showToast(`ALERTA: Acceso de ${newLog.usuario_nombre}`, "info");

            // Live injection if in 'accesos' view
            if (currentView === 'accesos') {
                const tbody = document.querySelector('#accesosTable tbody');
                if (tbody) {
                    const row = `
                        <tr style="animation: highlight 2s ease forwards">
                            <td style="font-family: var(--font-metrics); font-size:13px;">${new Date(newLog.fecha_hora).toLocaleString()}</td>
                            <td><strong>${escapeHTML(newLog.usuario_nombre)} ${escapeHTML(newLog.usuario_apellido || '')}</strong></td>
                            <td><span class="badge ${newLog.tipo === 'Entrada' ? 'badge-success' : 'badge-info'}">${newLog.tipo}</span></td>
                            <td>${escapeHTML(newLog.dispositivo_nombre || 'Puerta Peatonal')}</td>
                        </tr>
                    `;
                    tbody.insertAdjacentHTML('afterbegin', row);
                }
            }

            // Recursive update for overview
            if (currentView === 'overview') {
                renderOverview(document.getElementById('view-content'));
            }
        });

        socket.on('stats_update', () => {
            if (currentView === 'overview') {
                renderOverview(document.getElementById('view-content'));
            }
        });
    }
}

// Global exposure for event handlers
window.closeModal = closeModal;
window.loadView = loadView;
