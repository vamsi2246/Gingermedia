const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const uploadMiddleware = require('../middleware/uploadMiddleware');

router.post('/', uploadMiddleware.single('image'), uploadController.upload);
router.get('/:id', uploadController.status);

module.exports = router;
