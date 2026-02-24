/**
 * Passly - Lógica de Autenticación (Login/Registro)
 */
import { apiRequest, checkAuth } from './api.js';
import { initTheme } from './theme.js';
import {
    validarEmail,
    validarPassword,
    showToast,
    setInputBorder,
    displayFieldError,
    escapeHTML
} from './utils.js';

let intentos = 0;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    // Si ya está logueado, ir al dashboard
    if (localStorage.getItem('auth_token')) {
        window.location.href = "dashboard.html";
    }

    initEventListeners();
    checkRegistrationFormValidity();
});

function initEventListeners() {
    // Toggles
    document.getElementById("toRegister").onclick = () => toggleForms("register");
    document.getElementById("toLogin").onclick = () => toggleForms("login");
    document.getElementById("resetLink").onclick = () => { window.location.href = "forgot.html"; };

    // Login inputs
    document.getElementById('emailLogin').oninput = (e) => {
        validateLive(e.target.id, 'email', 'login');
        clearLoginError();
    };
    document.getElementById('passLogin').oninput = (e) => {
        validateLive(e.target.id, 'password', 'login');
        clearLoginError();
    };
    document.getElementById('rolLogin').oninput = clearLoginError;

    // Register inputs
    const regInputs = [
        { id: 'nombreRegistro', type: 'text' },
        { id: 'apellidoRegistro', type: 'text' },
        { id: 'emailRegistro', type: 'email' },
        { id: 'rolRegistro', type: 'select' }
    ];

    regInputs.forEach(input => {
        const el = document.getElementById(input.id);
        if (el) {
            el.oninput = () => {
                validateLive(input.id, input.type, 'registro');
                clearFormError(el);
            };
        }
    });

    document.getElementById('passRegistro').oninput = (e) => {
        updatePasswordChecklist();
        clearFormError(e.target);
    };

    document.getElementById('passConfirm').oninput = (e) => {
        validateLive(e.target.id, 'confirmPassword', 'registro');
        clearFormError(e.target);
    };

    document.getElementById('aceptoTerminos').onchange = () => {
        checkRegistrationFormValidity();
    };

    // Show passwords
    document.getElementById("showReg").onchange = e => {
        const type = e.target.checked ? "text" : "password";
        document.getElementById("passRegistro").type = type;
        document.getElementById("passConfirm").type = type;
    };

    document.getElementById("showLogin").onchange = e => {
        document.getElementById("passLogin").type = e.target.checked ? "text" : "password";
    };

    // Form Submissions
    document.getElementById("btnLogin").onclick = handleLogin;
    document.getElementById("btnRegistrar").onclick = handleRegister;
}

let currentMfaToken = null;

async function handleLogin() {
    const emailEl = document.getElementById("emailLogin");
    const passwordEl = document.getElementById("passLogin");
    const rolEl = document.getElementById("rolLogin");
    const errorEl = document.getElementById("loginError");
    const resetLink = document.getElementById("resetLink");

    // Si estamos en el paso de verificación de MFA
    if (currentMfaToken) {
        const mfaInput = document.getElementById("mfaCode");
        const code = mfaInput?.value.trim();

        if (!code) {
            showToast("Ingresa el código MFA de 6 dígitos.", "error");
            return;
        }

        setLoading("btnLogin", true);
        const { ok, data, error } = await apiRequest("/auth/mfa/login", "POST", {
            mfaToken: currentMfaToken,
            code
        });
        setLoading("btnLogin", false);

        if (ok) {
            localStorage.setItem("usuario_activo", JSON.stringify(data.user));
            localStorage.setItem("auth_token", data.token);
            showToast("¡Verificación exitosa!", "success");
            setTimeout(() => window.location.href = "dashboard.html", 1000);
        } else {
            showToast(data?.error || "Código MFA incorrecto", "error");
        }
        return;
    }

    const email = emailEl.value.trim();
    const password = passwordEl.value;
    const rol_id = rolEl.value;

    if (!email || !password || !rol_id) {
        showToast("Por favor, completa todos los campos de acceso.", "error");
        return;
    }

    setLoading("btnLogin", true);
    const { ok, data, error } = await apiRequest("/auth/login", "POST", { email, password, rol_id });

    if (ok) {
        // Caso A: Requiere MFA
        if (data.mfaRequired) {
            setLoading("btnLogin", false);
            currentMfaToken = data.mfaToken;

            // Transformar UI para MFA
            emailEl.style.display = 'none';
            passwordEl.style.display = 'none';
            rolEl.style.display = 'none';
            document.querySelector('.checkbox-row').style.display = 'none';
            if (resetLink) resetLink.style.display = 'none';

            // Insertar campo de código MFA
            const mfaHtml = `
                <div id="mfaSection" style="margin-top:20px; text-align:center; animation: fadeInUp 0.5s ease;">
                    <p style="font-size:14px; margin-bottom:15px; color:var(--text-muted);">
                        🛡️ Autenticación de dos factores requerida.
                    </p>
                    <input id="mfaCode" type="text" placeholder="000000" maxlength="6" 
                           style="text-align:center; font-size:24px; letter-spacing:5px; font-weight:bold;">
                </div>
            `;

            const loginCard = document.getElementById('loginCard');
            loginCard.insertBefore(
                document.createRange().createContextualFragment(mfaHtml),
                errorEl
            );

            document.getElementById('btnLogin').textContent = "Verificar Código";
            loginCard.querySelector('h1').textContent = "Paso de Seguridad";
            showToast("Se requiere código MFA", "info");
            return;
        }

        // Caso B: Login directo
        localStorage.setItem("usuario_activo", JSON.stringify(data.user));
        localStorage.setItem("auth_token", data.token);
        setLoading("btnLogin", false);
        showToast("¡Bienvenido a Passly!", "success");
        setTimeout(() => window.location.href = "dashboard.html", 1000);
    } else {
        setLoading("btnLogin", false);
        intentos++;
        const errorMsg = data?.error || (data?.errors ? data.errors[0].message : null) || error || `Credenciales incorrectas (${intentos}/3)`;

        if (errorEl) {
            errorEl.textContent = errorMsg;
            errorEl.style.display = "block";
            errorEl.classList.add("shake");
            setTimeout(() => errorEl.classList.remove("shake"), 500);
        }

        if (intentos >= 3 && resetLink) {
            resetLink.style.display = "block";
            showToast("Demasiados intentos. Usa la opción de recuperación.", "error");
        } else {
            showToast(errorMsg, "error");
        }
    }
}

async function handleRegister() {
    const nombre = document.getElementById("nombreRegistro").value.trim();
    const apellido = document.getElementById("apellidoRegistro").value.trim();
    const email = document.getElementById("emailRegistro").value.trim();
    const password = document.getElementById("passRegistro").value;
    const rol_id = document.getElementById("rolRegistro").value;

    setLoading("btnRegistrar", true);
    const { ok, data, error } = await apiRequest("/auth/register", "POST", {
        nombre, apellido, email, password, rol_id
    });
    setLoading("btnRegistrar", false);

    if (ok) {
        showToast("Registro exitoso. Ahora puedes iniciar sesión.", "success");
        setTimeout(() => toggleForms("login"), 2000);
    } else {
        showToast(data?.error || (data?.errors ? data.errors[0].message : null) || error || "Error al registrar usuario", "error");
    }
}

function toggleForms(form) {
    const loginCard = document.getElementById("loginCard");
    const regCard = document.getElementById("registroCard");

    if (form === "login") {
        regCard.classList.add("hidden");
        loginCard.classList.remove("hidden");
        loginCard.style.animation = "fadeInUp 0.5s ease";
    } else {
        loginCard.classList.add("hidden");
        regCard.classList.remove("hidden");
        regCard.style.animation = "fadeInUp 0.5s ease";
        checkRegistrationFormValidity();
    }
}

function validateLive(inputId, type, formId) {
    const input = document.getElementById(inputId);
    const value = input.value.trim();
    let error = null;

    if (value === "" && type !== 'confirmPassword') {
        error = "Campo obligatorio.";
    } else {
        switch (type) {
            case 'text':
                if (/\s/.test(value)) error = "Sin espacios internos.";
                else if (!/^[a-zA-ZÁÉÍÓÚÑáéíóúñ]+$/.test(value)) error = "Solo letras.";
                else if (value[0] !== value[0].toUpperCase()) error = "Debe iniciar en Mayúscula.";
                break;
            case 'email':
                if (/[A-Z]/.test(value)) error = "Solo minúsculas.";
                else if (!validarEmail(value)) error = "Dominio @gmail o @hotmail válido.";
                break;
            case 'password':
                error = validarPassword(value);
                break;
            case 'confirmPassword':
                const passVal = document.getElementById('passRegistro').value;
                if (value !== passVal) {
                    error = "Las contraseñas no coinciden.";
                } else if (value === "") {
                    error = "Campo obligatorio.";
                }
                break;
        }
    }

    displayFieldError(inputId, error);
    setInputBorder(inputId, !!error);

    if (formId === 'registro') checkRegistrationFormValidity();
}

function updatePasswordChecklist() {
    const pass = document.getElementById('passRegistro').value;
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

    const confirmVal = document.getElementById('passConfirm').value;
    if (confirmVal) {
        validateLive('passConfirm', 'confirmPassword', 'registro');
    }

    checkRegistrationFormValidity();
}

function checkRegistrationFormValidity() {
    const nombre = document.getElementById("nombreRegistro").value.trim();
    const apellido = document.getElementById("apellidoRegistro").value.trim();
    const email = document.getElementById("emailRegistro").value.trim();
    const pass = document.getElementById("passRegistro").value;
    const confirm = document.getElementById("passConfirm").value;
    const rol = document.getElementById("rolRegistro").value;
    const acepto = document.getElementById("aceptoTerminos").checked;

    // Validar nombre/apellido
    const isNombreValid = nombre.length >= 2 && nombre[0] === nombre[0].toUpperCase() && /^[a-zA-ZÁÉÍÓÚÑáéíóúñ]+$/.test(nombre);
    const isApellidoValid = apellido.length >= 2 && apellido[0] === apellido[0].toUpperCase() && /^[a-zA-ZÁÉÍÓÚÑáéíóúñ]+$/.test(apellido);

    // Validar email
    const isEmailValid = validarEmail(email);

    // Validar contraseña (checklist completa)
    const isPassValid = validarPassword(pass) === null;

    // Validar coincidencia
    const isMatch = (confirm === pass) && (confirm !== "");

    // Habilitar/Deshabilitar botón
    const btn = document.getElementById("btnRegistrar");
    const isValid = isNombreValid && isApellidoValid && isEmailValid && isPassValid && isMatch && rol && acepto;

    btn.disabled = !isValid;

    // Log para depuración (opcional)
    // console.log({ isNombreValid, isApellidoValid, isEmailValid, isPassValid, isMatch, rol, acepto, isValid });
}

function clearLoginError() {
    const err = document.getElementById("loginError");
    if (err) {
        err.textContent = "";
        err.style.display = "none";
    }
}

function clearFormError(el) {
    const errorEl = document.getElementById(el.id + 'Error');
    if (errorEl) {
        errorEl.textContent = "";
        errorEl.style.display = "none";
    }
    el.style.borderColor = "var(--border-color)";
}

function setLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<span class="loading-spinner"></span> Procesando...';
        btn.disabled = true;
    } else {
        btn.innerHTML = btn.dataset.originalText || "Entrar";
        btn.disabled = false;
        if (btnId === 'btnRegistrar') checkRegistrationFormValidity();
    }
}
