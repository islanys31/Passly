const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transport.controller');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, transportController.getAllTransportModes);

module.exports = router;
