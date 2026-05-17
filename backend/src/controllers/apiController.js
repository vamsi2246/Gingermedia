const prisma = require('../config/db');
const { imageQueue } = require('../queues/imageQueue');
const fs = require('fs');
const path = require('path');
const redisConnection = require('../config/redis');

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'No image uploaded' });
        }

        const upload = await prisma.upload.create({
            data: {
                originalName: req.file.originalname,
                filename: req.file.filename,
                mimeType: req.file.mimetype,
                size: req.file.size,
                status: 'QUEUED'
            }
        });

        // Add to BullMQ
        await imageQueue.add('process-image', {
            uploadId: upload.id,
            filePath: req.file.path
        });

        res.status(202).json({
            status: 'success',
            data: { id: upload.id, status: 'QUEUED' }
        });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.getStatus = async (req, res) => {
    try {
        const upload = await prisma.upload.findUnique({
            where: { id: req.params.id }
        });
        if (!upload) {
            return res.status(404).json({ status: 'error', message: 'Upload not found' });
        }
        res.json({ status: 'success', data: { status: upload.status } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.getResult = async (req, res) => {
    try {
        const upload = await prisma.upload.findUnique({
            where: { id: req.params.id },
            include: { analysisResult: true }
        });
        if (!upload) {
            return res.status(404).json({ status: 'error', message: 'Upload not found' });
        }
        if (!upload.analysisResult) {
            return res.status(404).json({ status: 'error', message: 'Analysis not found or still processing' });
        }
        res.json({ 
            status: 'success', 
            data: {
                ...upload.analysisResult,
                uploadInfo: {
                    id: upload.id,
                    filename: upload.filename,
                    originalName: upload.originalName,
                    createdAt: upload.createdAt
                }
            } 
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.getHealth = async (req, res) => {
    try {
        // Try redis ping
        let redisStatus = 'offline';
        try {
            if (redisConnection.status === 'ready') {
                redisStatus = 'online';
            }
        } catch(e) {}
        
        let dbStatus = 'offline';
        try {
            await prisma.$queryRaw`SELECT 1`;
            dbStatus = 'online';
        } catch(e) {}
        
        const queueSize = await imageQueue.getWaitingCount();
        const activeJobs = await imageQueue.getActiveCount();

        res.json({
            systems: {
                worker: redisStatus, // assuming worker is online if redis is online
                db: dbStatus,
                redis: redisStatus
            },
            metrics: {
                queueSize,
                activeJobs
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error' });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const total = await prisma.upload.count();
        const completed = await prisma.upload.count({ where: { status: 'COMPLETED' } });
        const failed = await prisma.upload.count({ where: { status: 'FAILED' } });
        
        const avgAgg = await prisma.analysisResult.aggregate({
            _avg: { ocrConfidence: true }
        });

        res.json({
            status: 'success',
            data: {
                total,
                completed,
                failed,
                avgConfidence: avgAgg._avg.ocrConfidence || 0
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error' });
    }
};

exports.getRecent = async (req, res) => {
    try {
        const recent = await prisma.upload.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { analysisResult: true }
        });
        
        res.json({
            status: 'success',
            data: recent.map(r => ({
                id: r.id,
                originalName: r.originalName,
                filePath: `/uploads/${r.filename}`,
                status: r.status,
                createdAt: r.createdAt,
                analysisResult: r.analysisResult
            }))
        });
    } catch (error) {
        res.status(500).json({ status: 'error' });
    }
};

exports.deleteResult = async (req, res) => {
    try {
        const { id } = req.params;
        const upload = await prisma.upload.findUnique({ where: { id } });
        
        if (!upload) {
            return res.status(404).json({ status: 'error', message: 'Not found' });
        }

        // Delete from DB (cascades to AnalysisResult)
        await prisma.upload.delete({ where: { id } });
        
        // Delete physical file
        if (upload.filename) {
            const filePath = path.join(process.cwd(), 'uploads', upload.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.json({ status: 'success', message: 'Record deleted' });
    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
