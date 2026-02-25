/**
 * @file equipo.routes.js
 * @description Rutas para la gestión de Equipos Tecnológicos.
 * Todas las rutas requieren token JWT válido (usuario autenticado).
 */

const express = require('express');
const router = express.Router();
const equipoController = require('../controllers/equipo.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware.verifyToken, equipoController.getAllEquipos);
router.post('/', authMiddleware.verifyToken, equipoController.createEquipo);
router.put('/:id', authMiddleware.verifyToken, equipoController.updateEquipo);
router.delete('/:id', authMiddleware.verifyToken, equipoController.deleteEquipo);

module.exports = router;
