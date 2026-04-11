/**
 * @file security.js
 * @description Vista de configuración de seguridad (2FA) para Passly Pro.
 */

import { fetchAPI } from '@pro/api_service.js';
import { showToast } from '../modules/utils.js';

export async function render(container) {
    container.innerHTML = `
        <div class="p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <header class="text-center">
                <div class="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h1 class="text-3xl font-extrabold text-white tracking-tight">Escudo 2FA</h1>
                <p class="text-slate-400 mt-2">Añade una capa extra de protección a tu identidad.</p>
            </header>

            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 right-0 p-4 opacity-5">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-32 h-32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>

                <div class="space-y-6 text-center">
                    <p class="text-slate-300">La autenticación de dos factores está actualmente <span class="text-red-400 font-bold">DESACTIVADA</span>.</p>
                    
                    <div class="flex justify-center">
                        <button id="setup-2fa-btn" class="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                            CONFIGURAR AHORA
                        </button>
                    </div>
                    
                    <p class="text-xs text-slate-500 max-w-xs mx-auto">
                        Passly utiliza el estándar TOTP compatible con Google Authenticator y Authy.
                    </p>
                </div>
            </div>
        </div>
    `;

    setupListeners();
}

function setupListeners() {
    document.getElementById('setup-2fa-btn')?.addEventListener('click', () => {
        showToast("Inicializando configuración de Escudo 2FA...");
    });
}
