/**
 * @file api.js
 * @description Capa modular de comunicación API para Passly Pro.
 */

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const RENDER_BACKEND_URL = "https://passly-api.onrender.com";
const API_BASE = isLocalhost ? "/api" : `${RENDER_BACKEND_URL}/api`;

/**
 * Inicializa la configuración de la API.
 */
export function initAPI() {
    console.log(`🌐 API Passly Pro conectada a: ${API_BASE}`);
}

/**
 * fetchAPI: Estandarización para Passly Pro.
 * @returns {Promise<Response>} Retorna una respuesta Fetch estándar.
 */
export async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('auth_token');
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const config = {
        ...options,
        credentials: 'include',
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        
        // Manejo automático de expiración de sesión
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
            console.warn("Sesión expirada. Limpiando credenciales...");
            localStorage.removeItem('auth_token');
            localStorage.removeItem('usuario_activo');
        }

        return response;
    } catch (error) {
        console.error('⚠️ Error de red en API Modular:', error);
        throw error;
    }
}
