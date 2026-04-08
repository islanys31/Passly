/**
 * @file utils.js
 * @description Herramientas transversales de validación, sanitización y UI.
 * 
 * [ESTUDIO: COMMON UTILITIES]
 * En el desarrollo profesional, agrupamos funciones repetitivas en un archivo 'utils'.
 * Esto evita el código duplicado ("Don't Repeat Yourself" - DRY) y facilita pruebas unitarias.
 */

/**
 * [ESTUDIO: VALIDACIÓN DE IDENTIDAD - EMAIL]
 * El sistema de Passly normaliza los correos a minúsculas para evitar cuentas duplicadas 
 * causadas por variaciones como "Juan@gmail.com" y "juan@gmail.com".
 * 
 * @param {string} email - Correo a validar
 * @returns {boolean} - True si es válido
 */
export function validarEmail(email) {
    if (!email) return false;
    if (/[A-Z]/.test(email)) return false; // Bloqueo de mayúsculas preventivo

    // Regex estándar para dominios internacionales
    const regexEmail = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    return regexEmail.test(email.trim());
}

/**
 * [ESTUDIO: POLÍTICA DE CONTRASEÑAS SEGURAS]
 * Las contraseñas son la primera línea de defensa. Passly exige:
 * - Longitud específica (8-12) para balancear seguridad y memoria del usuario.
 * - Variedad de caracteres para resistir ataques de fuerza bruta.
 * 
 * @param {string} pass - Contraseña a evaluar
 * @returns {string|null} - Mensaje de error pedagógico o null si es válida
 */
export function validarPassword(pass) {
    const tieneEspacios = /\s/.test(pass);
    const tieneMayuscula = /[A-Z]/.test(pass);
    const tieneMinuscula = /[a-z]/.test(pass);
    const tieneNumero = /[0-9]/.test(pass);
    const tieneCaracterEspecial = /[!@#$%^*/_.]/.test(pass);
    const regexPermitidos = /^[a-zA-Z0-9!@#$%^*/_.]+$/;

    if (pass.length < 8) return "Mínimo 8 caracteres requeridos.";
    if (pass.length > 12) return "Máximo 12 caracteres permitidos.";
    if (tieneEspacios) return "La clave no puede contener espacios.";
    if (!regexPermitidos.test(pass)) return "Contiene caracteres prohibidos.";
    if (!tieneMayuscula || !tieneMinuscula) return "Requiere mezcla de Mayúsculas y Minúsculas.";
    if (!tieneNumero) return "Debe incluir al menos un número.";
    
    // Nota: El sistema permite o bloquea según la configuración de seguridad actual
    return null;
}

/**
 * [ESTUDIO: PREVENCIÓN DE XSS (Cross-Site Scripting)]
 * JAMÁS inyectes texto del usuario directamente en el HTML.
 * 'escapeHTML' convierte caracteres peligrosos como '<' en '&lt;', 
 * desactivando cualquier script malicioso que un atacante intente inyectar.
 */
export function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str; // 'textContent' sanitiza automáticamente
    return div.innerHTML;
}

/**
 * [ESTUDIO: EXPERIENCIA DE USUARIO (UX) - TOASTS]
 * Las notificaciones 'Toasts' son mensajes no invasivos que informan el éxito 
 * o fracaso de una operación sin interrumpir el flujo del usuario.
 */
export function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">${message}</div>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    // Protocolo de auto-eliminación
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4500); // 4.5 segundos de visibilidad
}

// --- HELPERS DE INTERFAZ GRÁFICA ---

export function setInputBorder(id, isError) {
    const el = document.getElementById(id);
    if (el) {
        el.style.borderColor = isError ? 'var(--error-color)' : 'var(--border-color)';
    }
}

export function displayFieldError(id, message) {
    const errorEl = document.getElementById(id + 'Error');
    if (errorEl) {
        errorEl.textContent = message || '';
        errorEl.style.display = message ? 'block' : 'none';
    }
}
