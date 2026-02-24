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
    // 1. Recuperar el token de acceso guardado en el navegador
    const token = localStorage.getItem('auth_token');

    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                // 2. Si hay un token, se adjunta automáticamente en la cabecera de la petición
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        // 3. Si se envían datos, se convierten a cadena JSON
        if (body) options.body = JSON.stringify(body);

        // 4. Realizar la petición Fetch
        const response = await fetch(API_BASE + endpoint, options);

        /**
         * 5. MANEJO AUTOMÁTICO DE SESIÓN EXPIRADA:
         * Si el servidor responde con un 401 (No autorizado), significa que el token
         * ha vencido o es inválido. Cerramos sesión automáticamente.
         */
        if (response.status === 401) {
            handleLogout();
            return null;
        }

        const data = await response.json();

        // 6. Retornamos un objeto con el estado de la respuesta y los datos
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
export function handleLogout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('usuario_activo');
    localStorage.removeItem('theme'); // Opcional: reiniciar tema
    window.location.href = "index.html";
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
