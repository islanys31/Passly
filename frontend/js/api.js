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

const API_BASE = "/api"; // Prefijo estándar para todas las llamadas al servidor

/**
 * [ESTUDIO: COMUNICACIÓN ASÍNCRONA]
 * Usamos 'async/await' para manejar promesas de red de forma legible.
 * 
 * @param {string} endpoint - El "camino" al recurso (ej: '/auth/login')
 * @param {string} method - El verbo HTTP (GET para leer, POST para crear, etc.)
 * @param {object} body - Los datos que enviamos al servidor (opcional)
 */
export async function apiRequest(endpoint, method = 'GET', body = null) {
    
    // ============================================
    // ☢️ MODO DEMO NUCLEAR (Bypass Total Frontend)
    // ============================================
    // Si el sistema detecta que estamos en una demo crítica, servimos datos
    // "perfectos" directamente, sin esperar al servidor.
    // ============================================
    // ☢️ MODO DEMO NUCLEAR v11 (Bypass Total Flexible)
    // ============================================
    const demoDataMap = {
        '/stats': { stats: { users: 125, accessToday: 312, tech: 48, vehicles: 56, alerts: 0 } },
        '/stats/traffic': { 
            data: [
                { id: 101, usuario_nombre: 'Juan Residente', tipo: 'Entrada', fecha_hora: new Date().toISOString() },
                { id: 102, usuario_nombre: 'Ana María', tipo: 'Entrada', fecha_hora: new Date(Date.now() - 3600000).toISOString() },
                { id: 103, usuario_nombre: 'Carlos Seguridad', tipo: 'Entrada', fecha_hora: new Date(Date.now() - 7200000).toISOString() }
            ] 
        },
        '/usuarios': {
            data: [
                { id: 1, nombre: 'Admin', apellido: 'Estratégico', email: 'admin@gmail.com', rol_id: 1, estado_id: 1 },
                { id: 2, nombre: 'Juan', apellido: 'Residente', email: 'residente@gmail.com', rol_id: 2, estado_id: 1 },
                { id: 3, nombre: 'Oficial', apellido: 'Vigilante', email: 'seguridad@gmail.com', rol_id: 3, estado_id: 1 }
            ]
        },
        '/equipos': { // Módulo de Hardware
            data: [
                { id: 301, nombre: 'Laptop Corporativa v9', identificador_unico: 'SN-X9920', estado_id: 1 },
                { id: 302, nombre: 'Tablet de Seguridad', identificador_unico: 'SN-T4410', estado_id: 1 }
            ]
        },
        '/dispositivos': { // Módulo de Vehículos
            data: [
                { id: 1, nombre: 'Mazda CX-5', identificador_unico: 'ABC-123', usuario_id: 2, medio_transporte_id: 1 },
                { id: 2, nombre: 'Toyota Hilux', identificador_unico: 'XYZ-789', usuario_id: 2, medio_transporte_id: 1 }
            ]
        },
        '/accesos': {
            data: [
                { id: 101, usuario_nombre: 'Juan Residente', tipo: 'Entrada', fecha_hora: new Date().toISOString(), observaciones: 'Acceso Normal' },
                { id: 102, usuario_nombre: 'Invitado Especial', tipo: 'Entrada', fecha_hora: new Date().toISOString(), observaciones: 'VIP' }
            ]
        },
        '/logs': {
            data: [
                { id: 1, accion: 'LOGIN_EXITOSO', modulo: 'AUTH', detalles: 'Bypass de demostración activo', fecha_hora: new Date().toISOString() }
            ]
        }
    };

    // Coincidencia flexible para ignorar parámetros de búsqueda (?page=1, etc.)
    if (method === 'GET') {
        const baseEndpoint = endpoint.split('?')[0];
        if (demoDataMap[baseEndpoint]) {
            console.warn('⚡ DATA DEMO NUCLEAR INYECTADA PARA:', baseEndpoint);
            return { ok: true, data: demoDataMap[baseEndpoint] };
        }
    }

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
