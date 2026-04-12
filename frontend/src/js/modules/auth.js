/**
 * @file auth.js
 * @description Gestión de autenticación y sesiones.
 */

import { fetchAPI } from './api_service.js';

export async function checkSession() {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('usuario_activo');

    if (!token || !userData) {
        return null;
    }

    try {
        // En Passly v2 validamos localmente para evitar bucles por endpoints faltantes (ej: /auth/me)
        return JSON.parse(userData);
    } catch (error) {
        console.error("Error parseando usuario:", error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('usuario_activo');
        return null;
    }
}

export async function handleLogout() {
    try {
        await fetchAPI('/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error("Error al cerrar sesión en servidor:", error);
    } finally {
        localStorage.clear();
        window.location.href = 'index.html';
    }
}
