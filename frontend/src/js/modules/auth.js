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
        return null;
    } catch (error) {
        console.error("Error verificando sesión:", error);
        return null;
    }
}

export async function handleLogout() {
    try {
        await fetchAPI('/auth/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        window.location.href = '/';
    }
}
