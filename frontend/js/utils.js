/**
 * Valida un formato de correo electrónico.
 * Reglas: No mayúsculas, formato estándar usuario@dominio.com
 * @param {string} email - Correo a validar
 * @returns {boolean} - True si es válido
 */
export function validarEmail(email) {
    if (!email) return false;
    if (/[A-Z]/.test(email)) return false; // El sistema bloquea mayúsculas por política de normalización

    // Regex flexible para cualquier dominio de primer nivel
    const regexEmail = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    return regexEmail.test(email.trim());
}

/**
 * Valida la robustez de una contraseña según políticas de seguridad Passly.
 * Reglas: 8-12 carac, 1 mayus, 1 minus, 1 num, 1 especial.
 * @param {string} pass - Contraseña a evaluar
 * @returns {string|null} - Mensaje de error o null si es perfecta
 */
export function validarPassword(pass) {
    const tieneEspacios = /\s/.test(pass);
    const tieneMayuscula = /[A-Z]/.test(pass);
    const tieneMinuscula = /[a-z]/.test(pass);
    const tieneNumero = /[0-9]/.test(pass);
    const tieneCaracterEspecial = /[!@#$%^*/_.]/.test(pass);
    const regexPermitidos = /^[a-zA-Z0-9!@#$%^*/_.]+$/;

    if (pass.length < 8) return "Mínimo 8 caracteres.";
    if (pass.length > 12) return "Máximo 12 caracteres.";
    if (tieneEspacios) return "Sin espacios.";
    if (!regexPermitidos.test(pass)) return "Contiene caracteres no permitidos.";
    if (!tieneMayuscula || !tieneMinuscula) return "Requiere Mayúscula y Minúscula.";
    if (!tieneNumero) return "Requiere al menos un número.";
    if (!tieneCaracterEspecial) return "Requiere un símbolo (!@#$%^*/_.).";

    return null;
}

/**
 * Escapa caracteres HTML para prevenir ataques XSS al renderizar contenido dinámico.
 * @param {string} str - Texto plano
 * @returns {string} - Texto sanitizado para HTML
 */
export function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- SISTEMA DE NOTIFICACIONES (TOASTS) ---
/**
 * Sistema de notificaciones visuales (Toasts) estilo premium.
 * @param {string} message - Texto a mostrar
 * @param {string} type - 'success', 'error', 'info' o 'warning'
 */
export function showToast(message, type = 'info') {
    // Buscar o crear el contenedor global de notificaciones
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // Crear la burbuja del toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">${message}</div>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    // Animación de salida sincronizada con el progreso visual
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500); // Eliminar del DOM tras desaparecer
    }, 4000);
}

// --- UI HELPERS ---
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
