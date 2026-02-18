const nodemailer = require('nodemailer');

// Configuración del transportador de email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'noreply.passly@gmail.com',
        pass: process.env.EMAIL_PASS || 'tu_contraseña_de_aplicacion'
    }
});

/**
 * Enviar código de recuperación
 */
exports.sendRecoveryCode = async (to, code, userName) => {
    const mailOptions = {
        from: `"Passly Security" <${process.env.EMAIL_USER || 'noreply.passly@gmail.com'}>`,
        to: to,
        subject: '🔐 Código de Recuperación - Passly',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
                <div style="background: linear-gradient(135deg, #2E7D32, #2979FF); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 32px;">🔐 Passly</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Sistema de Control de Accesos</p>
                </div>
                
                <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px;">
                    <h2 style="color: #333; margin-top: 0;">Hola, ${userName}</h2>
                    <p style="color: #666; line-height: 1.6;">
                        Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código de seguridad para continuar:
                    </p>
                    
                    <div style="background: #f0f0f0; border-left: 4px solid #2E7D32; padding: 20px; margin: 30px 0; text-align: center;">
                        <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">TU CÓDIGO DE RECUPERACIÓN</p>
                        <h1 style="color: #2E7D32; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: monospace;">${code}</h1>
                    </div>
                    
                    <p style="color: #666; line-height: 1.6;">
                        Este código es válido por <strong>15 minutos</strong>. Si no solicitaste este cambio, ignora este mensaje.
                    </p>
                    
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                        <p style="color: #999; font-size: 12px; margin: 0;">
                            Este es un mensaje automático. Por favor no respondas a este correo.
                        </p>
                        <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                            © ${new Date().getFullYear()} Passly - Todos los derechos reservados
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

/**
 * Enviar confirmación de cambio de contraseña
 */
exports.sendPasswordChangeConfirmation = async (to, userName) => {
    const mailOptions = {
        from: `"Passly Security" <${process.env.EMAIL_USER || 'noreply.passly@gmail.com'}>`,
        to: to,
        subject: '✅ Contraseña Actualizada - Passly',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
                <div style="background: linear-gradient(135deg, #2E7D32, #2979FF); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 32px;">✅ Passly</h1>
                </div>
                
                <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px;">
                    <h2 style="color: #333; margin-top: 0;">Hola, ${userName}</h2>
                    <p style="color: #666; line-height: 1.6;">
                        Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
                    </p>
                    
                    <div style="background: #e8f5e9; border-left: 4px solid #2E7D32; padding: 15px; margin: 20px 0;">
                        <p style="color: #2E7D32; margin: 0; font-weight: 600;">
                            ✓ Cambio realizado el ${new Date().toLocaleString('es-ES')}
                        </p>
                    </div>
                    
                    <p style="color: #666; line-height: 1.6;">
                        Si no realizaste este cambio, contacta inmediatamente al administrador del sistema.
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
