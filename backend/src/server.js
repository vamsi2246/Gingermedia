const app = require('./app');
const { port } = require('./config/env');
const logger = require('./utils/logger');
const prisma = require('./config/db');

// Graceful Shutdown Handling
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

app.listen(port, () => {
  logger.info(`=================================`);
  logger.info(`🚀 Server running on port ${port}`);
  logger.info(`📚 API Docs: http://localhost:${port}/api-docs`);
  logger.info(`=================================`);
});
