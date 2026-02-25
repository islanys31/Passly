/**
 * @file api.js
 * @description Capa de comunicación entre el Frontend y el Backend.
 * Este archivo centraliza todas las peticiones fetch, maneja la seguridad de los tokens
 * y la persistencia de la sesión en el navegador.
 */

const API_BASE = "/api"; // URL base para todas las llamadas a la API REST

/**
 * Función genérica para realizar peticiones HTTP a la API.
 * Encapsula la lógica de cabeceras, tokens JWT y manejo de errores comunes.
 * 
 * @param {string} endpoint - Ejemplo: '/auth/login' o '/usuarios'
 * @param {string} method - GET, POST, PUT o DELETE
 * @param {object} body - Datos a enviar en el cuerpo de la petición (opcional)
 */
export async function apiRequest(endpoint, method = 'GET', body = null) {
    /**
     * SEGURIDAD: 'credentials: include' es clave.
     * Le indica al navegador que envíe automáticamente la cookie httpOnly
     * con cada petición. El token JWT ya NO se lee desde localStorage.
     * El servidor lo extraerá directamente de la cookie, que es inaccesible
     * para cualquier script malicioso.
     */
    const token = localStorage.getItem('auth_token'); // Fallback para compatibilidad MFA

    try {
        const options = {
            method,
            credentials: 'include', // 🍪 Envía y recibe cookies httpOnly automáticamente
            headers: {
                'Content-Type': 'application/json',
                // Fallback: si hay token en localStorage (flujo MFA), se adjunta en el header
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

        return {
            ok: response.ok,
            status: response.status,
            data
        };
    } catch (error) {
        console.error('⚠️ Error en la conexión con la API:', error);
        return { ok: false, error: 'No se pudo conectar con el servidor. Verifique su internet o el estado del sistema.' };
    }
}

/**
 * Cierra la sesión del usuario eliminando rastro del navegador y redirigiendo al login.
 */
export async function handleLogout() {
    // Limpiar datos del usuario del navegador
    localStorage.removeItem('auth_token');
    localStorage.removeItem('usuario_activo');
    // Pedir al servidor que elimine la cookie httpOnly (el cliente no puede hacerlo por sí solo)
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch (_) { }
    window.location.href = 'index.html';
}

/**
 * Verifica si existe una sesión activa antes de cargar una página protegida (como el Dashboard).
 * @returns {object|null} Retorna los datos del usuario si hay sesión, sino redirige al inicio.
 */
export function checkAuth() {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('usuario_activo');

    // Si falta el token o la info del usuario, no permitimos el acceso
    if (!token || !userData) {
        window.location.href = "index.html";
        return null;
    }

    try {
        return JSON.parse(userData);
    } catch (e) {
        handleLogout();
        return null;
    }
}
