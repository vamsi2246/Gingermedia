const multer = require('multer');
const path = require('path');
const { upload: config } = require('../config/env');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.dir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxSize },
  fileFilter: (req, file, cb) => {
    if (config.allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  }
});

module.exports = upload;
