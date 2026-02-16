/**
 * Passly - Utilidades, Validaciones y Notificaciones
 */

// --- VALIDACIONES ---
export function validarEmail(email) {
    const hasUpperCase = /[A-Z]/.test(email);
    if (hasUpperCase) return false;
    const regexEmail = /^[a-z0-9._%+-]+@(gmail|hotmail)\.[a-z]{2,}(\.[a-z]{2,})?$/;
    return regexEmail.test(email.trim());
}

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

export function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- SISTEMA DE NOTIFICACIONES (TOASTS) ---
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

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
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
