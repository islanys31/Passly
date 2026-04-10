/**
 * @file overview.js
 * @description Vista general del Dashboard con estadísticas para Passly Pro.
 */

import { fetchAPI } from '../modules/api.js';

export async function render(container) {
    container.innerHTML = `
        <div class="p-8 space-y-8 animate-in fade-in duration-700">
            <header>
                <h1 class="text-3xl font-black text-white tracking-tight">Resumen Ejecutivo</h1>
                <p class="text-slate-400">Estado actual de la seguridad en tiempo real.</p>
            </header>

            <!-- Grid de Estadísticas -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                ${renderStatCard('Total Identidades', '1,284', 'users', 'text-blue-500', '+12%')}
                ${renderStatCard('Accesos Hoy', '452', 'lock-open', 'text-green-500', '+5%')}
                ${renderStatCard('Alertas Activas', '3', 'alert-triangle', 'text-amber-500', 'Bajo control')}
                ${renderStatCard('Hardware Online', '24/26', 'monitor', 'text-purple-500', '92%')}
            </div>

            <!-- Gráficas y Actividad -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl">
                    <h3 class="text-lg font-bold text-white mb-6">Tráfico Semanal de Accesos</h3>
                    <div class="h-64 flex items-end justify-between px-4">
                        <!-- Placeholder de Gráfica con CSS -->
                        ${['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(day => `
                            <div class="flex flex-col items-center gap-2">
                                <div class="w-8 bg-blue-600 rounded-t-lg shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all hover:h-48" style="height: ${Math.random() * 100 + 40}px"></div>
                                <span class="text-[10px] text-slate-500 font-bold uppercase">${day}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col">
                    <h3 class="text-lg font-bold text-white mb-6">Últimos Movimientos</h3>
                    <div class="flex-grow space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        ${renderActivityItem('Carlos R.', 'Puerta Principal', '14:20')}
                        ${renderActivityItem('Ana M.', 'Zona A3', '14:15')}
                        ${renderActivityItem('Vehículo TX-99', 'Acceso Vehicular', '14:02')}
                        ${renderActivityItem('Soporte IT', 'Data Center', '13:45')}
                        ${renderActivityItem('Juan P.', 'Puerta Principal', '13:30')}
                    </div>
                    <button class="mt-6 w-full py-3 text-xs font-bold text-blue-400 hover:text-white transition-colors">VER TODO EL LOG</button>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

function renderStatCard(label, value, icon, iconColor, trend) {
    return `
        <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl transition-transform hover:scale-[1.02] cursor-default">
            <div class="flex justify-between items-start">
                <div class="p-2 bg-slate-950 rounded-lg">
                    <i data-lucide="${icon}" class="w-6 h-6 ${iconColor}"></i>
                </div>
                <span class="text-[10px] font-bold px-2 py-1 rounded bg-slate-950 text-slate-400 uppercase tracking-tighter">${trend}</span>
            </div>
            <div class="mt-4">
                <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-widest">${label}</h4>
                <p class="text-2xl font-black text-white mt-1">${value}</p>
            </div>
        </div>
    `;
}

function renderActivityItem(user, location, time) {
    return `
        <div class="flex items-center gap-4 p-3 hover:bg-slate-800/50 rounded-xl transition-colors border border-transparent hover:border-slate-700/50">
            <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-blue-400">
                ${user.charAt(0)}
            </div>
            <div class="flex-grow min-w-0">
                <p class="text-sm font-bold text-white truncate">${user}</p>
                <p class="text-xs text-slate-500 truncate">${location}</p>
            </div>
            <span class="text-[10px] font-mono text-slate-600">${time}</span>
        </div>
    `;
}
