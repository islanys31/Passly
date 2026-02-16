/**
 * Passly - Cliente API y Gestión de Sesión
 */
const API_BASE = "/api";

export async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('auth_token');
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(API_BASE + endpoint, options);

        if (response.status === 401) {
            handleLogout();
            return null;
        }

        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        console.error('API Error:', error);
        return { ok: false, error: 'Error de conexión' };
    }
}

export function handleLogout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('usuario_activo');
    window.location.href = "index.html";
}

export function checkAuth() {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('usuario_activo');
    if (!token || !userData) {
        window.location.href = "index.html";
        return null;
    }
    return JSON.parse(userData);
}
