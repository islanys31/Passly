/**
 * @file router.js
 * @description Maneja la carga dinámica de vistas sin recargar la página.
 */

const contentArea = document.getElementById('view-content');

const routes = {
    'overview': () => import('@/frontend/src/js/views/overview.js'),
    'usuarios': () => import('@/frontend/src/js/views/identities.js'),
    'sedes': () => import('@/frontend/src/js/views/sedes.js'),
    'perfil': () => import('@/frontend/src/js/views/perfil.js'),
    'logs': () => import('@/frontend/src/js/views/logs.js'),
    'security': () => import('@/frontend/src/js/views/security.js')
};

export async function navigateTo(viewId) {
    // 1. Marcar menú activo
    updateMenuSelection(viewId);

    // 2. Cargar Vista
    const loader = routes[viewId];
    if (loader) {
        try {
            contentArea.innerHTML = '<div class="flex items-center justify-center h-full"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>';
            const module = await loader();
            module.render(contentArea);
        } catch (error) {
            console.error(`Error cargando la vista ${viewId}:`, error);
            contentArea.innerHTML = `<div class="p-8 text-red-500">Error al cargar la vista: ${viewId}</div>`;
        }
    } else {
        contentArea.innerHTML = `<div class="p-8 text-slate-400">Vista no encontrada: ${viewId}</div>`;
    }
}

function updateMenuSelection(viewId) {
    document.querySelectorAll('.menu-item').forEach(item => {
        if (item.getAttribute('data-view') === viewId) {
            item.classList.add('bg-blue-600/20', 'text-blue-400', 'border-l-4', 'border-blue-500');
        } else {
            item.classList.remove('bg-blue-600/20', 'text-blue-400', 'border-l-4', 'border-blue-500');
        }
    });
}
