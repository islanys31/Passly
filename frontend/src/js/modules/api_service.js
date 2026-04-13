/**
 * @file api_service.js
 * @description Capa modular de comunicación API para Passly Pro.
 * Renombrado para evitar conflictos con el archivo legacy.
 */

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const RENDER_BACKEND_URL = "https://passly-api.onrender.com";
const API_BASE = isLocalhost ? "/api" : `${RENDER_BACKEND_URL}/api`;

export function initAPI() {
    console.log(`🌐 API Passly Pro conectada a: ${API_BASE}`);
}

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

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
    } else if (options.body instanceof FormData || config.body instanceof FormData) {
        // Al enviar FormData, fetch calcula automáticamente el Content-Type (multipart/form-data) 
        // y el boundary. Por eso, debemos eliminar el predeterminado.
        delete config.headers['Content-Type'];
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('usuario_activo');
        }

        return response;
    } catch (error) {
        console.error('⚠️ Error de red en API Modular:', error);
        throw error;
    }
}
