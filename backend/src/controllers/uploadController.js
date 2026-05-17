const uploadService = require('../services/uploadService');
const response = require('../utils/responseFormatter');

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return response.error(res, 'No file uploaded', 400);
    const upload = await uploadService.createUpload(req.file);
    response.success(res, { id: upload.id, status: upload.status }, 'Upload successful', 202);
  } catch (err) {
    next(err);
  }
};

exports.status = async (req, res, next) => {
  try {
    const status = await uploadService.getStatus(req.params.id);
    if (!status) return response.error(res, 'Not found', 404);
    response.success(res, status);
  } catch (err) {
    next(err);
  }
};
