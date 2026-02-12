const express = require('express');
const router = express.Router();
const accessController = require('../controllers/access.controller');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', accessController.getAllAccessLogs);
router.post('/', accessController.registerAccess);

module.exports = router;
