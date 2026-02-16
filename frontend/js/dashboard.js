/**
 * Passly - Panel de Control Principal
 */
import { apiRequest, checkAuth, handleLogout } from './api.js';
import { initTheme } from './theme.js';
import { showToast, escapeHTML } from './utils.js';

let userData = null;

document.addEventListener('DOMContentLoaded', async () => {
    userData = checkAuth();
    if (!userData) return;

    initTheme();
    setupUI();
    await loadView('overview');
    setupSocket();
});

function setupUI() {
    document.getElementById('userName').textContent = `${userData.nombre} ${userData.apellido || ''}`;
    document.getElementById('userInitial').textContent = userData.nombre.charAt(0).toUpperCase();
    document.getElementById('userRole').textContent =
        userData.rol_id === 1 ? 'Administrador' :
            (userData.rol_id === 3 ? 'Seguridad' : 'Usuario');

    // Sidebar navigation
    const navItems = document.querySelectorAll('.nav-menu .nav-item');
    const views = ['overview', 'usuarios', 'dispositivos', 'accesos'];

    navItems.forEach((item, index) => {
        item.onclick = () => loadView(views[index]);
    });

    document.querySelector('.sidebar-footer .nav-item').onclick = () => {
        if (confirm('¿Deseas cerrar sesión?')) handleLogout();
    };
}

function setupSocket() {
    if (typeof io !== 'undefined') {
        const socket = io();
        socket.on('stats_update', () => {
            const activeNav = document.querySelector('.nav-item.active');
            if (activeNav && activeNav.textContent.includes('Inicio')) {
                renderOverview(document.getElementById('view-content'));
            }
            showToast("Estadísticas sincronizadas en tiempo real", "info");
        });
    }
}

async function loadView(view) {
    const content = document.getElementById('view-content');
    const title = document.getElementById('view-title');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        const text = item.textContent.trim().toLowerCase();
        if (view === 'overview' && text.includes('inicio')) item.classList.add('active');
        else if (text.includes(view)) item.classList.add('active');
    });

    content.innerHTML = '<div class="loading">Sincronizando con el servidor...</div>';

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
            title.textContent = "Control de Accesos";
            await renderAccesos(content);
            break;
    }
}

// --- RENDERERS ---

async function renderOverview(container) {
    const res = await apiRequest('/stats');
    const stats = res?.data?.stats || { usuariosActivos: 0, accesosHoy: 0, dispositivosActivos: 0, alertas: 0 };

    const grid = [
        { label: 'Usuarios Activos', val: stats.usuariosActivos, icon: '👥' },
        { label: 'Accesos Hoy', val: stats.accesosHoy, icon: '🚪' },
        { label: 'Dispositivos', val: stats.dispositivosActivos, icon: '📱' },
        { label: 'Alertas', val: stats.alertas, icon: '⚠️' }
    ];

    container.innerHTML = `
        <div class="stats-grid">
            ${grid.map(s => `
                <div class="stat-card">
                    <h3>${s.label}</h3>
                    <div class="value">${s.val}</div>
                    <div style="font-size: 24px; margin-top: 10px;">${s.icon}</div>
                </div>
            `).join('')}
        </div>
        <div class="card" style="margin-top:20px; text-align:left;">
            <h3>Panel de Monitoreo Passly</h3>
            <p style="color:var(--text-secondary); margin-top:10px;">
                Bienvenido, ${escapeHTML(userData.nombre)}. Todas las transacciones están siendo auditadas bajo el estándar de Hardening.
            </p>
        </div>
    `;
}

async function renderUsuarios(container) {
    const { ok, data } = await apiRequest('/usuarios');
    if (!ok) return container.innerHTML = '<p>Error de conexión.</p>';

    container.innerHTML = `
        <div class="data-table-container">
            <table>
                <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                    ${data.map(u => `
                        <tr>
                            <td><strong>${escapeHTML(u.nombre)} ${escapeHTML(u.apellido || '')}</strong></td>
                            <td>${escapeHTML(u.email)}</td>
                            <td><span class="badge badge-info">${u.rol_id === 1 ? 'Admin' : (u.rol_id === 3 ? 'Seguridad' : 'Usuario')}</span></td>
                            <td><span class="badge ${u.estado_id === 1 ? 'badge-success' : 'badge-danger'}">${u.estado_id === 1 ? 'Activo' : 'Inactivo'}</span></td>
                            <td><button class="btn-table btn-edit-user" data-user='${JSON.stringify(u)}'>✏️</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.onclick = () => showModal('user', JSON.parse(btn.getAttribute('data-user')));
    });
}

async function renderDispositivos(container) {
    const { ok, data } = await apiRequest('/dispositivos');
    if (!ok) return;

    container.innerHTML = `
        <div style="margin-bottom: 20px; text-align: right;">
            <button class="btn-table" id="btnAddDevice">+ Nuevo Dispositivo</button>
        </div>
        <div class="data-table-container">
            <table>
                <thead><tr><th>Dispositivo</th><th>Usuario</th><th>UID</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                    ${data.map(d => `
                        <tr>
                            <td><strong>${escapeHTML(d.nombre)}</strong><br><small>${escapeHTML(d.medio_transporte || '')}</small></td>
                            <td>${escapeHTML(d.usuario_nombre || 'N/A')}</td>
                            <td><code>${escapeHTML(d.identificador_unico)}</code></td>
                            <td><span class="badge ${d.estado_id === 1 ? 'badge-success' : 'badge-danger'}">${d.estado_id === 1 ? 'Activo' : 'Inactivo'}</span></td>
                            <td><button class="btn-table btn-edit-device" data-device='${JSON.stringify(d)}'>✏️</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('btnAddDevice').onclick = () => showModal('add_device');
    container.querySelectorAll('.btn-edit-device').forEach(btn => {
        btn.onclick = () => showModal('device', JSON.parse(btn.getAttribute('data-device')));
    });
}

async function renderAccesos(container) {
    const { ok, data } = await apiRequest('/accesos');
    if (!ok) return;

    container.innerHTML = `
        <div style="margin-bottom: 20px; text-align: right;">
            <button class="btn-table" id="btnLogAccess">+ Registrar Acceso</button>
        </div>
        <div class="data-table-container">
            <table>
                <thead><tr><th>Fecha</th><th>Usuario</th><th>Tipo</th><th>Detalles</th></tr></thead>
                <tbody>
                    ${data.map(a => `
                        <tr>
                            <td>${new Date(a.fecha_hora).toLocaleString()}</td>
                            <td><strong>${escapeHTML(a.usuario_nombre)} ${escapeHTML(a.usuario_apellido || '')}</strong></td>
                            <td><span class="badge ${a.tipo === 'Entrada' ? 'badge-success' : 'badge-info'}">${a.tipo}</span></td>
                            <td>${escapeHTML(a.dispositivo_nombre || 'Peatonal')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('btnLogAccess').onclick = () => showModal('add_access');
}

// --- MODALS SYSTEM ---

async function showModal(type, data = null) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const saveBtn = document.getElementById('btnSave');

    overlay.style.display = 'flex';
    body.innerHTML = '';

    if (type === 'user') {
        title.textContent = `Editar Usuario: ${data.nombre}`;
        body.innerHTML = `
            <input type="text" id="mNombre" value="${data.nombre}" placeholder="Nombre">
            <input type="text" id="mApellido" value="${data.apellido || ''}" placeholder="Apellido">
            <input type="email" id="mEmail" value="${data.email}" placeholder="Email">
            <select id="mRol">
                <option value="1" ${data.rol_id === 1 ? 'selected' : ''}>Admin</option>
                <option value="2" ${data.rol_id === 2 ? 'selected' : ''}>Usuario</option>
                <option value="3" ${data.rol_id === 3 ? 'selected' : ''}>Seguridad</option>
            </select>
            <select id="mEstado">
                <option value="1" ${data.estado_id === 1 ? 'selected' : ''}>Activo</option>
                <option value="2" ${data.estado_id === 2 ? 'selected' : ''}>Inactivo</option>
            </select>
        `;
        saveBtn.onclick = async () => {
            const payload = {
                nombre: document.getElementById('mNombre').value,
                apellido: document.getElementById('mApellido').value,
                email: document.getElementById('mEmail').value,
                rol_id: parseInt(document.getElementById('mRol').value),
                estado_id: parseInt(document.getElementById('mEstado').value)
            };
            const res = await apiRequest(`/usuarios/${data.id}`, 'PUT', payload);
            if (res.ok) {
                showToast("Usuario actualizado", "success");
                closeModal();
                loadView('usuarios');
            }
        };
    } else if (type === 'add_device') {
        title.textContent = "Registrar Nuevo Dispositivo";
        const [medios, usuarios] = await Promise.all([apiRequest('/medios-transporte'), apiRequest('/usuarios')]);

        body.innerHTML = `
            <input type="text" id="mDevName" placeholder="Ejem: Toyota Hilux">
            <input type="text" id="mDevUid" placeholder="Placa o Serial">
            <select id="mDevUser">
                <option value="">Seleccionar Dueño</option>
                ${usuarios.data.map(u => `<option value="${u.id}">${u.nombre} ${u.apellido || ''}</option>`).join('')}
            </select>
            <select id="mDevMedio">
                <option value="">Tipo de Transporte</option>
                ${medios.data.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('')}
            </select>
        `;
        saveBtn.onclick = async () => {
            const payload = {
                nombre: document.getElementById('mDevName').value,
                identificador_unico: document.getElementById('mDevUid').value,
                usuario_id: parseInt(document.getElementById('mDevUser').value),
                medio_transporte_id: parseInt(document.getElementById('mDevMedio').value)
            };
            const res = await apiRequest('/dispositivos', 'POST', payload);
            if (res.ok) { showToast("Dispositivo registrado", "success"); closeModal(); loadView('dispositivos'); }
        };
    } else if (type === 'add_access') {
        title.textContent = "Nuevo Control de Acceso";
        const [usuarios, dispositivos] = await Promise.all([apiRequest('/usuarios'), apiRequest('/dispositivos')]);

        body.innerHTML = `
            <select id="mAccUser"><option value="">Seleccionar Persona</option>${usuarios.data.map(u => `<option value="${u.id}">${u.nombre} ${u.apellido || ''}</option>`).join('')}</select>
            <select id="mAccDev"><option value="">Peatonal</option>${dispositivos.data.map(d => `<option value="${d.id}">${d.nombre} (${d.identificador_unico})</option>`).join('')}</select>
            <select id="mAccType"><option value="Entrada">Entrada</option><option value="Salida">Salida</option></select>
            <textarea id="mAccObs" placeholder="Observaciones..." style="width:100%; margin-top:10px; border-radius:10px; padding:10px;"></textarea>
        `;
        saveBtn.onclick = async () => {
            const payload = {
                usuario_id: parseInt(document.getElementById('mAccUser').value),
                dispositivo_id: document.getElementById('mAccDev').value ? parseInt(document.getElementById('mAccDev').value) : null,
                tipo: document.getElementById('mAccType').value,
                observaciones: document.getElementById('mAccObs').value
            };
            const res = await apiRequest('/accesos', 'POST', payload);
            if (res.ok) { showToast("Acceso registrado", "success"); closeModal(); loadView('accesos'); }
        };
    }

    // Close logic
    window.onclick = (e) => { if (e.target === overlay) closeModal(); };
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

window.closeModal = closeModal;
