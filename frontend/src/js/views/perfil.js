/**
 * @file perfil.js
 * @description Vista de gestión de perfil de usuario con soporte para Avatar 'P'.
 */

import { fetchAPI } from '../modules/api_service.js';
import { showToast, getInitialsAvatar } from '../modules/utils.js';

export async function render(container) {
    try {
        const response = await fetchAPI('/auth/me');
        const { user } = await response.json();

        container.innerHTML = `
            <div class="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
                <header class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-extrabold text-white tracking-tight">Mi Perfil</h1>
                        <p class="text-slate-400 mt-1">Gestiona tu identidad y preferencias de seguridad.</p>
                    </div>
                    <div id="profile-status" class="px-4 py-1.5 rounded-full bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20">
                        Sesión Activa
                    </div>
                </header>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- Tarjeta de Identidad -->
                    <div class="md:col-span-1 space-y-6">
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
                            <div class="relative group mx-auto w-32 h-32 mb-4">
                                ${renderAvatar(user)}
                                <button type="button" id="btn-upload-photo" class="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white shadow-lg hover:bg-blue-500 transition-all border-4 border-slate-900" title="Subir foto">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                </button>
                                <button type="button" id="btn-delete-photo" class="absolute top-0 right-0 p-1.5 bg-red-600 rounded-full text-white shadow-lg hover:bg-red-500 transition-all border-4 border-slate-900 ${user.foto_url ? '' : 'hidden'}" title="Eliminar foto">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                                <input type="file" id="photo-upload" accept="image/*" class="hidden">
                            </div>
                            <h2 class="text-lg font-bold text-white" id="display-name">${user.nombre} ${user.apellido || ''}</h2>
                            <p class="text-xs text-blue-400 font-mono mt-1 uppercase tracking-widest">${user.rol_nombre || 'Usuario'}</p>
                        </div>
                    </div>

                    <!-- Configuración -->
                    <div class="md:col-span-2 space-y-6">
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
                            <form id="profile-form" class="space-y-6">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div class="space-y-2">
                                        <label class="text-sm font-semibold text-slate-300">Correo Electrónico</label>
                                        <input type="email" value="${user.email}" disabled class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed">
                                    </div>
                                    <div class="space-y-2">
                                        <label class="text-sm font-semibold text-slate-300">Nombre</label>
                                        <input type="text" id="nombre-input" value="${user.nombre}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none">
                                    </div>
                                    <div class="space-y-2">
                                        <label class="text-sm font-semibold text-slate-300">Apellido</label>
                                        <input type="text" id="apellido-input" value="${user.apellido || ''}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none">
                                    </div>
                                </div>
                                <div class="pt-4">
                                    <button type="submit" id="btn-save" class="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 flex items-center justify-center gap-2">
                                        <span>Guardar Cambios</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupListeners();
    } catch (error) {
        console.error("Error al renderizar perfil:", error);
    }
}

function renderAvatar(user) {
    if (user.foto_url) {
        return `<img src="${user.foto_url}" class="w-full h-full rounded-2xl object-cover border-2 border-slate-700" id="avatar-preview">`;
    }
    
    // El usuario pidió que salga "P" si no hay perfil. 
    // Usaremos "P" para el sistema Passly o las iniciales.
    // user.nombre.charAt(0) serviría, pero el usuario especificó "les salga P".
    return `
        <div id="avatar-preview-container" class="w-full h-full rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center border-2 border-slate-700 shadow-inner overflow-hidden">
            <span class="text-4xl font-black text-white drop-shadow-md">P</span>
        </div>
    `;
}

function setupListeners() {
    // Formulario de actualización de nombre/apellido
    document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSave = document.getElementById('btn-save');
        btnSave.disabled = true;
        btnSave.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Guardando...';

        const nombre = document.getElementById('nombre-input').value.trim();
        const apellido = document.getElementById('apellido-input').value.trim();
        
        try {
            const res = await fetchAPI('/usuarios/me', {
                method: 'PUT',
                body: JSON.stringify({ nombre, apellido })
            });

            if (res.ok) {
                showToast("Perfil actualizado correctamente");
                document.getElementById('display-name').textContent = `${nombre} ${apellido}`;
            } else {
                const data = await res.json();
                showToast(data.error || "Error al actualizar perfil", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error de conexión", "error");
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = '<span>Guardar Cambios</span>';
        }
    });

    // Subida de foto
    const btnUpload = document.getElementById('btn-upload-photo');
    const inputPhoto = document.getElementById('photo-upload');

    btnUpload?.addEventListener('click', () => {
        inputPhoto.click();
    });

    inputPhoto?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview temporal base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewContainer = document.querySelector('.group');
            let img = document.getElementById('avatar-preview');
            if (!img) {
                const placeholder = document.getElementById('avatar-preview-container');
                if (placeholder) placeholder.remove();
                
                img = document.createElement('img');
                img.id = 'avatar-preview';
                img.className = 'w-full h-full rounded-2xl object-cover border-2 border-slate-700';
                // Insertar al inicio
                previewContainer.insertBefore(img, previewContainer.firstChild);
            }
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Subir al backend
        const formData = new FormData();
        formData.append('photo', file);

        try {
            showToast("Subiendo foto...", "info");
            const res = await fetchAPI('/usuarios/me/photo', {
                method: 'POST',
                body: formData
            }, false); // Omitimos los defaults JSON para FormData

            if (res.ok) {
                const data = await res.json();
                showToast("Foto actualizada correctamente");
                if (document.getElementById('btn-delete-photo')) {
                    document.getElementById('btn-delete-photo').classList.remove('hidden');
                }
                if (data.photoUrl && document.getElementById('avatar-preview')) {
                     document.getElementById('avatar-preview').src = data.photoUrl;
                }
            } else {
                const data = await res.json();
                showToast(data.error || "Error al subir foto", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error de conexión al subir", "error");
        }
    });

    const btnDelete = document.getElementById('btn-delete-photo');
    btnDelete?.addEventListener('click', async () => {
        if (!confirm('¿Seguro que deseas eliminar tu foto de perfil?')) return;
        
        try {
            const res = await fetchAPI('/usuarios/me/photo', { method: 'DELETE' });
            if (res.ok) {
                showToast("Foto eliminada correctamente");
                btnDelete.classList.add('hidden');
                
                // Restaurar placeholder 'P'
                const previewContainer = document.querySelector('.group');
                const img = document.getElementById('avatar-preview');
                if (img) img.remove();
                
                const placeholderHtml = `
                    <div id="avatar-preview-container" class="w-full h-full rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center border-2 border-slate-700 shadow-inner overflow-hidden">
                        <span class="text-4xl font-black text-white drop-shadow-md">P</span>
                    </div>
                `;
                previewContainer.insertAdjacentHTML('afterbegin', placeholderHtml);
            } else {
                showToast("Error al eliminar la foto", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Error de conexión al eliminar foto", "error");
        }
    });
}
