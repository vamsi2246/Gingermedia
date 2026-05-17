const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const errorMiddleware = require('./middleware/errorMiddleware');
const uploadRoutes = require('./routes/uploadRoutes');
const resultRoutes = require('./routes/resultRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./docs/swagger');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');

const app = express();

// Security & Utility Middleware
app.use(helmet({
  contentSecurityPolicy: false, // For easier dev testing
}));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(apiLimiter);

// Serve Static Frontend (Separated Structure)
// Root points to frontend/src where index.html lives
app.use(express.static(path.join(__dirname, '../../frontend/src')));
// Fallback for any other public assets
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// Serve Uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/result', resultRoutes);

// Health Check
app.get('/health', async (req, res) => {
  const prisma = require('./config/db');
  const redis = require('./config/redis');
  
  let dbStatus = 'online';
  let redisStatus = 'online';
  
  try { await prisma.$queryRaw`SELECT 1`; } catch (e) { dbStatus = 'offline'; }
  try { await redis.ping(); } catch (e) { redisStatus = 'offline'; }
  
  res.json({ 
    status: dbStatus === 'online' && redisStatus === 'online' ? 'ok' : 'degraded',
    systems: { db: dbStatus, redis: redisStatus, worker: 'online' },
    timestamp: new Date()
  });
});

// Global Error Handler
app.use(errorMiddleware);

module.exports = app;
