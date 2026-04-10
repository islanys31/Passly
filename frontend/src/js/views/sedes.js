/**
 * @file sedes.js
 * @description Vista exclusiva de Super Admin para gestionar múltiples sedes y marca blanca.
 */

import { fetchAPI } from '../modules/api.js';
import { showToast, escapeHTML } from '../modules/utils.js';

export async function render(container) {
    container.innerHTML = `
        <div class="p-8 space-y-6 animate-in fade-in zoom-in duration-500">
            <header>
                <div class="flex items-center gap-3 text-blue-400 mb-2">
                    <i data-lucide="shield-check" class="w-5 h-5"></i>
                    <span class="text-xs font-black uppercase tracking-[0.3em]">Acceso de Super Admin</span>
                </div>
                <h1 class="text-3xl font-black text-white tracking-tight">Gestión de Sedes</h1>
                <p class="text-slate-400">Administración global de clientes y configuraciones de marca.</p>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <!-- Lista de Sedes -->
                <div class="lg:col-span-8 space-y-4">
                    <div id="sedes-list" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Cargado dinámicamente -->
                        ${renderSkeletonSedes()}
                    </div>
                </div>

                <!-- Resumen de Facturación / Control -->
                <div class="lg:col-span-4 space-y-4">
                    <div class="bg-indigo-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
                        <div class="relative z-10">
                            <h3 class="font-bold opacity-80 uppercase text-xs tracking-widest mb-4">Total Licencias</h3>
                            <p class="text-5xl font-black">24 <span class="text-lg opacity-60">/ 50</span></p>
                            <div class="mt-8">
                                <button class="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-bold transition-all border border-white/10">EXPANDIR PLAN</button>
                            </div>
                        </div>
                        <i data-lucide="trending-up" class="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700"></i>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => loadSedes(), 600);
}

function renderSkeletonSedes() {
    return Array(4).fill(0).map(() => `
        <div class="h-48 bg-slate-900/50 border border-slate-800 rounded-2xl animate-pulse"></div>
    `).join('');
}

async function loadSedes() {
    const mockSedes = [
        { id: 1, nombre: "Corporativo Elite", logo: null, usuarios: 450, estado: "Premium" },
        { id: 2, nombre: "Residencial Horizonte", logo: null, usuarios: 120, estado: "Pro" },
        { id: 3, nombre: "Parque Industrial Sur", logo: null, usuarios: 89, estado: "Estándar" }
    ];

    const container = document.getElementById('sedes-list');
    container.innerHTML = mockSedes.map(sede => `
        <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/50 transition-all group">
            <div class="flex items-center gap-4 mb-4">
                <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-black text-indigo-400 text-xl border border-slate-700">
                    ${sede.nombre.charAt(0)}
                </div>
                <div>
                    <h4 class="font-bold text-white group-hover:text-blue-400 transition-colors">${sede.nombre}</h4>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 uppercase">${sede.estado}</span>
                </div>
            </div>
            <div class="flex justify-between items-end border-t border-slate-800 pt-4 mt-4">
                <div>
                    <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest">Usuarios</p>
                    <p class="text-lg font-bold text-white">${sede.usuarios}</p>
                </div>
                <button class="px-4 py-2 bg-slate-800 hover:bg-blue-600 text-white text-[10px] font-bold rounded-lg transition-all">GESTIONAR</button>
            </div>
        </div>
    `).join('') + `
        <button class="border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 hover:border-blue-500/50 hover:bg-blue-500/5 group transition-all">
            <i data-lucide="plus-circle" class="w-8 h-8 text-slate-600 group-hover:text-blue-500 mb-2"></i>
            <span class="text-xs font-bold text-slate-500 group-hover:text-blue-400 uppercase tracking-widest">Añadir Sede</span>
        </button>
    `;
    
    if (window.lucide) window.lucide.createIcons();
}
