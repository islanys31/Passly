const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

// Solo Administradores (Rol 1) pueden testear configuración
router.get('/test-email', verifyToken, verifyRole([1]), configController.testEmailConfig);

module.exports = router;
