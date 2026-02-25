/**
 * @file email.service.js
 * @description Servicio centralizado para el envío de correos electrónicos.
 * Utiliza Nodemailer para conectar con un servidor SMTP (como Gmail) y enviar plantillas HTML.
 * Incluye funciones para: Bienvenida, Invitaciones, Alertas de seguridad y Recuperación.
 */

const nodemailer = require('nodemailer');

/**
 * Configuración del transportador SMTP.
 * Se alimenta de variables de entorno para mayor seguridad y flexibilidad.
 */
let transporter;
try {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // 🛡️ NO bloqueamos el inicio de la App si el email falla
    transporter.verify((error) => {
        if (error) {
            console.warn('⚠️ Advertencia: El servicio de correos no está disponible. Verifique SMTP.');
        } else {
            console.log('📧 Correo: El servidor está listo para enviar mensajes.');
        }
    });
} catch (e) {
    console.error('❌ Error fatal al inicializar Nodemailer:', e.message);
}


// Colores institucionales de la marca Passly para las plantillas HTML
const APP_COLOR_PRIMARY = '#2E7D32'; // Verde
const APP_COLOR_ACCENT = '#2979FF';  // Azul

/**
 * Envía un código de 6 dígitos para la recuperación de contraseña.
 * @param {string} to - Email del destinatario
 * @param {string} code - Código de seguridad generado
 * @param {string} userName - Nombre del usuario para personalización
 */
exports.sendRecoveryCode = async (to, code, userName) => {
    const mailOptions = {
        from: `"Passly Security" <${process.env.EMAIL_USER || 'noreply.passly@gmail.com'}>`,
        to: to,
        subject: '🔐 Tu código de seguridad Passly: ' + code,
        html: `
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 16px;">
                <div style="background: linear-gradient(135deg, ${APP_COLOR_PRIMARY}, ${APP_COLOR_ACCENT}); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h1 style="color: white; margin: 0; font-size: 38px; font-weight: 800; letter-spacing: -1px;">Passly</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Seguridad en cada acceso</p>
                </div>
                
                <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: none;">
                    <h2 style="color: #1a1a1a; margin-top: 0; font-size: 24px;">Hola, ${userName}</h2>
                    <p style="color: #444; line-height: 1.6; font-size: 16px;">
                        Has solicitado restablecer tu contraseña. Entendemos lo importante que es tu seguridad, por eso hemos generado un código único para ti:
                    </p>
                    
                    <div style="background: #f8fafc; border: 2px dashed ${APP_COLOR_PRIMARY}; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
                        <span style="color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; display: block; margin-bottom: 10px;">CÓDIGO DE VERIFICACIÓN</span>
                        <h1 style="color: ${APP_COLOR_PRIMARY}; font-size: 48px; letter-spacing: 12px; margin: 0; font-family: 'Courier New', monospace; font-weight: bold;">${code}</h1>
                    </div>
                    
                    <p style="color: #64748b; line-height: 1.6; font-size: 14px; background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                        <strong>Importante:</strong> Este código expirará en 15 minutos. Si no has sido tú quien ha solicitado este cambio, te recomendamos <strong>actualizar tus credenciales</strong> lo antes posible.
                    </p>
                    
                    <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #f1f5f9; text-align: center;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                            © ${new Date().getFullYear()} Passly Inc. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Error al enviar email de recuperación:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Notifica al usuario que su contraseña ha sido cambiada.
 */
exports.sendPasswordChangeConfirmation = async (to, userName) => {
    const mailOptions = {
        from: `"Passly Security" <${process.env.EMAIL_USER || 'noreply.passly@gmail.com'}>`,
        to: to,
        subject: '✅ Seguridad Passly: Contraseña actualizada',
        html: `
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 16px;">
                <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <div style="background: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                        <span style="font-size: 30px;">✅</span>
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 800;">Passly</h1>
                </div>
                
                <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: none;">
                    <h2 style="color: #1a1a1a; margin-top: 0;">Hola, ${userName}</h2>
                    <p style="color: #444; line-height: 1.6; font-size: 16px;">
                        Te notificamos que la contraseña de tu cuenta ha sido <strong>cambiada exitosamente</strong>.
                    </p>
                    <p style="color: #dc2626; line-height: 1.6; font-size: 14px; font-weight: bold;">
                        ⚠️ Si tú no realizaste esta acción, por favor contacta a soporte de inmediato.
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error al enviar confirmación de contraseña:', error);
    }
};

/**
 * Envía un correo de bienvenida a un nuevo usuario registrado.
 */
exports.sendWelcomeEmail = async (to, userName) => {
    const mailOptions = {
        from: `"Passly Security" <${process.env.EMAIL_USER || 'noreply.passly@gmail.com'}>`,
        to: to,
        subject: '🚀 ¡Bienvenido a Passly, ' + userName + '!',
        html: `
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 16px;">
                <div style="background: linear-gradient(135deg, ${APP_COLOR_PRIMARY}, ${APP_COLOR_ACCENT}); padding: 50px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 40px; font-weight: 900;">¡Hola ${userName}!</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">Bienvenido a la seguridad inteligente.</p>
                </div>
                
                <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: none;">
                    <p style="color: #444; line-height: 1.6; font-size: 16px;">
                        Passly está listo para ayudarte a gestionar tus accesos de forma rápida y moderna. Escanea, entra y mantente seguro.
                    </p>
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                           style="background: linear-gradient(135deg, ${APP_COLOR_PRIMARY}, ${APP_COLOR_ACCENT}); color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px;">
                            Comenzar ahora
                        </a>
                    </div>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error al enviar bienvenida:', error);
    }
};

/**
 * Envía una invitación de acceso a un huésped.
 */
exports.sendInvitationEmail = async (to, guestName, hostName, token, expirationDate) => {
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/guest.html?token=${token}`;

    const mailOptions = {
        from: `"Passly Access" <${process.env.EMAIL_USER || 'noreply.passly@gmail.com'}>`,
        to: to,
        subject: '🎫 Tienes una invitación de acceso - Passly',
        html: `
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f1f5f9; padding: 20px; border-radius: 16px;">
                <div style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                    <div style="background: ${APP_COLOR_ACCENT}; padding: 30px; text-align: center;">
                        <h2 style="color: white; margin: 0;">🎫 Invitación de Acceso</h2>
                    </div>
                    <div style="padding: 40px;">
                        <p style="color: #334155;">Hola <strong>${guestName}</strong>, <strong>${hostName}</strong> te ha invitado.</p>
                        <p>Usa el siguiente enlace para ver tu código QR de acceso válido hasta el ${new Date(expirationDate).toLocaleDateString()}.</p>
                        <a href="${invitationLink}" style="display: block; background: #1e293b; color: white; padding: 15px; text-decoration: none; border-radius: 10px; text-align: center; font-weight: bold;">
                            VER MI CÓDIGO QR
                        </a>
                    </div>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error al enviar invitación:', error);
    }
};

/**
 * Envía una alerta de seguridad por acciones críticas (como activar MFA).
 */
exports.sendSecurityAlert = async (to, userName, action, details) => {
    const mailOptions = {
        from: `"Passly Security" <${process.env.EMAIL_USER || 'noreply.passly@gmail.com'}>`,
        to: to,
        subject: '⚠️ Alerta de Seguridad Passly: ' + action,
        html: `
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff1f2; padding: 20px; border-radius: 16px;">
                <div style="background: #e11d48; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h2 style="color: white; margin: 0;">🛡️ Alerta de Seguridad</h2>
                </div>
                <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #fda4af;">
                    <p>Hola <strong>${userName}</strong>,</p>
                    <p>Se ha detectado la siguiente actividad en tu cuenta:</p>
                    <div style="background: #f8fafc; border-left: 4px solid #e11d48; padding: 15px;">
                        <strong>ACCIÓN:</strong> ${action}<br>
                        <strong>DETALLES:</strong> ${details}
                    </div>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error al enviar alerta de seguridad:', error);
    }
};
