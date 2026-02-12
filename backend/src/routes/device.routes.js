const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', deviceController.getAllDevices);
router.post('/', deviceController.createDevice);
router.put('/:id', deviceController.updateDevice);
router.delete('/:id', deviceController.deleteDevice);

module.exports = router;
