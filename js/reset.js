/**
 * Passly - Restablecimiento de Contraseña
 */
import { apiRequest } from './api.js';
import { initTheme } from './theme.js';
import { showToast, validarPassword, setInputBorder } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    const passInput = document.getElementById('nuevaPass');
    const confirmInput = document.getElementById('confirmPass');

    passInput.oninput = updatePasswordChecklist;
    confirmInput.oninput = () => {
        const isMatch = confirmInput.value === passInput.value;
        setInputBorder('confirmPass', !isMatch);
    };

    document.getElementById('showPass').addEventListener('change', (e) => {
        const type = e.target.checked ? 'text' : 'password';
        passInput.type = type;
        confirmInput.type = type;
    });

    document.getElementById('btnReset').onclick = handleReset;
});

function updatePasswordChecklist() {
    const pass = document.getElementById('nuevaPass').value;
    const rules = {
        'reqLength': pass.length >= 8 && pass.length <= 12,
        'reqUpper': /[A-Z]/.test(pass) && /[a-z]/.test(pass),
        'reqNumber': /[0-9]/.test(pass),
        'reqSpecial': /[!@#$%^*/_.]/.test(pass)
    };

    for (const [id, isValid] of Object.entries(rules)) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('valid', isValid);
    }
}

async function handleReset() {
    const token = document.getElementById("token").value.trim();
    const nuevaPass = document.getElementById("nuevaPass").value;
    const confirmPass = document.getElementById("confirmPass").value;
    const btn = document.getElementById("btnReset");

    if (!token || !nuevaPass || !confirmPass) {
        showToast("Todos los campos son obligatorios.", "error");
        return;
    }

    if (nuevaPass !== confirmPass) {
        showToast("Las contraseñas no coinciden.", "error");
        setInputBorder('confirmPass', true);
        return;
    }

    const passError = validarPassword(nuevaPass);
    if (passError) {
        showToast(passError, "error");
        setInputBorder('nuevaPass', true);
        return;
    }

    btn.disabled = true;
    btn.classList.add('loading');

    const { ok, data, error } = await apiRequest("/auth/reset-password", "POST", {
        token,
        newPassword: nuevaPass
    });

    if (ok) {
        showToast("¡Contraseña actualizada con éxito!", "success");
        setTimeout(() => window.location.href = "index.html", 3000);
    } else {
        showToast(data?.error || error || "Error al restablecer contraseña", "error");
    }

    btn.disabled = false;
    btn.classList.remove('loading');
}
