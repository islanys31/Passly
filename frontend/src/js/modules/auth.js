/**
 * @file auth.js
 * @description Gestión de autenticación y sesiones.
 */

import { fetchAPI } from './api.js';

export async function checkSession() {
    try {
        const response = await fetchAPI('/auth/me');
        if (response.ok) {
            const data = await response.json();
            return data.user;
        }
        // Si no es OK, limpiamos para evitar bucles
        localStorage.removeItem('auth_token');
        localStorage.removeItem('usuario_activo');
        return null;
    } catch (error) {
        console.error("Error verificando sesión:", error);
        localStorage.removeItem('auth_token');
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
        window.location.href = '/';
    }
}
