const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const authMiddleware = require('../middlewares/authMiddleware');

// Ruta protegida para obtener estadísticas
router.get('/', authMiddleware.verifyToken, statsController.getGeneralStats);

module.exports = router;
