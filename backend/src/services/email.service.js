const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true para puerto 465, false para otros
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const APP_COLOR_PRIMARY = '#2E7D32';
const APP_COLOR_ACCENT = '#2979FF';

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
                            Estás recibiendo este correo porque tienes una cuenta en nuestro sistema de seguridad Passly.
                        </p>
                        <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0; font-weight: bold;">
                            © ${new Date().getFullYear()} Passly Inc.
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
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};

exports.sendPasswordChangeConfirmation = async (to, userName) => {
    const mailOptions = {
        from: `"Passly Security" <${process.env.EMAIL_USER || 'noreply.passly@gmail.com'}>`,
        to: to,
        subject: '✅ Seguridad Passly: Contraseña actualizada',
        html: `
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 16px;">
                <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <div style="background: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                        <span style="font-size: 30px;">✅</span>
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 800;">Passly</h1>
                </div>
                
                <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: none;">
                    <h2 style="color: #1a1a1a; margin-top: 0;">Hola, ${userName}</h2>
                    <p style="color: #444; line-height: 1.6; font-size: 16px;">
                        Te notificamos que la contraseña de tu cuenta ha sido <strong>cambiada exitosamente</strong>.
                    </p>
                    
                    <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 20px; margin: 25px 0;">
                        <p style="color: #065f46; margin: 0; font-size: 14px;">
                            <strong>Detalles de la actividad:</strong><br>
                            Fecha: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br>
                            Hora: ${new Date().toLocaleTimeString('es-ES')}<br>
                            Estado: Completado ✓
                        </p>
                    </div>
                    
                    <p style="color: #dc2626; line-height: 1.6; font-size: 14px; font-weight: bold;">
                        ⚠️ Si tú no realizaste esta acción, tu cuenta podría estar en riesgo. Por favor contacta a soporte de inmediato.
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        return { success: false, error: error.message };
    }
};

exports.sendWelcomeEmail = async (to, userName) => {
    const mailOptions = {
        from: `"Passly Security" <${process.env.EMAIL_USER || 'noreply.passly@gmail.com'}>`,
        to: to,
        subject: '🚀 ¡Bienvenido a Passly, ' + userName + '!',
        html: `
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 16px;">
                <div style="background: linear-gradient(135deg, ${APP_COLOR_PRIMARY}, ${APP_COLOR_ACCENT}); padding: 50px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 40px; font-weight: 900;">¡Hola ${userName}!</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">Tu viaje hacia una seguridad inteligente comienza aquí.</p>
                </div>
                
                <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: none;">
                    <p style="color: #444; line-height: 1.6; font-size: 16px;">
                        Estamos muy emocionados de tenerte con nosotros. Passly es la plataforma definitiva para gestionar accesos de forma rápida, segura y moderna.
                    </p>
                    
                    <div style="margin: 30px 0; padding: 25px; background: #f0fdf4; border-radius: 12px; border-left: 5px solid ${APP_COLOR_PRIMARY};">
                        <h3 style="color: ${APP_COLOR_PRIMARY}; margin-top: 0;">¿Qué puedes hacer ahora?</h3>
                        <ul style="color: #166534; padding-left: 20px; margin-bottom: 0;">
                            <li>Generar tu propio <strong>Código QR</strong> personal.</li>
                            <li>Crear invitaciones temporales para tus visitas.</li>
                            <li>Gestionar tus dispositivos y medios de transporte.</li>
                            <li>Monitorear tus accesos en tiempo real.</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                           style="background: linear-gradient(135deg, ${APP_COLOR_PRIMARY}, ${APP_COLOR_ACCENT}); color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(41, 121, 255, 0.3);">
                            Ir al Dashboard
                        </a>
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px; text-align: center;">
                        Si tienes alguna duda, nuestro equipo de soporte está siempre listo para ayudarte.
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return { success: false, error: error.message };
    }
};

exports.sendInvitationEmail = async (to, guestName, hostName, token, expirationDate) => {
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/guest.html?token=${token}`;

    const mailOptions = {
        from: `"Passly Access" <${process.env.EMAIL_USER || 'noreply.passly@gmail.com'}>`,
        to: to,
        subject: '🎫 Tienes una invitación de acceso - Passly',
        html: `
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f1f5f9; padding: 20px; border-radius: 16px;">
                <div style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <div style="background: ${APP_COLOR_ACCENT}; padding: 30px; text-align: center;">
                        <div style="background: white; width: 50px; height: 50px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                            <span style="font-size: 24px;">🎫</span>
                        </div>
                        <h2 style="color: white; margin: 0; font-size: 24px;">Invitación de Acceso</h2>
                    </div>
                    
                    <div style="padding: 40px;">
                        <p style="color: #334155; font-size: 18px; margin-top: 0;">Hola <strong>${guestName}</strong>,</p>
                        <p style="color: #64748b; line-height: 1.6;">
                            <strong>${hostName}</strong> ha generado una invitación de acceso para ti en el sistema Passly.
                        </p>
                        
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center;">
                            <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 0;">Tu pase vence el:</p>
                            <p style="color: #1e293b; font-size: 20px; font-weight: bold; margin: 5px 0 20px 0;">
                                ${new Date(expirationDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            
                            <a href="${invitationLink}" 
                               style="display: block; background: #1e293b; color: white; padding: 15px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px;">
                                Ver mi Código QR
                            </a>
                        </div>
                        
                        <p style="color: #64748b; font-size: 13px; font-style: italic;">
                            * Por favor, presenta este código QR en portería o al personal de seguridad al momento de tu llegada.
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
        console.error('Error sending invitation email:', error);
        return { success: false, error: error.message };
    }
};

exports.sendSecurityAlert = async (to, userName, action, details) => {
    const mailOptions = {
        from: `"Passly Security" <${process.env.EMAIL_USER || 'noreply.passly@gmail.com'}>`,
        to: to,
        subject: '⚠️ Alerta de Seguridad Passly: ' + action,
        html: `
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff1f2; padding: 20px; border-radius: 16px;">
                <div style="background: #e11d48; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <span style="font-size: 40px;">🛡️</span>
                    <h2 style="color: white; margin: 10px 0 0 0;">Aviso de Seguridad</h2>
                </div>
                
                <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #fda4af; border-top: none;">
                    <h3 style="color: #1a1a1a; margin-top: 0;">Hola, ${userName}</h3>
                    <p style="color: #444; line-height: 1.6; font-size: 16px;">
                        Te informamos que se ha detectado un cambio importante relacionado con la seguridad de tu cuenta:
                    </p>
                    
                    <div style="background: #f8fafc; border-left: 4px solid #e11d48; padding: 20px; margin: 25px 0;">
                        <p style="margin: 0; color: #1e293b; font-weight: bold;">Acción: ${action}</p>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Detalles: ${details}</p>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Fecha: ${new Date().toLocaleString('es-ES')}</p>
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px;">
                        Si has sido tú, puedes ignorar este mensaje. De lo contrario, por favor cambia tu contraseña y contacta al administrador de inmediato.
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Error sending security alert:', error);
        return { success: false, error: error.message };
    }
};

