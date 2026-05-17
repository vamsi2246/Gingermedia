const prisma = require('../config/db');

exports.checkDuplicate = async (pHash) => {
  const duplicate = await prisma.imageHash.findFirst({ where: { pHash } });
  return duplicate ? { isDuplicate: true, duplicateOf: duplicate.uploadId } : { isDuplicate: false };
};
