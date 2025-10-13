require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    database: 'connected',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Royal Response API',
    version: '1.0.0',
    status: 'running',
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();

    // Then start server
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 Royal Response API');
      console.log('📡 Server running on port', PORT);
      console.log('🏥 Health:', `http://localhost:${PORT}/health`);
      console.log('📝 Environment:', process.env.NODE_ENV);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});
