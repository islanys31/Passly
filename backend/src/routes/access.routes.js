const express = require('express');
const router = express.Router();
const accessController = require('../controllers/access.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware.verifyToken, accessController.getAllAccess);
router.get('/qr', authMiddleware.verifyToken, accessController.generateAccessQR);
router.post('/invitation', authMiddleware.verifyToken, accessController.createGuestInvitation);
router.post('/scan', authMiddleware.verifyToken, accessController.validateScan);
router.post('/', authMiddleware.verifyToken, accessController.logAccess);

module.exports = router;
