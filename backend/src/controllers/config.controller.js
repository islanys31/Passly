const emailService = require('../services/email.service');
const { logAction } = require('../utils/logger');

exports.testEmailConfig = async (req, res) => {
    try {
        // Obtenemos el email destino, preferiblemente el del admin que hace la prueba
        const testEmail = req.user?.email || process.env.EMAIL_USER;
        
        if (!testEmail) {
            return res.status(400).json({ error: 'No se pudo determinar el destinatario para la prueba SMTP.' });
        }

        // Usamos una notificación de seguridad fake para probar el envío
        await emailService.sendSecurityAlert(
            testEmail, 
            req.user?.nombre || 'Administrador', 
            'Prueba de Configuración SMTP', 
            'Si estás leyendo esto, significa que el servicio de correo electrónico (Nodemailer) funciona correctamente en tu servidor.'
        );

        await logAction(req.user?.id, 'Test SMTP Exitoso', 'Sistema', `Se envió correo de prueba a ${testEmail}`, req.ip);

        res.json({ success: true, message: `Correo de prueba enviado con éxito a ${testEmail}` });
    } catch (error) {
        console.error('ERROR TEST EMAIL:', error);
        res.status(500).json({ error: 'Fallo al despachar el correo electrónico de prueba. Verifica el log del servidor.' });
    }
};
