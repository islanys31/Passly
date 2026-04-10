/**
 * @file identities.js
 * @description Vista de gestión de usuarios/identidades en Passly Pro.
 */

import { fetchAPI } from '../modules/api.js';
import { showToast, escapeHTML } from '../modules/utils.js';
import { exportToPDF } from '../modules/branding.js';

export async function render(container) {
    container.innerHTML = `
        <div class="p-8 space-y-6 animate-in fade-in duration-500">
            <header class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 class="text-3xl font-black text-white tracking-tight">Identidades</h1>
                    <p class="text-slate-400">Control total sobre el padrón de usuarios y visitantes.</p>
                </div>
                <div class="flex items-center gap-3">
                    <button id="btn-export" class="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all border border-slate-700">
                        <i data-lucide="download" class="w-4 h-4 mr-2"></i> EXPORTAR PDF
                    </button>
                    <button id="btn-add-user" class="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                        <i data-lucide="user-plus" class="w-4 h-4 mr-2"></i> NUEVA IDENTIDAD
                    </button>
                </div>
            </header>

            <div class="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
                <table class="w-full text-left">
                    <thead class="bg-slate-800/50">
                        <tr>
                            <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Usuario</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Rol</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                            <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Último Acceso</th>
                            <th class="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="identities-table-body" class="divide-y divide-slate-800/50">
                        <!-- Filas cargadas dinámicamente -->
                        ${renderTableSkeleton()}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    
    // Simular carga de datos
    setTimeout(() => loadIdentities(), 800);
    setupListeners();
}

function renderTableSkeleton() {
    return Array(5).fill(0).map(() => `
        <tr class="animate-pulse">
            <td class="px-6 py-4"><div class="h-4 bg-slate-800 rounded w-32"></div></td>
            <td class="px-6 py-4"><div class="h-4 bg-slate-800 rounded w-20"></div></td>
            <td class="px-6 py-4"><div class="h-4 bg-slate-800 rounded w-16"></div></td>
            <td class="px-6 py-4"><div class="h-4 bg-slate-800 rounded w-24"></div></td>
            <td class="px-6 py-4 text-right"><div class="h-4 bg-slate-800 rounded w-12 ml-auto"></div></td>
        </tr>
    `).join('');
}

async function loadIdentities() {
    // Simulación de datos para demostración. En real usar fetchAPI('/users')
    const mockUsers = [
        { id: 1, nombre: "Juan Pérez", email: "juan@example.com", rol: "Residente", estado: "Activo", ultimo: "Hace 5 min" },
        { id: 2, nombre: "María Garcia", email: "mgaria@example.com", rol: "Administrador", estado: "Activo", ultimo: "Hoy 08:30" },
        { id: 3, nombre: "Soporte Técnico", email: "tech@passly.com", rol: "Personal", estado: "Inactivo", ultimo: "Ayer" }
    ];

    const tbody = document.getElementById('identities-table-body');
    tbody.innerHTML = mockUsers.map(user => `
        <tr class="group hover:bg-slate-800/30 transition-colors">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center font-bold text-blue-400 text-xs">
                        ${user.nombre.charAt(0)}
                    </div>
                    <div>
                        <p class="text-sm font-bold text-white">${escapeHTML(user.nombre)}</p>
                        <p class="text-[10px] text-slate-500 font-mono">${user.email}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="text-xs text-slate-300 font-medium">${user.rol}</span>
            </td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${user.estado === 'Activo' ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'}">
                    ${user.estado}
                </span>
            </td>
            <td class="px-6 py-4 text-xs text-slate-500 font-mono">${user.ultimo}</td>
            <td class="px-6 py-4 text-right">
                <button class="p-2 text-slate-400 hover:text-white transition-colors"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
            </td>
        </tr>
    `).join('');
    
    if (window.lucide) window.lucide.createIcons();
}

function setupListeners() {
    document.getElementById('btn-export')?.addEventListener('click', () => {
        const columns = ["Nombre", "Email", "Rol", "Estado"];
        const rows = [
            ["Juan Pérez", "juan@example.com", "Residente", "Activo"],
            ["María Garcia", "mgaria@example.com", "Administrador", "Activo"]
        ];
        exportToPDF("Reporte de Identidades", columns, rows, "passly_usuarios", { nombre_sede: "Sede Central" });
    });
}
