const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Stats
 *   description: Métricas KPI para el Dashboard administrativo
 * 
 * /api/stats:
 *   get:
 *     summary: Recupera el estado estadístico principal cacheado
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Objeto con conteos
 */

const statsController = require('../controllers/stats.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware.verifyToken, statsController.getGeneralStats);
router.get('/traffic', authMiddleware.verifyToken, statsController.getTrafficByHour);

module.exports = router;
