const { Worker } = require('bullmq');
const connection = require('../config/redis');
const prisma = require('../config/db');
const imageAnalysis = require('../services/imageAnalysis');

const worker = new Worker('image-processing', async job => {
    const { uploadId, filePath } = job.data;
    
    try {
        await prisma.upload.update({
            where: { id: uploadId },
            data: { status: 'PROCESSING' }
        });
        
        // Run analysis
        const results = await imageAnalysis.processImage(filePath);
        
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
                overallVerdict: results.overallVerdict
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

        throw error;
    }
}, { connection, concurrency: 5 });

worker.on('completed', job => {
    console.log(`[Worker] Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`[Worker] Job ${job.id} has failed with ${err.message}`);
});

module.exports = worker;
