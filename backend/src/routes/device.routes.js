const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware.verifyToken, deviceController.getAllDevices);
router.post('/', authMiddleware.verifyToken, deviceController.createDevice);
router.put('/:id', authMiddleware.verifyToken, deviceController.updateDevice);
router.delete('/:id', authMiddleware.verifyToken, deviceController.deleteDevice);

module.exports = router;
