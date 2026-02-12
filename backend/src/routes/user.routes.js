const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

router.use(verifyToken); // Protect all routes

router.get('/', /* verifyRole([1]), */ userController.getAllUsers); // Usually admin only
router.get('/:id', userController.getUserById);
router.post('/', verifyRole([1]), userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', verifyRole([1]), userController.deleteUser);

module.exports = router;
