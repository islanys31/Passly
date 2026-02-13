const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const {
    registerLimiter,
    loginLimiter,
    forgotPasswordLimiter,
    validateRegister,
    validateLogin,
    handleValidationErrors
} = require('../middlewares/security.middleware');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, apellido, email, password, rol_id]
 *             properties:
 *               nombre: { type: string }
 *               apellido: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               rol_id: { type: integer }
 *     responses:
 *       201: { description: User registered }
 *       400: { description: Bad request }
 */
router.post('/register', [registerLimiter, ...validateRegister, handleValidationErrors], authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and get token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Successful login }
 *       401: { description: Invalid credentials }
 */
router.post('/login', [loginLimiter, ...validateLogin, handleValidationErrors], authController.login);

// Recuperación de contraseña
router.post('/forgot-password', [forgotPasswordLimiter], authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
