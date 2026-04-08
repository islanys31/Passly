const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticación y gestión de identidad
 * 
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión en la plataforma
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso, devuelve JWT
 *       401:
 *         description: Credenciales inválidas
 * 
 * /api/auth/register:
 *   post:
 *     summary: Registro de nuevo usuario (Tenant owner)
 *     tags: [Auth]
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 */

const authController = require('../controllers/auth.controller');
const {
    registerLimiter,
    loginLimiter,
    forgotPasswordLimiter,
    validateRegister,
    validateLogin,
    handleValidationErrors
} = require('../middlewares/security.middleware');

const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/register', [registerLimiter, ...validateRegister, handleValidationErrors], authController.register);
router.post('/login', [loginLimiter, ...validateLogin, handleValidationErrors], authController.login);
router.get('/verify', authController.verifyEmail);
router.post('/logout', authController.logout); // Elimina la cookie httpOnly de sesión
router.post('/forgot-password', [forgotPasswordLimiter], authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// MFA Routes
router.get('/mfa/setup', verifyToken, authController.mfaSetup);
router.post('/mfa/verify', verifyToken, authController.mfaVerify);
router.post('/mfa/login', authController.mfaLogin);

module.exports = router;
