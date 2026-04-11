/**
 * @file dashboard_main.js
 * @description Punto de entrada principal del Dashboard en Passly Pro.
 */

import { fetchAPI, initAPI } from './modules/api.js';
import { checkSession, handleLogout } from './modules/auth.js';
import { getMenuConfig } from './modules/menu.js';
import { checkOnboarding } from './modules/onboarding.js';
import { loadClientBranding, uploadClientLogo } from './modules/branding.js';
import { navigateTo } from './router.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar API
    initAPI();

    // 2. Verificar Sesión
    const user = await checkSession();
    if (!user) {
        window.location.href = '/?session_failed=true';
        return;
    }

    // 3. Cargar Branding (Logo Cliente)
    loadClientBranding(fetchAPI, user.cliente_id);

    // 4. Renderizar Menú Dinámico según Rol (Original Aesthetic)
    renderSidebar(user.role_id);

    // 5. Iniciar Router o Cargar Vista por Defecto (Overview)
    const initialView = window.location.hash.replace('#', '') || 'overview';
    navigateTo(initialView);

    // 6. Verificar Onboarding
    checkOnboarding();

    // Eventos Globales
    setupGlobalListeners(user.cliente_id);
});

function renderSidebar(roleId) {
    const sidebar = document.getElementById('nav-menu');
    const menuConfig = getMenuConfig(roleId);
    
    let html = '';
    menuConfig.forEach(section => {
        // En estética original, no siempre se usa el título de sección igual
        section.views.forEach(view => {
            html += `
                <a href="#${view.id}" 
                   class="nav-item menu-item flex items-center px-4 py-3"
                   data-view="${view.id}">
                   <i data-lucide="${view.icon}" class="w-5 h-5 mr-3"></i>
                   <span class="nav-text">${view.text}</span>
                </a>
            `;
        });
    });
    
    sidebar.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
}

function setupGlobalListeners(clienteId) {
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    
    // Lógica Interactiva del Logo Cliente
    const logoContainer = document.getElementById('sidebar-logo-container');
    const logoInput = document.getElementById('client-logo-input');

    logoContainer?.addEventListener('click', () => logoInput?.click());

    logoInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                logoContainer.style.opacity = '0.5';
                await uploadClientLogo(fetchAPI, clienteId || 1, file);
                logoContainer.style.opacity = '1';
                alert("✅ Logo de cliente actualizado correctamente");
            } catch (error) {
                console.error("Error subiendo logo:", error);
                alert("❌ Error al subir el logo");
                logoContainer.style.opacity = '1';
            }
        }
    });

    // Escuchar cambios en el hash
    window.addEventListener('hashchange', () => {
        const view = window.location.hash.replace('#', '');
        navigateTo(view);
    });
}
