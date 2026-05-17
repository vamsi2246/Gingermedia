const prisma = require('../config/db');
const { imageQueue } = require('../queues/imageQueue');

exports.createUpload = async (file) => {
  const upload = await prisma.upload.create({
    data: {
      originalName: file.originalname,
      fileName: file.filename,
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      status: 'PENDING'
    }
  });

  await imageQueue.add('process-image', { uploadId: upload.id, filePath: upload.filePath });
  return upload;
};

exports.getStatus = async (id) => {
  return await prisma.upload.findUnique({ where: { id } });
};

exports.getRecentUploads = async (limit = 10) => {
  return await prisma.upload.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { analysisResult: true }
  });
};

exports.getAnalytics = async () => {
  const [total, completed, failed, results] = await Promise.all([
    prisma.upload.count(),
    prisma.upload.count({ where: { status: 'COMPLETED' } }),
    prisma.upload.count({ where: { status: 'FAILED' } }),
    prisma.analysisResult.aggregate({
      _avg: { confidenceScore: true }
    })
  ]);

  return {
    total,
    completed,
    failed,
    avgConfidence: results._avg.confidenceScore || 0
  };
};
