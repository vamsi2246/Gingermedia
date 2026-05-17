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

/**
 * Production-grade health endpoint.
 * Each service check is fully isolated — one failure does not cascade.
 * Returns a flat, standardized response for easy frontend consumption.
 */
exports.getHealth = async (req, res) => {
    // --- Redis: real PING round-trip ---
    let redisStatus = 'offline';
    try {
        const pong = await Promise.race([
            healthConnection.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        if (pong === 'PONG') redisStatus = 'online';
    } catch (e) {
        console.warn('[Health] Redis ping failed:', e.message);
    }

    // --- DB: real Prisma query ---
    let dbStatus = 'offline';
    try {
        await Promise.race([
            prisma.$queryRaw`SELECT 1`,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        dbStatus = 'online';
    } catch (e) {
        console.warn('[Health] DB check failed:', e.message);
    }

    // --- Worker + Queue: BullMQ queue metrics ---
    let workerStatus = 'offline';
    let queueStatus = 'degraded';
    let queueSize = 0;
    let activeJobs = 0;

    if (redisStatus === 'online') {
        try {
            const [waiting, active] = await Promise.race([
                Promise.all([imageQueue.getWaitingCount(), imageQueue.getActiveCount()]),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            queueSize = waiting;
            activeJobs = active;
            workerStatus = 'online';
            queueStatus = 'ready';
        } catch (e) {
            console.warn('[Health] Queue metrics failed:', e.message);
        }
    }

    res.json({
        api: 'online',
        db: dbStatus,
        redis: redisStatus,
        worker: workerStatus,
        queue: queueStatus,
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

        await prisma.upload.delete({ where: { id } });

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
