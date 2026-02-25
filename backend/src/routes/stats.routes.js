const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware.verifyToken, statsController.getGeneralStats);
router.get('/traffic', authMiddleware.verifyToken, statsController.getTrafficByHour);

module.exports = router;
