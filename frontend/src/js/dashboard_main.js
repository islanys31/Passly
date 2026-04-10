/**
 * @file dashboard_main.js
 * @description Punto de entrada principal del Dashboard en Passly Pro.
 */

import { initAPI } from './modules/api.js';
import { checkSession, handleLogout } from './modules/auth.js';
import { getMenuConfig } from './modules/menu.js';
import { checkOnboarding } from './modules/onboarding.js';
import { navigateTo } from './router.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar API
    initAPI();

    // 2. Verificar Sesión
    const user = await checkSession();
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    // 3. Renderizar Menú Dinámico según Rol
    renderSidebar(user.role_id);

    // 4. Iniciar Router o Cargar Vista por Defecto (Overview)
    const initialView = window.location.hash.replace('#', '') || 'overview';
    navigateTo(initialView);

    // 5. Verificar Onboarding
    checkOnboarding();

    // Eventos Globales
    setupGlobalListeners();
});

function renderSidebar(roleId) {
    const sidebar = document.getElementById('sidebar-menu');
    const menuConfig = getMenuConfig(roleId);
    
    let html = '';
    menuConfig.forEach(section => {
        html += `<div class="sidebar-section">
                    <span class="section-title">${section.section}</span>
                    <nav class="space-y-1">`;
        
        section.views.forEach(view => {
            html += `
                <a href="#${view.id}" 
                   class="menu-item flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200"
                   data-view="${view.id}">
                   <i data-lucide="${view.icon}" class="w-5 h-5 mr-3"></i>
                   ${view.text}
                </a>
            `;
        });
        
        html += `</nav></div>`;
    });
    
    sidebar.innerHTML = html;
    // Reinicializar iconos de Lucide si se usa
    if (window.lucide) window.lucide.createIcons();
}

function setupGlobalListeners() {
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    
    // Escuchar cambios en el hash
    window.addEventListener('hashchange', () => {
        const view = window.location.hash.replace('#', '');
        navigateTo(view);
    });
}
