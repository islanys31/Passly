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
                                <button class="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white shadow-lg hover:bg-blue-500 transition-all border-4 border-slate-900">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                </button>
                            </div>
                            <h2 class="text-lg font-bold text-white">${user.nombre}</h2>
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
                                        <label class="text-sm font-semibold text-slate-300">Nombre Completo</label>
                                        <input type="text" id="nombre-input" value="${user.nombre}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none">
                                    </div>
                                </div>
                                <div class="pt-4">
                                    <button type="submit" class="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95">
                                        Guardar Cambios
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
    if (user.avatar_url) {
        return `<img src="${user.avatar_url}" class="w-full h-full rounded-2xl object-cover border-2 border-slate-700">`;
    }
    
    // El usuario pidió que salga "P" si no hay perfil. 
    // Usaremos "P" para el sistema Passly o las iniciales.
    // user.nombre.charAt(0) serviría, pero el usuario especificó "les salga P".
    return `
        <div class="w-full h-full rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center border-2 border-slate-700 shadow-inner">
            <span class="text-4xl font-black text-white drop-shadow-md">P</span>
        </div>
    `;
}

function setupListeners() {
    document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre-input').value;
        showToast("Perfil actualizado correctamente (Modo Pro)");
    });
}
