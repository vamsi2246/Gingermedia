const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const apiController = require('../controllers/apiController');

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

router.post('/upload', upload.single('image'), apiController.uploadImage);
router.get('/status/:id', apiController.getStatus);
router.get('/result/:id', apiController.getResult);
router.get('/health', apiController.getHealth);
router.get('/analytics', apiController.getAnalytics);
router.get('/recent', apiController.getRecent);

module.exports = router;
