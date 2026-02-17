const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transport.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware.verifyToken, transportController.getAllTransports);

module.exports = router;
