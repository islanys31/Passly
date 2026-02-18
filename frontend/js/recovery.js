// Recovery handlers
document.getElementById('btnSendCode').onclick = async () => {
    const email = document.getElementById('emailRecovery').value.trim();
    if (!email || !/^[^@\s]+@(gmail\.com|hotmail\.com)$/i.test(email)) {
        return alert('Ingresa un correo válido (@gmail.com o @hotmail.com)');
    }

    const btn = document.getElementById('btnSendCode');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (res.ok) {
            alert('✅ Código enviado a tu correo. Revisa tu bandeja de entrada.');
            document.getElementById('stepEmail').classList.add('hidden');
            document.getElementById('stepCode').classList.remove('hidden');
        } else {
            alert(data.error || 'Error al enviar el código');
        }
    } catch (err) {
        alert('Error de conexión');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar Código';
    }
};

document.getElementById('btnResetPassword').onclick = async () => {
    const email = document.getElementById('emailRecovery').value.trim();
    const code = document.getElementById('codeRecovery').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!code || code.length !== 6) return alert('Ingresa el código de 6 dígitos');
    if (newPassword !== confirmPassword) return alert('Las contraseñas no coinciden');

    const btn = document.getElementById('btnResetPassword');
    btn.disabled = true;
    btn.textContent = 'Restableciendo...';

    try {
        const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword })
        });
        const data = await res.json();

        if (res.ok) {
            alert('✅ Contraseña actualizada exitosamente. Ya puedes iniciar sesión.');
            document.getElementById('recoveryCard').classList.add('hidden');
            document.getElementById('loginCard').classList.remove('hidden');
            document.getElementById('stepEmail').classList.remove('hidden');
            document.getElementById('stepCode').classList.add('hidden');
        } else {
            alert(data.error || 'Código inválido o expirado');
        }
    } catch (err) {
        alert('Error de conexión');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Restablecer Contraseña';
    }
};

document.getElementById('showRecovery').onchange = (e) => {
    const type = e.target.checked ? 'text' : 'password';
    document.getElementById('newPassword').type = type;
    document.getElementById('confirmPassword').type = type;
};
