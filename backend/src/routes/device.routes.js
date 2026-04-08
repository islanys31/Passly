const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dispositivos
 *   description: Gestión de activos de hardware y parque automotor
 * 
 * /api/dispositivos:
 *   get:
 *     summary: Obtener lista paginada de todos los dispositivos/vehículos
 *     tags: [Dispositivos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de dispositivos devuelta
 */

const deviceController = require('../controllers/device.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware.verifyToken, deviceController.getAllDevices);
router.post('/', authMiddleware.verifyToken, deviceController.createDevice);
router.put('/:id', authMiddleware.verifyToken, deviceController.updateDevice);
router.delete('/:id', authMiddleware.verifyToken, deviceController.deleteDevice);

module.exports = router;
