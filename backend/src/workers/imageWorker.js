const { Worker } = require('bullmq');
const connection = require('../config/redis');
const analysisService = require('../services/analysisService');
const logger = require('../utils/logger');
const prisma = require('../config/db');

const worker = new Worker('image-processing', async (job) => {
  const { uploadId, filePath } = job.data;
  logger.info(`Processing image: ${uploadId}`);
  
  try {
    await prisma.upload.update({ where: { id: uploadId }, data: { status: 'PROCESSING' } });
    await analysisService.analyzeImage(uploadId, filePath);
    logger.info(`Completed image: ${uploadId}`);
  } catch (err) {
    logger.error(`Failed image: ${uploadId} - ${err.message}`);
    await prisma.upload.update({ where: { id: uploadId }, data: { status: 'FAILED', failureReason: err.message } });
    throw err;
  }
}, { connection });

logger.info('Worker started');
