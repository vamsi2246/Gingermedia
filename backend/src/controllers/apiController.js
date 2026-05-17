const prisma = require('../config/db');
const { imageQueue } = require('../queues/imageQueue');
const fs = require('fs');
const path = require('path');
const { healthConnection } = require('../config/redis');

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

exports.uploadUrl = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ status: 'error', message: 'No URL provided' });
        }

        let response;
        try {
            response = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
        } catch (fetchError) {
            const failedUpload = await prisma.upload.create({
                data: {
                    originalName: url.substring(url.lastIndexOf('/') + 1) || 'remote-fetch-failed',
                    filename: 'fetch-timeout',
                    mimeType: 'unknown',
                    size: 0,
                    status: 'FAILED',
                    failureReason: {
                        create: { message: `REMOTE_FETCH_TIMEOUT: Failed to fetch image - ${fetchError.message}`, step: 'url-ingestion' }
                    }
                }
            });
            return res.status(202).json({ status: 'success', data: { id: failedUpload.id, status: 'FAILED' } });
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
            return res.status(400).json({ status: 'error', message: 'URL does not point to a valid image' });
        }

        const extension = contentType.split('/')[1] || 'jpg';
        const filename = `${Date.now()}-url-upload.${extension}`;
        const filePath = path.join(process.cwd(), 'uploads', filename);

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        fs.writeFileSync(filePath, buffer);

        const upload = await prisma.upload.create({
            data: {
                originalName: url.substring(url.lastIndexOf('/') + 1) || filename,
                filename: filename,
                mimeType: contentType,
                size: buffer.length,
                status: 'QUEUED'
            }
        });

        // Add to BullMQ
        await imageQueue.add('process-image', {
            uploadId: upload.id,
            filePath: filePath
        });

        res.status(202).json({
            status: 'success',
            data: { id: upload.id, status: 'QUEUED' }
        });
    } catch (error) {
        console.error('URL Upload Error:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
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
    // Redis check — use explicit ping instead of checking .status
    let redisStatus = 'offline';
    try {
        const pong = await healthConnection.ping();
        if (pong === 'PONG') redisStatus = 'online';
    } catch(e) {
        console.error('Health Redis ping failed:', e.message);
    }

    // DB check
    let dbStatus = 'offline';
    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'online';
    } catch(e) {
        console.error('Health DB check failed:', e.message);
    }

    // Queue metrics — safe fallback if Redis is unstable
    let queueSize = 0;
    let activeJobs = 0;
    let workerStatus = redisStatus; // worker depends on redis
    try {
        queueSize = await imageQueue.getWaitingCount();
        activeJobs = await imageQueue.getActiveCount();
    } catch(e) {
        console.error('Health queue metrics failed:', e.message);
        workerStatus = 'offline';
    }

    res.json({
        systems: {
            worker: workerStatus,
            db: dbStatus,
            redis: redisStatus
        },
        metrics: {
            queueSize,
            activeJobs
        }
    });
};

exports.getAnalytics = async (req, res) => {
    try {
        const total = await prisma.upload.count();
        const completed = await prisma.upload.count({ where: { status: 'COMPLETED' } });
        const failed = await prisma.upload.count({ where: { status: 'FAILED' } });
        
        const avgAgg = await prisma.analysisResult.aggregate({
            _avg: { systemConfidence: true }
        });

        res.json({
            status: 'success',
            data: {
                total,
                completed,
                failed,
                avgConfidence: avgAgg._avg.systemConfidence || 0
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
            include: { analysisResult: true, failureReason: true }
        });
        
        res.json({
            status: 'success',
            data: recent.map(r => ({
                id: r.id,
                originalName: r.originalName,
                filePath: `/uploads/${r.filename}`,
                status: r.status,
                createdAt: r.createdAt,
                analysisResult: r.analysisResult,
                failureReason: r.failureReason
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
