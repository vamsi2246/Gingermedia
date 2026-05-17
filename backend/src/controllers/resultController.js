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
