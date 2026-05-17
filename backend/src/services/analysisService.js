const fs = require('fs/promises');
const blurService = require('./blurService');
const brightnessService = require('./brightnessService');
const ocrService = require('./ocrService');
const duplicateService = require('./duplicateService');
const { computePHash } = require('../utils/imageHash');
const prisma = require('../config/db');

exports.analyzeImage = async (uploadId, filePath) => {
  const buffer = await fs.readFile(filePath);
  
  const [blurScore, brightness, pHash] = await Promise.all([
    blurService.detectBlur(buffer),
    brightnessService.analyzeBrightness(buffer),
    computePHash(buffer)
  ]);

  const duplicate = await duplicateService.checkDuplicate(pHash);
  const ocr = await ocrService.extractText(buffer);
  
  // Simple heuristic for pattern validation (e.g., alphanumeric)
  const patternValid = /^[a-zA-Z0-9]+$/.test(ocr.text.replace(/\s/g, ''));
  
  const verdict = blurScore < 0.3 ? 'POOR_QUALITY' : (duplicate.isDuplicate ? 'SUSPICIOUS' : 'ACCEPTABLE');

  await prisma.$transaction([
    prisma.imageHash.create({ data: { uploadId, pHash } }),
    prisma.analysisResult.create({
      data: {
        uploadId,
        blurScore,
        brightnessValue: brightness.value,
        brightnessCategory: brightness.category,
        ocrText: ocr.text,
        ocrConfidence: ocr.confidence,
        patternValid,
        isDuplicate: duplicate.isDuplicate,
        confidenceScore: ocr.confidence,
        overallVerdict: verdict
      }
    }),
    prisma.upload.update({ where: { id: uploadId }, data: { status: 'COMPLETED' } })
  ]);
};
