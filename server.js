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

// Test endpoint - delete all agents (TESTING ONLY)
app.delete('/test/agents', async (req, res) => {
  try {
    const Agent = require('./src/models/Agent');
    const result = await Agent.deleteMany({});

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} agents`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - create a property
app.post('/test/property', async (req, res) => {
  try {
    const Agent = require('./src/models/Agent');
    const Property = require('./src/models/Property');

    // Get first agent
    const agent = await Agent.findOne();
    if (!agent) {
      return res.status(400).json({
        success: false,
        error: 'No agent found. Create an agent first.',
      });
    }

    const property = await Property.create({
      agentId: agent._id,
      externalRef: 'PROP001',
      title: 'Beautiful 3-Bed Victorian House',
      description:
        'Stunning period property in prime location with original features, modern kitchen, and spacious garden.',
      address: {
        line1: '123 High Street',
        city: 'London',
        postcode: 'SW1A 1AA',
      },
      type: 'house',
      bedrooms: 3,
      bathrooms: 2,
      price: {
        amount: 750000,
      },
      features: ['Garden', 'Parking', 'Period Features', 'Modern Kitchen'],
      epcRating: 'C',
      status: 'available',
    });

    res.json({
      success: true,
      message: 'Property created successfully',
      property: {
        id: property._id,
        title: property.title,
        address: property.address,
        bedrooms: property.bedrooms,
        price: property.price,
        status: property.status,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - get all properties
app.get('/test/properties', async (req, res) => {
  try {
    const Property = require('./src/models/Property');
    const properties = await Property.find({ deletedAt: null }).populate(
      'agentId',
      'companyName email'
    );

    res.json({
      success: true,
      count: properties.length,
      properties: properties.map((p) => ({
        id: p._id,
        title: p.title,
        address: `${p.address.line1}, ${p.address.city}`,
        bedrooms: p.bedrooms,
        price: `£${p.price.amount.toLocaleString()}`,
        status: p.status,
        agent: p.agentId?.companyName,
      })),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - search properties
app.get('/test/properties/search', async (req, res) => {
  try {
    const Property = require('./src/models/Property');
    const { bedrooms, maxPrice, city } = req.query;

    const query = { status: 'available', deletedAt: null };

    if (bedrooms) query.bedrooms = parseInt(bedrooms);
    if (maxPrice) query['price.amount'] = { $lte: parseInt(maxPrice) };
    if (city) query['address.city'] = new RegExp(city, 'i');

    const properties = await Property.find(query);

    res.json({
      success: true,
      count: properties.length,
      query: { bedrooms, maxPrice, city },
      properties: properties.map((p) => ({
        id: p._id,
        title: p.title,
        address: `${p.address.line1}, ${p.address.city}`,
        bedrooms: p.bedrooms,
        price: `£${p.price.amount.toLocaleString()}`,
      })),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - delete all properties
app.delete('/test/properties', async (req, res) => {
  try {
    const Property = require('./src/models/Property');
    const result = await Property.deleteMany({});

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} properties`,
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
