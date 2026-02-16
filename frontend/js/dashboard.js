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
    const [statsRes, accessRes] = await Promise.all([
        apiRequest('/stats'),
        apiRequest('/accesos')
    ]);

    const stats = statsRes?.data?.stats || { usuariosActivos: 0, accesosHoy: 0, dispositivosActivos: 0, alertas: 0 };
    const recentAccess = accessRes?.data?.slice(0, 5) || [];

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

        <div class="dashboard-row" style="display: flex; gap: 20px; margin-top: 30px;">
            <div class="card" style="flex: 2; text-align: left; padding: 25px;">
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

            <div class="card" style="flex: 1; text-align: left; padding: 25px; background: linear-gradient(135deg, var(--card-bg), rgba(46, 125, 50, 0.05));">
                <h3 style="margin-bottom: 15px;">🔍 Resumen de Seguridad</h3>
                <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                    Sistema monitoreado bajo el estándar <strong>Passly Hardening v2.0</strong>. 
                </p>
                <ul style="font-size: 12px; color: var(--text-muted); margin-top: 15px; padding-left: 20px;">
                    <li style="margin-bottom:8px;">Encriptación AES-256 activa</li>
                    <li style="margin-bottom:8px;">Logs de auditoría inmutables</li>
                    <li style="margin-bottom:8px;">Protocolo WSS seguro</li>
                </ul>
                <div style="margin-top: 25px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid var(--border-color);">
                    <small style="display:block; margin-bottom:5px;">Canal en Tiempo Real:</small>
                    <span class="badge badge-success" id="socketStatus">● Activo</span>
                </div>
            </div>
        </div>
    `;
}

async function renderUsuarios(container) {
    const { ok, data } = await apiRequest('/usuarios');
    if (!ok) return container.innerHTML = '<p>Error de conexión.</p>';

    container.innerHTML = `
        <div style="margin-bottom: 20px; text-align: right;">
            <button class="btn-table" id="btnAddUser" style="background: var(--accent-green); color: white;">+ Nuevo Usuario</button>
        </div>
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
                            <td>
                                <button class="btn-table btn-edit-user" data-user='${JSON.stringify(u)}'>✏️</button>
                                <button class="btn-table btn-delete-user" data-id="${u.id}" style="color:var(--error-color)">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('btnAddUser').onclick = () => showModal('add_user');
    container.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.onclick = () => showModal('user', JSON.parse(btn.getAttribute('data-user')));
    });
    container.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.onclick = async () => {
            if (confirm('¿Desactivar este usuario?')) {
                const res = await apiRequest(`/usuarios/${btn.dataset.id}`, 'DELETE');
                if (res.ok) { showToast("Usuario desactivado", "info"); loadView('usuarios'); }
            }
        };
    });
}

async function renderDispositivos(container) {
    const { ok, data } = await apiRequest('/dispositivos');
    if (!ok) return;

    container.innerHTML = `
        <div style="margin-bottom: 20px; text-align: right;">
            <button class="btn-table" id="btnAddDevice" style="background: var(--accent-blue); color: white;">+ Nuevo Dispositivo</button>
        </div>
        <div class="data-table-container">
            <table>
                <thead><tr><th>Dispositivo</th><th>Usuario</th><th>UID</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                    ${data.map(d => `
                        <tr>
                            <td><strong>${escapeHTML(d.nombre)}</strong><br><small>${escapeHTML(d.medio_transporte || 'Peatonal')}</small></td>
                            <td>${escapeHTML(d.usuario_nombre || 'N/A')}</td>
                            <td><code>${escapeHTML(d.identificador_unico)}</code></td>
                            <td><span class="badge ${d.estado_id === 1 ? 'badge-success' : 'badge-danger'}">${d.estado_id === 1 ? 'Activo' : 'Inactivo'}</span></td>
                            <td>
                                <button class="btn-table btn-edit-device" data-device='${JSON.stringify(d)}'>✏️</button>
                                <button class="btn-table btn-delete-device" data-id="${d.id}" style="color:var(--error-color)">🗑️</button>
                            </td>
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
    container.querySelectorAll('.btn-delete-device').forEach(btn => {
        btn.onclick = async () => {
            if (confirm('¿Desactivar este dispositivo?')) {
                const res = await apiRequest(`/dispositivos/${btn.dataset.id}`, 'DELETE');
                if (res.ok) { showToast("Dispositivo desactivado", "info"); loadView('dispositivos'); }
            }
        };
    });
}

async function renderAccesos(container) {
    const { ok, data } = await apiRequest('/accesos');
    if (!ok) return;

    container.innerHTML = `
        <div style="margin-bottom: 20px; text-align: right;">
            <button class="btn-table" id="btnLogAccess" style="background: var(--accent-lavender); color: #222;">+ Registrar Acceso Manual</button>
        </div>
        <div class="data-table-container">
            <table id="accesosTable">
                <thead><tr><th>Fecha / Hora</th><th>Usuario</th><th>Tipo</th><th>Dispositivo / Medio</th></tr></thead>
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
    saveBtn.textContent = "Guardar Cambios";

    if (type === 'user' || type === 'add_user') {
        title.textContent = type === 'add_user' ? "Crear Nuevo Usuario" : `Editar: ${data.nombre}`;
        body.innerHTML = `
            <input type="text" id="mNombre" value="${data?.nombre || ''}" placeholder="Nombre">
            <input type="text" id="mApellido" value="${data?.apellido || ''}" placeholder="Apellido">
            <input type="email" id="mEmail" value="${data?.email || ''}" placeholder="Email">
            ${type === 'add_user' ? '<input type="password" id="mPassword" placeholder="Contraseña Temporal">' : ''}
            <select id="mRol">
                <option value="1" ${data?.rol_id === 1 ? 'selected' : ''}>Administrador</option>
                <option value="2" ${data?.rol_id === 2 ? 'selected' : ''}>Usuario Regular</option>
                <option value="3" ${data?.rol_id === 3 ? 'selected' : ''}>Seguridad</option>
            </select>
            <select id="mEstado">
                <option value="1" ${data?.estado_id === 1 ? 'selected' : ''}>Activo</option>
                <option value="2" ${data?.estado_id === 2 ? 'selected' : ''}>Inactivo</option>
            </select>
        `;
        saveBtn.onclick = async () => {
            const payload = {
                nombre: document.getElementById('mNombre').value,
                apellido: document.getElementById('mApellido').value,
                email: document.getElementById('mEmail').value,
                rol_id: parseInt(document.getElementById('mRol').value),
                estado_id: parseInt(document.getElementById('mEstado').value),
                cliente_id: 1
            };
            if (type === 'add_user') payload.password = document.getElementById('mPassword').value;

            const endpoint = type === 'add_user' ? '/usuarios' : `/usuarios/${data.id}`;
            const method = type === 'add_user' ? 'POST' : 'PUT';

            const res = await apiRequest(endpoint, method, payload);
            if (res.ok) {
                showToast(type === 'add_user' ? "Usuario creado" : "Usuario actualizado", "success");
                closeModal();
                loadView('usuarios');
            } else {
                showToast(res.data?.error || "Error al procesar", "error");
            }
        };
    } else if (type === 'device' || type === 'add_device') {
        title.textContent = type === 'add_device' ? "Registrar Dispositivo" : "Editar Dispositivo";
        const [medios, usuarios] = await Promise.all([apiRequest('/medios-transporte'), apiRequest('/usuarios')]);

        body.innerHTML = `
            <input type="text" id="mDevName" value="${data?.nombre || ''}" placeholder="Ejem: Toyota Hilux">
            <input type="text" id="mDevUid" value="${data?.identificador_unico || ''}" placeholder="Placa o Serial">
            <select id="mDevUser">
                <option value="">Seleccionar Dueño</option>
                ${usuarios.data.map(u => `<option value="${u.id}" ${data?.usuario_id === u.id ? 'selected' : ''}>${u.nombre} ${u.apellido || ''}</option>`).join('')}
            </select>
            <select id="mDevMedio">
                <option value="">Tipo de Transporte</option>
                ${medios.data.map(m => `<option value="${m.id}" ${data?.medio_transporte_id === m.id ? 'selected' : ''}>${m.nombre}</option>`).join('')}
            </select>
            ${type !== 'add_device' ? `
            <select id="mDevEstado">
                <option value="1" ${data?.estado_id === 1 ? 'selected' : ''}>Activo</option>
                <option value="2" ${data?.estado_id === 2 ? 'selected' : ''}>Inactivo</option>
            </select>` : ''}
        `;
        saveBtn.onclick = async () => {
            const payload = {
                nombre: document.getElementById('mDevName').value,
                identificador_unico: document.getElementById('mDevUid').value,
                usuario_id: parseInt(document.getElementById('mDevUser').value),
                medio_transporte_id: parseInt(document.getElementById('mDevMedio').value),
            };
            if (type !== 'add_device') payload.estado_id = parseInt(document.getElementById('mDevEstado').value);

            const endpoint = type === 'add_device' ? '/dispositivos' : `/dispositivos/${data.id}`;
            const method = type === 'add_device' ? 'POST' : 'PUT';

            const res = await apiRequest(endpoint, method, payload);
            if (res.ok) { showToast("Dispositivo procesado", "success"); closeModal(); loadView('dispositivos'); }
        };
    } else if (type === 'add_access') {
        title.textContent = "Nuevo Control de Acceso";
        const [usuarios, dispositivos] = await Promise.all([apiRequest('/usuarios'), apiRequest('/dispositivos')]);

        body.innerHTML = `
            <select id="mAccUser"><option value="">Seleccionar Persona</option>${usuarios.data.map(u => `<option value="${u.id}">${u.nombre} ${u.apellido || ''}</option>`).join('')}</select>
            <select id="mAccDev"><option value="">Acceso Peatonal</option>${dispositivos.data.filter(d => d.estado_id === 1).map(d => `<option value="${d.id}">${d.nombre} (${d.identificador_unico})</option>`).join('')}</select>
            <select id="mAccType"><option value="Entrada">Entrada</option><option value="Salida">Salida</option></select>
            <textarea id="mAccObs" placeholder="Observaciones..." style="width:100%; margin-top:10px; border:1px solid var(--border-color); background:var(--bg-secondary); color:white; border-radius:10px; padding:10px;"></textarea>
        `;
        saveBtn.textContent = "Registrar Acceso";
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
window.loadView = loadView;

function setupSocket() {
    if (typeof io !== 'undefined') {
        const socket = io();

        socket.on('connect', () => {
            const statusEl = document.getElementById('socketStatus');
            if (statusEl) statusEl.className = 'badge badge-success';
        });

        socket.on('disconnect', () => {
            const statusEl = document.getElementById('socketStatus');
            if (statusEl) statusEl.className = 'badge badge-danger';
        });

        socket.on('new_access', (newLog) => {
            showToast(`Nuevo acceso: ${newLog.usuario_nombre}`, "info");

            // Actualizar si estamos en Accesos
            const accesosTable = document.getElementById('accesosTable');
            if (accesosTable) {
                const tbody = accesosTable.querySelector('tbody');
                const row = `
                    <tr style="animation: highlight 2s ease">
                        <td>${new Date(newLog.fecha_hora).toLocaleString()}</td>
                        <td><strong>${escapeHTML(newLog.usuario_nombre)} ${escapeHTML(newLog.usuario_apellido || '')}</strong></td>
                        <td><span class="badge ${newLog.tipo === 'Entrada' ? 'badge-success' : 'badge-info'}">${newLog.tipo}</span></td>
                        <td>${escapeHTML(newLog.dispositivo_nombre || 'Peatonal')}</td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('afterbegin', row);
            }

            // Actualizar Overview si está abierto
            const activeNav = document.querySelector('.nav-item.active');
            if (activeNav && activeNav.textContent.includes('Inicio')) {
                renderOverview(document.getElementById('view-content'));
            }
        });

        socket.on('stats_update', () => {
            const activeNav = document.querySelector('.nav-item.active');
            if (activeNav && activeNav.textContent.includes('Inicio')) {
                renderOverview(document.getElementById('view-content'));
            }
        });
    }
}
