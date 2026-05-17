const prisma = require('../config/db');
const response = require('../utils/responseFormatter');

exports.getResult = async (req, res, next) => {
  try {
    const result = await prisma.analysisResult.findUnique({ where: { uploadId: req.params.id } });
    if (!result) return response.error(res, 'Result not found', 404);
    response.success(res, result);
  } catch (err) {
    next(err);
  }
};

exports.getRecent = async (req, res, next) => {
  try {
    const uploadService = require('../services/uploadService');
    const recent = await uploadService.getRecentUploads();
    response.success(res, recent);
  } catch (err) {
    next(err);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const uploadService = require('../services/uploadService');
    const analytics = await uploadService.getAnalytics();
    response.success(res, analytics);
  } catch (err) {
    next(err);
  }
};
