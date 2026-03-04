const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, configController.getSettings);
router.patch('/', verifyToken, configController.updateSettings);

module.exports = router;
