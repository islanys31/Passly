const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transport.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware.verifyToken, transportController.getAllTransports);
router.post('/', authMiddleware.verifyToken, transportController.createTransport);
router.put('/:id', authMiddleware.verifyToken, transportController.updateTransport);
router.delete('/:id', authMiddleware.verifyToken, transportController.deleteTransport);

module.exports = router;
