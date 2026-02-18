const express = require('express');
const router = express.Router();
const logController = require('../controllers/log.controller');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

// Solo administradores (rol_id = 1) pueden ver los logs de auditoría
router.get('/', verifyToken, verifyRole([1]), logController.getAuditLogs);

module.exports = router;
