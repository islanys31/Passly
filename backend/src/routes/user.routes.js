const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/me', authMiddleware.verifyToken, userController.getMe);
router.get('/', authMiddleware.verifyToken, userController.getAllUsers);
router.post('/', authMiddleware.verifyToken, userController.createUser);
router.put('/:id', authMiddleware.verifyToken, userController.updateUser);
router.post('/:id/photo', authMiddleware.verifyToken, require('../middlewares/upload.middleware').single('photo'), userController.uploadPhoto);
router.delete('/:id', authMiddleware.verifyToken, userController.deleteUser);

module.exports = router;
