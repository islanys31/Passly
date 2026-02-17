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

router.post('/register', [registerLimiter, ...validateRegister, handleValidationErrors], authController.register);
router.post('/login', [loginLimiter, ...validateLogin, handleValidationErrors], authController.login);
router.post('/forgot-password', [forgotPasswordLimiter], authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
