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

// Test endpoint - create an agent
app.post('/test/agent', async (req, res) => {
  try {
    const Agent = require('./src/models/Agent');

    const agent = await Agent.create({
      companyName: 'Smith & Sons Estate Agents',
      email: 'test@smithandsons.com',
      phone: '07700900123',
      subscription: {
        conversationLimit: 500,
        monthlyPrice: 1000,
      },
    });

    res.json({
      success: true,
      message: 'Agent created successfully',
      agent: {
        id: agent._id,
        companyName: agent.companyName,
        slug: agent.slug,
        email: agent.email,
        status: agent.status,
        subscription: agent.subscription,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - get all agents
app.get('/test/agents', async (req, res) => {
  try {
    const Agent = require('./src/models/Agent');
    const agents = await Agent.find({ deletedAt: null });

    res.json({
      success: true,
      count: agents.length,
      agents: agents.map((a) => ({
        id: a._id,
        companyName: a.companyName,
        slug: a.slug,
        email: a.email,
        status: a.status,
      })),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
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
