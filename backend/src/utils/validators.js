const { body, param } = require('express-validator');

exports.uploadValidators = [
  // Multer handles file presence, but we can add more logic here if needed
];

exports.idParamValidator = [
  param('id').isUUID().withMessage('Invalid processing ID format')
];
