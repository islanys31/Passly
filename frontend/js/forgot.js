/**
 * Passly - Recuperación de Contraseña
 */
import { apiRequest } from './api.js';
import { initTheme } from './theme.js';
import { showToast, validarEmail, setInputBorder } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    document.getElementById('email').oninput = () => {
        setInputBorder('email', false);
    };

    document.getElementById('btnEnviar').onclick = handleForgot;
});

async function handleForgot() {
    const email = document.getElementById("email").value.trim();
    const btn = document.getElementById("btnEnviar");

    if (!email) {
        showToast("Por favor, ingresa tu correo electrónico.", "error");
        setInputBorder('email', true);
        return;
    }

    if (!validarEmail(email)) {
        showToast("El formato del correo no es válido o contiene mayúsculas.", "error");
        setInputBorder('email', true);
        return;
    }

    btn.disabled = true;
    btn.classList.add('loading');

    const { ok, data, error } = await apiRequest("/auth/forgot-password", "POST", { email });

    if (ok) {
        showToast("Si el correo existe, recibirás instrucciones pronto.", "success");
        setTimeout(() => window.location.href = "reset.html", 3000);
    } else {
        showToast(data?.error || error || "Error al procesar la solicitud", "error");
    }

    btn.disabled = false;
    btn.classList.remove('loading');
}
