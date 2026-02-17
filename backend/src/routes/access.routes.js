const express = require('express');
const router = express.Router();
const accessController = require('../controllers/access.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware.verifyToken, accessController.getAllAccess);
router.post('/', authMiddleware.verifyToken, accessController.logAccess);

module.exports = router;
