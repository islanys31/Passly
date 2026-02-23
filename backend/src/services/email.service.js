const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'noreply.passly@gmail.com',
        pass: process.env.EMAIL_PASS || 'tu_contraseña_de_aplicacion'
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

