/**
 * @file api.js
 * @description Capa de comunicación entre el Frontend y el Backend de Passly.
 * 
 * [ESTUDIO: PATRÓN DE DISEÑO - CAPA DE SERVICIO]
 * En lugar de usar 'fetch' directamente en cada botón, centralizamos todo aquí.
 * Esto permite:
 * 1. Reutilización: Todas las peticiones usan la misma lógica de errores.
 * 2. Seguridad: Gestión automática de Cookies y Tokens JWT.
 * 3. Mantenimiento: Si la URL del servidor cambia, solo la editamos aquí.
 */

// [CONFIGURACIÓN DE ARQUITECTURA DISTRIBUIDA (Vercel <-> Render)]
// Detecta automáticamente si estás probando en tu PC o si está en Vercel
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Si estás en local usa la misma IP. Si estás en Vercel, DEBE apuntar a tu backend en Render
const RENDER_BACKEND_URL = "https://passly-api.onrender.com";

const API_BASE = isLocalhost ? "/api" : `${RENDER_BACKEND_URL}/api`;

/**
 * [ESTUDIO: COMUNICACIÓN ASÍNCRONA]
 * Usamos 'async/await' para manejar promesas de red de forma legible.
 * 
 * @param {string} endpoint - El "camino" al recurso (ej: '/auth/login')
 * @param {string} method - El verbo HTTP (GET para leer, POST para crear, etc.)
 * @param {object} body - Los datos que enviamos al servidor (opcional)
 */
export async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('auth_token');

    try {
        const options = {
            method,
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        if (body) options.body = JSON.stringify(body);

        // Disparamos la petición a la red
        const response = await fetch(`${API_BASE}${endpoint}`, options);

        /**
         * [ESTUDIO: GESTIÓN DE EXPIRACIÓN]
         * Status 401 (Unauthorized) significa que el pase de acceso (Token) caducó
         * o es falso. En ese caso, forzamos la salida del usuario por seguridad,
         * EXCEPTO si estamos en el flujo de login (donde 401 es un error de credenciales común).
         */
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
            handleLogout();
            return null;
        }

        // Transformamos la respuesta binaria del servidor en un objeto JS fácil de usar
        const data = await response.json();

        return {
            ok: response.ok,
            status: response.status,
            data
        };
    } catch (error) {
        console.error('⚠️ ERROR DE RED EN PASSLY:', error);
        return { 
            ok: false, 
            error: 'Servidor fuera de línea. Verifique su acceso a internet.' 
        };
    }
}

/**
 * handleLogout: Protocolo de evacuación segura.
 * Limpia el rastro local y pide al servidor que destruya la cookie de sesión.
 */
export async function handleLogout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('usuario_activo');
    
    // Notificamos al servidor para que invalide la sesión en su lado (Limpieza de backend)
    try { 
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); 
    } catch (_) { /* Error silencioso en logout */ }
    
    // Redirigimos al usuario a la pantalla de entrada
    window.location.href = 'index.html';
}

/**
 * checkAuth: Guardia de entrada.
 * Verifica si los datos de identidad mínimos existen antes de dejar pasar al usuario al Panel.
 */
export function checkAuth() {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('usuario_activo');

    if (!token || !userData) {
        window.location.href = "index.html";
        return null;
    }

    try {
        // Deserializamos el objeto de usuario guardado en texto
        return JSON.parse(userData);
    } catch (e) {
        handleLogout();
        return null;
    }
}
