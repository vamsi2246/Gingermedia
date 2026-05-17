const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const prisma = require('../config/db');
const imageAnalysis = require('../services/imageAnalysis');
const fs = require('fs');
const crypto = require('crypto');

const worker = new Worker('image-processing', async job => {
    const { uploadId, filePath } = job.data;
    
    try {
        await prisma.upload.update({
            where: { id: uploadId },
            data: { status: 'PROCESSING' }
        });

        const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
        
        // 1. Realistic Failure Simulation
        if (upload.mimeType === 'text/plain' || upload.filename.endsWith('.txt')) {
            throw new Error('INVALID_IMAGE_FORMAT: .txt files are not supported for visual analysis.');
        }
        if (upload.mimeType === 'application/zip' || upload.filename.endsWith('.zip')) {
            throw new Error('UNSUPPORTED_ARCHIVE: Please extract archive contents before uploading.');
        }
        if (upload.originalName.toLowerCase().includes('corrupt')) {
            throw new Error('OCR_PIPELINE_ERROR: Tesseract engine crashed during text region alignment.');
        }

        
        // 1. Calculate image hash
        const imageBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');

        // 2. Check for duplicate in DB
        const existing = await prisma.analysisResult.findFirst({
            where: { imageHash: hash }
        });

        let results;

        if (existing) {
            console.log(`[Worker] Duplicate detected for job ${job.id}`);
            // Clone previous results, flag as duplicate, maybe update verdict
            // User requested: IF blurry, low confidence, duplicate THEN SUSPICIOUS
            let newVerdict = existing.overallVerdict;
            const isBlurry = existing.blurScore > 40;
            const isLowConfidence = existing.ocrConfidence < 0.6;
            
            if (isBlurry && isLowConfidence) {
                newVerdict = 'SUSPICIOUS';
            }

            results = {
                blurScore: existing.blurScore,
                brightnessValue: existing.brightnessValue,
                brightnessCategory: existing.brightnessCategory,
                ocrText: existing.ocrText,
                ocrConfidence: existing.ocrConfidence,
                isDuplicate: true,
                patternValid: existing.patternValid,
                overallVerdict: newVerdict,
                detectedCategory: existing.detectedCategory
            };
        } else {
            console.log(`[Worker] Running full analysis for job ${job.id}`);
            results = await imageAnalysis.processImage(filePath);
        }
        
        // Save results
        await prisma.analysisResult.create({
            data: {
                uploadId: uploadId,
                blurScore: results.blurScore,
                brightnessValue: results.brightnessValue,
                brightnessCategory: results.brightnessCategory,
                ocrText: results.ocrText,
                ocrConfidence: results.ocrConfidence,
                isDuplicate: results.isDuplicate,
                patternValid: results.patternValid,
                overallVerdict: results.overallVerdict,
                systemConfidence: results.systemConfidence,
                blurDescription: results.blurDescription,
                brightnessDescription: results.brightnessDescription,
                detectedCategory: results.detectedCategory,
                imageHash: hash
            }
        });

        await prisma.upload.update({
            where: { id: uploadId },
            data: { status: 'COMPLETED' }
        });

        return results;

    } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        
        await prisma.upload.update({
            where: { id: uploadId },
            data: { status: 'FAILED' }
        });

        await prisma.failureReason.create({
            data: {
                uploadId: uploadId,
                message: error.message,
                step: 'image-processing'
            }
        });

        throw error;
    }
}, { connection: createRedisConnection(), concurrency: 5 });

worker.on('completed', job => {
    console.log(`[Worker] Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`[Worker] Job ${job.id} has failed with ${err.message}`);
});

module.exports = worker;
