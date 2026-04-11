/**
 * @file auth.js
 * @description Lógica central de autenticación y registro de usuarios para Passly.
 * 
 * [ESTRUCTURA DE ESTUDIO: SEGURIDAD EN EL CLIENTE]
 * Este archivo es el "Portero" de la aplicación. Se encarga de:
 * 1. Validaciones: No dejar que datos basura lleguen al servidor.
 * 2. MFA: Gestionar la transición visual cuando se requiere un segundo factor.
 * 3. Token: Manejar el pase de acceso (JWT) que nos da el servidor.
 */
window.onerror = function(msg, url, line) {
    alert("⚠️ FALLO CRÍTICO PASSLY:\n" + msg + "\nEn: " + url + " L:" + line);
};

import { fetchAPI as apiRequest } from '../src/js/modules/api_service.js';
import { checkSession as checkAuth, handleLogout } from '../src/js/modules/auth.js';
import { initTheme } from './theme.js';
import {
    validarEmail,
    validarPassword,
    showToast,
    setInputBorder,
    displayFieldError,
    escapeHTML
} from './utils.js';

// Contador de intentos de login fallidos (Seguridad visual preventiva)
let intentos = 0;

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Passly Auth Loaded - v2");
    // Inicializar el tema (oscuro/claro) según preferencia guardada en el navegador
    initTheme();

    /**
     * [ESTUDIO: PERSISTENCIA DE SESIÓN]
     * Si ya tenemos un token, redirigimos al Dashboard. 
     * Agregamos un chequeo para evitar bucles si venimos de un fallo.
     */
    const urlParams = new URLSearchParams(window.location.search);
    const sessionFailed = urlParams.has('session_failed') || !localStorage.getItem('auth_token');

    if (!sessionFailed && localStorage.getItem('auth_token') && localStorage.getItem('usuario_activo')) {
        console.log("✨ Sesión detectada, entrando al Dashboard...");
        window.location.href = "dashboard.html";
    }

    // Configurar listeners de eventos (clics, escritura, etc.)
    initEventListeners();

    // Validar estado inicial del botón de registro
    checkRegistrationFormValidity();

    // Iniciar Iconos Lucide
    if (window.lucide) window.lucide.createIcons();

    // 📩 Detectar si el usuario viene de verificar su email exitosamente
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified')) {
        showToast("¡Cuenta verificada! Ya puedes iniciar sesión.", "success");
        // Limpiar URL para que no salga el mensaje al recargar
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// Exponer funciones visuales al objeto window para que funcionen desde el HTML
window.showAuth = (type) => {
    const overlay = document.getElementById('authOverlay');
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
    toggleForms(type);
};

window.hideAuth = () => {
    const overlay = document.getElementById('authOverlay');
    overlay.classList.remove('active');
    setTimeout(() => { if(!overlay.classList.contains('active')) overlay.style.display = 'none'; }, 400);
};

/**
 * initEventListeners: Vincula las acciones del usuario con las funciones de JS.
 */
function initEventListeners() {
    // Cambios entre pestañas de Login y Registro
    const toRegister = document.getElementById("toRegister");
    if (toRegister) toRegister.addEventListener('click', () => toggleForms("register"));

    const toLogin = document.getElementById("toLogin");
    if (toLogin) toLogin.addEventListener('click', () => toggleForms("login"));

    // Botones de la Landing Page (Compatibilidad CSP)
    const btnNavLogin = document.getElementById("btnNavLogin");
    if (btnNavLogin) btnNavLogin.addEventListener('click', () => window.showAuth('login'));

    const btnHeroRegister = document.getElementById("btnHeroRegister");
    if (btnHeroRegister) btnHeroRegister.addEventListener('click', () => window.showAuth('registro'));

    const btnHeroLearnMore = document.getElementById("btnHeroLearnMore");
    if (btnHeroLearnMore) {
        btnHeroLearnMore.addEventListener('click', () => {
            const el = document.getElementById('funciones');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Cerrar Modal
    const btnCloseAuth = document.getElementById("btnCloseAuth");
    if (btnCloseAuth) btnCloseAuth.addEventListener('click', () => window.hideAuth());

    const authOverlay = document.getElementById("authOverlay");
    if (authOverlay) {
        authOverlay.addEventListener('click', (e) => {
            if (e.target === authOverlay) window.hideAuth();
        });
    }
    
    // Flujo de recuperación de contraseña (Modal)
    const resetLink = document.getElementById("resetLink");
    if (resetLink) {
        resetLink.onclick = () => {
            const recoveryModal = document.getElementById('recoveryModal');
            const step1 = document.getElementById('recoveryStep1');
            const step2 = document.getElementById('recoveryStep2');
            const recEmail = document.getElementById('recoveryEmail');
            const emailLogin = document.getElementById('emailLogin');

            if (recoveryModal) recoveryModal.style.display = 'flex';
            if (step1) step1.style.display = 'block';
            if (step2) step2.style.display = 'none';
            if (recEmail && emailLogin) recEmail.value = emailLogin?.value;
        };
    }
    
    const btnCancelRecovery = document.getElementById("btnCancelRecovery");
    if (btnCancelRecovery) btnCancelRecovery.onclick = () => {
        const modal = document.getElementById('recoveryModal');
        if (modal) modal.style.display = 'none';
    };
    
    const btnSendRecovery = document.getElementById("btnSendRecovery");
    if (btnSendRecovery) btnSendRecovery.onclick = handleSendRecovery;

    const btnResetPassword = document.getElementById("btnResetPassword");
    if (btnResetPassword) btnResetPassword.onclick = handleResetPassword;

    // Validación EN VIVO (Live Validation)
    const emailLoginField = document.getElementById('emailLogin');
    if (emailLoginField) {
        emailLoginField.oninput = (e) => {
            validateLive(e.target.id, 'email', 'login');
            clearLoginError();
        };
    }

    const passLoginField = document.getElementById('passLogin');
    if (passLoginField) {
        passLoginField.oninput = (e) => {
            validateLive(e.target.id, 'password', 'login');
            clearLoginError();
        };
    }

    const rolLoginField = document.getElementById('rolLogin');
    if (rolLoginField) rolLoginField.oninput = clearLoginError;

    const regInputs = [
        { id: 'nombreRegistro', type: 'text' },
        { id: 'apellidoRegistro', type: 'text' },
        { id: 'emailRegistro', type: 'email' },
        { id: 'rolRegistro', type: 'select' }
    ];

    const rolRegistroField = document.getElementById('rolRegistro');
    if (rolRegistroField) {
        rolRegistroField.onchange = (e) => {
            const val = e.target.value;
            const secretGroup = document.getElementById('secretCodeGroup');
            if (val === '1' || val === '3') {
                secretGroup.style.display = 'flex';
            } else {
                secretGroup.style.display = 'none';
                document.getElementById('secretCodeRegistro').value = '';
            }
            clearFormError(e.target);
        };
    }

    regInputs.forEach(input => {
        const el = document.getElementById(input.id);
        if (el) {
            el.oninput = () => {
                validateLive(input.id, input.type, 'registro');
                clearFormError(el);
            };
        }
    });

    // Especial: La contraseña de registro actualiza checklist
    const passRegistro = document.getElementById('passRegistro');
    if (passRegistro) {
        passRegistro.oninput = (e) => {
            updatePasswordChecklist();
            clearFormError(e.target);
        };
    }

    const passConfirm = document.getElementById('passConfirm');
    if (passConfirm) {
        passConfirm.oninput = (e) => {
            validateLive(e.target.id, 'confirmPassword', 'registro');
            clearFormError(e.target);
        };
    }

    const aceptoTerminos = document.getElementById('aceptoTerminos');
    if (aceptoTerminos) {
        aceptoTerminos.onchange = () => checkRegistrationFormValidity();
    }

    // Control visual: Mostrar/Ocultar contraseñas
    const togglePass = (btnId, inputId) => {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (!btn || !input) return;

        btn.onclick = () => {
            const isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            const icon = btn.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
                if (window.lucide) window.lucide.createIcons();
            }
        };
    };

    togglePass('togglePassLogin', 'passLogin');

    // Soporte para checkbox showReg opcional
    const showReg = document.getElementById("showReg");
    if (showReg) {
        showReg.onchange = e => {
            const type = e.target.checked ? "text" : "password";
            const passReg = document.getElementById("passRegistro");
            const passConf = document.getElementById("passConfirm");
            if (passReg) passReg.type = type;
            if (passConf) passConf.type = type;
        };
    }

    // Acción de envío
    const btnLogin = document.getElementById("btnLogin");
    if (btnLogin) {
        btnLogin.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleLogin();
        });
    }

    const loginInputs = ['emailLogin', 'passLogin', 'rolLogin'];
    loginInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLogin();
                }
            });
        }
    });

    const btnRegistrar = document.getElementById("btnRegistrar");
    if (btnRegistrar) {
        btnRegistrar.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleRegister();
        });
    }
}

let currentMfaToken = null; // Almacena el token temporal si el login requiere un 2do paso

/**
 * handleLogin: Orquesta el proceso de entrada al sistema.
 * 
 * [ESTUDIO: FLUJO MULTI-FACTOR (MFA)]
 * Si el backend responde 'MFA_REQUIRED', transformamos la interfaz 
 * en una pantalla de ingreso de código de seguridad (TOTP).
 */
async function handleLogin() {
    const emailEl = document.getElementById("emailLogin");
    const passwordEl = document.getElementById("passLogin");
    const rolEl = document.getElementById("rolLogin");
    const errorEl = document.getElementById("loginError");
    const resetLink = document.getElementById("resetLink");

    // CASO: El usuario ya puso su clave y ahora está poniendo el código de su celular (App MFA)
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
            // Guardar sesión definitiva y redirigir
            localStorage.setItem("usuario_activo", JSON.stringify(data.user));
            localStorage.setItem("auth_token", data.token);
            showToast("¡Verificación exitosa!", "success");
            setTimeout(() => window.location.href = "dashboard.html", 1000);
        } else {
            showToast(data?.error || "Código MFA incorrecto", "error");
        }
        return;
    }

    // CASO: Intento inicial de entrada con Email y Clave
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    const rol_id = rolEl.value;

    if (!email || !password || !rol_id) {
        showToast("Por favor, completa todos los campos de acceso.", "error");
        return;
    }

    setLoading("btnLogin", true);
    const response = await apiRequest("/auth/login", "POST", { email, password, rol_id });
    setLoading("btnLogin", false);

    if (!response) {
        showToast("Error de conexión con el servidor", "error");
        return;
    }

    const { ok, data } = response;

    if (ok) {
        // ¿El servidor pide un segundo factor de seguridad?
        if (data.mfaRequired) {
            setLoading("btnLogin", false);
            currentMfaToken = data.mfaToken;

            // Ocultamos el login estándar para mostrar el campo de código MFA
            emailEl.style.display = 'none';
            passwordEl.style.display = 'none';
            rolEl.style.display = 'none';
            document.querySelector('.checkbox-row').style.display = 'none';
            if (resetLink) resetLink.style.display = 'none';

            // Inyectamos la sección visual de MFA
            const mfaHtml = `
                <div id="mfaSection" class="animate-fade-in" style="margin-top:24px; text-align:center;">
                    <div class="stat-icon" style="margin-inline:auto; background:hsla(220, 90%, 65%, 0.1); color:hsla(220, 90%, 65%, 1); margin-bottom:16px;">
                        <i data-lucide="shield-check"></i>
                    </div>
                    <p style="font-size:13px; margin-bottom:20px; color:var(--text-muted);">
                        SE REQUIERE TOKEN DE SEGURIDAD
                    </p>
                    <div class="input-group" style="max-width:240px; margin-inline:auto;">
                        <input id="mfaCode" type="text" placeholder="000 000" maxlength="6" 
                               style="text-align:center; font-size:24px; letter-spacing:0.2em; height:64px; font-weight:700;">
                    </div>
                </div>
            `;

            const loginCard = document.getElementById('loginCard');
            loginCard.insertBefore(
                document.createRange().createContextualFragment(mfaHtml),
                errorEl
            );

            if (window.lucide) window.lucide.createIcons();
            document.getElementById('btnLogin').textContent = "VERIFICAR IDENTIDAD";
            loginCard.querySelector('h2').textContent = "Paso de Seguridad";
            showToast("Token MFA solicitado", "info");
            return;
        }

        // Éxito: Guardamos la información en el 'Bolsillo' del navegador (LocalStorage)
        localStorage.setItem("usuario_activo", JSON.stringify(data.user));
        localStorage.setItem("auth_token", data.token);
        setLoading("btnLogin", false);
        showToast("¡Bienvenido a Passly!", "success");
        setTimeout(() => window.location.href = "dashboard.html", 1000);
    } else {
        // ERROR: Ya no se refresca la página gracias al cambio en api.js
        setLoading("btnLogin", false);
        const errorMsg = data?.error || data?.message || "Credenciales no válidas para el nivel de acceso seleccionado.";
        showToast(errorMsg, "error");
        
        if (errorEl) {
            errorEl.textContent = errorMsg;
            errorEl.style.display = "block";
            errorEl.classList.add("shake");
            setTimeout(() => errorEl.classList.remove("shake"), 500);
        }
    }
}

/**
 * handleRegister: Crea una nueva cuenta en el sistema.
 */
async function handleRegister() {
    const nombre = document.getElementById("nombreRegistro")?.value.trim();
    const apellido = document.getElementById("apellidoRegistro")?.value.trim();
    const email = document.getElementById("emailRegistro")?.value.trim();
    const password = document.getElementById("passRegistro")?.value;
    const confirm = document.getElementById("passConfirm")?.value;
    const rol_id = document.getElementById("rolRegistro")?.value;
    const secret_code = document.getElementById("secretCodeRegistro")?.value.trim();
    const aceptoCheckbox = document.getElementById("aceptoTerminos");
    const acepto = aceptoCheckbox ? aceptoCheckbox.checked : false;

    // Validación Final
    if (!nombre || !apellido || !email || !password || !rol_id) {
        showToast("Por favor, completa todos los campos requeridos.", "error");
        return;
    }

    if ((rol_id === '1' || rol_id === '3') && !secret_code) {
        showToast("Se requiere código de autorización para este rol.", "error");
        return;
    }

    if (!validarEmail(email)) {
        showToast("El formato del correo no es válido.", "error");
        return;
    }

    const passError = validarPassword(password);
    if (passError) {
        showToast(passError, "error");
        return;
    }

    if (password !== confirm) {
        showToast("Las contraseñas no coinciden.", "error");
        return;
    }

    if (!acepto) {
        showToast("Debes aceptar el protocolo de seguridad.", "warning");
        return;
    }

    setLoading("btnRegistrar", true);
    const { ok, data, error } = await apiRequest("/auth/register", "POST", {
        nombre, apellido, email, password, rol_id, secret_code
    });
    setLoading("btnRegistrar", false);

    if (ok) {
        showToast(data?.message || "Identidad creada. Por favor, verifique su correo.", "success");
        setTimeout(() => toggleForms("login"), 2000);
    } else {
        showToast(data?.error || "Error al registrar identidad", "error");
    }
}

/**
 * toggleForms: Alterna visualmente entre Login y Registro.
 */
function toggleForms(form) {
    const loginCard = document.getElementById("loginCard");
    const regCard = document.getElementById("registroCard");

    if (form === "login") {
        regCard.classList.add("hidden");
        loginCard.classList.remove("hidden");
    } else {
        loginCard.classList.add("hidden");
        regCard.classList.remove("hidden");
        checkRegistrationFormValidity();
    }
    if (window.lucide) window.lucide.createIcons();
}

/**
 * validateLive: Valida campos en tiempo real (mientras el usuario escribe).
 */
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
                else if (value[0] !== value[0].toUpperCase()) error = "Inicia con Mayúscula.";
                break;
            case 'email':
                if (/[A-Z]/.test(value)) error = "Solo letras minúsculas.";
                else if (!validarEmail(value)) error = "Correo no válido.";
                break;
            case 'password':
                error = validarPassword(value);
                break;
            case 'confirmPassword':
                const passVal = document.getElementById('passRegistro').value;
                if (value !== passVal) {
                    error = "No coincide con la clave original.";
                } else if (value === "") {
                    error = "Confirma tu clave.";
                }
                break;
        }
    }

    displayFieldError(inputId, error);
    setInputBorder(inputId, !!error); // Pone el borde rojo si hay error

    if (formId === 'registro') checkRegistrationFormValidity();
}

/**
 * updatePasswordChecklist: Actualiza los indicadores visuales de fortaleza de clave.
 */
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
        if (el) {
            el.classList.toggle('valid', isValid);
            const icon = el.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', isValid ? 'check-circle-2' : 'circle');
            }
        }
    }
    if (window.lucide) window.lucide.createIcons();

    const confirmVal = document.getElementById('passConfirm').value;
    if (confirmVal) {
        validateLive('passConfirm', 'confirmPassword', 'registro');
    }

    checkRegistrationFormValidity();
}

/**
 * checkRegistrationFormValidity: Verifica que todo el formulario sea válido.
 * (Se usa para activar o dar feedback del botón de Registro).
 */
function checkRegistrationFormValidity() {
    // Aquí se podrían añadir chequeos más estrictos para el UX
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

/**
 * handleSendRecovery: Paso 1 del Reset de Clave.
 */
async function handleSendRecovery() {
    const emailEl = document.getElementById("recoveryEmail");
    const email = emailEl.value.trim();

    if (!email || !validarEmail(email)) {
        showToast("Ingresa un correo institucional válido.", "error");
        setInputBorder("recoveryEmail", true);
        return;
    }

    setLoading("btnSendRecovery", true);
    const { ok, data, error } = await apiRequest("/auth/forgot-password", "POST", { email });
    setLoading("btnSendRecovery", false);

    if (ok) {
        showToast("Código enviado. Revisa tu bandeja.", "success");
        document.getElementById('recoveryStep1').style.display = 'none';
        document.getElementById('recoveryStep2').style.display = 'block';
        document.getElementById('recoveryTitle').textContent = "Ingresar Código";
    } else {
        showToast(data?.error || "Fallo al enviar código.", "error");
    }
}

/**
 * handleResetPassword: Paso 2 del Reset de Clave.
 */
async function handleResetPassword() {
    const email = document.getElementById("recoveryEmail").value.trim();
    const code = document.getElementById("recoveryCode").value.trim();
    const newPassword = document.getElementById("recoveryNewPass").value;

    if (!code || code.length !== 6) {
        showToast("Código de 6 dígitos requerido.", "error");
        return;
    }

    const passError = validarPassword(newPassword);
    if (passError) {
        showToast(passError, "error");
        return;
    }

    setLoading("btnResetPassword", true);
    const { ok, data, error } = await apiRequest("/auth/reset-password", "POST", { email, code, newPassword });
    setLoading("btnResetPassword", false);

    if (ok) {
        showToast("¡Contraseña actualizada!", "success");
        document.getElementById('recoveryModal').style.display = 'none';
        // Limpiamos campos para seguridad
        document.getElementById("recoveryCode").value = "";
        document.getElementById("recoveryNewPass").value = "";
        showToast("Ya puedes entrar con tus nuevas credenciales.", "info");
    } else {
        showToast(data?.error || "Autorización denegada.", "error");
    }
}

/**
 * [ESTUDIO: CONTROL DE ESTADO DE UI]
 * setLoading: Cambia el aspecto de un botón para indicar una tarea en curso.
 * Evita que el usuario haga múltiples clics ("Double Click") desesperados 
 * que podrían saturar el servidor.
 */
function setLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<span class="loading-spinner"></span> ENVIANDO...';
        btn.disabled = true;
    } else {
        let defaultText = "IDENTIFICARSE";
        if (btnId === "btnRegistrar") defaultText = "REGISTRAR IDENTIDAD";
        if (btnId === "btnSendRecovery") defaultText = "ENVIAR";
        if (btnId === "btnResetPassword") defaultText = "ACTUALIZAR";

        btn.innerHTML = btn.dataset.originalText || defaultText;
        btn.disabled = false;
    }
}
