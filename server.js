require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./src/config/database');
const { logger, requestLogger } = require('./src/middleware/logger');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Royal Response API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api-docs',
  });
});

// API Documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Royal Response API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  })
);

// API Routes (we'll add these next)
app.use('/api/v1', require('./src/routes'));

// 404 handler (must be after all routes)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start server
    app.listen(PORT, () => {
      logger.info('╔════════════════════════════════════════╗');
      logger.info('║     🚀 Royal Response API 🚀          ║');
      logger.info('╚════════════════════════════════════════╝');
      logger.info('');
      logger.info(`📡 Server:      http://localhost:${PORT}`);
      logger.info(`🏥 Health:      http://localhost:${PORT}/health`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
      logger.info(`📊 Database:    Connected`);
      logger.info('');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

module.exports = app;
