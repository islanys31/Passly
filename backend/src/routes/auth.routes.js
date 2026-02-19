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

const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/register', [registerLimiter, ...validateRegister, handleValidationErrors], authController.register);
router.post('/login', [loginLimiter, ...validateLogin, handleValidationErrors], authController.login);
router.post('/forgot-password', [forgotPasswordLimiter], authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// MFA Routes
router.get('/mfa/setup', verifyToken, authController.mfaSetup);
router.post('/mfa/verify', verifyToken, authController.mfaVerify);
router.post('/mfa/login', authController.mfaLogin);

module.exports = router;
