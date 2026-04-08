const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Gestión de usuarios del sistema
 * 
 * /api/usuarios:
 *   get:
 *     summary: Obtener lista paginada de usuarios
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios recuperada exitosamente
 *   post:
 *     summary: Crear un nuevo usuario en la organización
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Usuario creado
 */

const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/me', authMiddleware.verifyToken, userController.getMe);
router.get('/', authMiddleware.verifyToken, userController.getAllUsers);
router.post('/', authMiddleware.verifyToken, userController.createUser);
router.put('/:id', authMiddleware.verifyToken, userController.updateUser);
router.put('/:id/password', authMiddleware.verifyToken, userController.changePassword);
router.post('/:id/photo', authMiddleware.verifyToken, require('../middlewares/upload.middleware').single('photo'), userController.uploadPhoto);
router.delete('/:id', authMiddleware.verifyToken, userController.deleteUser);

module.exports = router;
