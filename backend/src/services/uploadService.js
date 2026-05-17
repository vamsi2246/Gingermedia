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
