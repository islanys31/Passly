const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

// Validaciones básicas podrían añadirse
router.get('/', verifyToken, verifyRole([1]), clientController.getAll);
router.post('/', verifyToken, verifyRole([1]), clientController.create);
router.put('/:id', verifyToken, verifyRole([1]), clientController.update);
router.delete('/:id', verifyToken, verifyRole([1]), clientController.deactivate);

module.exports = router;
