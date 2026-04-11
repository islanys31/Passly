/**
 * @file logs.js
 * @description Vista de Auditoría Maestra para Passly Pro.
 */

import { fetchAPI } from '@pro/api_service.js';

export async function render(container) {
    container.innerHTML = `
        <div class="p-8 space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 class="text-3xl font-extrabold text-white tracking-tight">Auditoría Maestra</h1>
                <p class="text-slate-400 mt-1">Registro cronológico de seguridad y acceso global.</p>
            </header>

            <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-950/50 border-b border-slate-800">
                                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Evento</th>
                                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Módulo</th>
                                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Identidad</th>
                                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Fecha/Hora</th>
                                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">IP</th>
                            </tr>
                        </thead>
                        <tbody id="logs-container" class="divide-y divide-slate-800/50">
                            <!-- Datos mock para modo demo -->
                            ${renderMockLogs()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderMockLogs() {
    const logs = [
        { event: 'Inicio de Sesión', module: 'Seguridad', user: 'Admin Maestro', time: 'Hace 2 mins', ip: '192.168.1.1' },
        { event: 'Nueva Sede Creada', module: 'Sedes', user: 'SuperAdmin', time: 'Hace 15 mins', ip: '192.168.1.1' },
        { event: 'Error de Intento', module: 'Auth', user: 'Desconocido', time: 'Hace 1 hora', ip: '200.45.12.3' }
    ];

    return logs.map(log => `
        <tr class="hover:bg-slate-800/30 transition-colors">
            <td class="px-6 py-4">
                <span class="font-medium text-white">${log.event}</span>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-md bg-slate-800 text-[10px] text-slate-400 font-mono">${log.module}</span>
            </td>
            <td class="px-6 py-4 text-sm text-slate-300">${log.user}</td>
            <td class="px-6 py-4 text-sm text-slate-400 font-mono">${log.time}</td>
            <td class="px-6 py-4 text-xs text-slate-500 font-mono">${log.ip}</td>
        </tr>
    `).join('');
}
