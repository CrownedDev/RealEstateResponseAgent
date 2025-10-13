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

// Test endpoint - create a lead
app.post('/test/lead', async (req, res) => {
  try {
    const Agent = require('./src/models/Agent');
    const Property = require('./src/models/Property');
    const Lead = require('./src/models/Lead');

    const agent = await Agent.findOne();
    const property = await Property.findOne();

    if (!agent) {
      return res.status(400).json({
        success: false,
        error: 'No agent found. Create an agent first.',
      });
    }

    const lead = await Lead.create({
      agentId: agent._id,
      contact: {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@email.com',
        phone: '07700900456',
        preferredContact: 'email',
      },
      propertyInterest: property
        ? {
            propertyId: property._id,
            propertyRef: property.externalRef,
            propertyAddress: `${property.address.line1}, ${property.address.city}`,
            propertyPrice: property.price.amount,
          }
        : undefined,
      requirements: {
        bedrooms: 3,
        maxBudget: 800000,
        location: 'London',
        mustHaves: ['Garden', 'Parking'],
      },
      source: {
        channel: 'webchat',
      },
      conversation: {
        conversationId: 'conv_123456',
        summary:
          'Customer looking for 3-bed house in London with garden and parking. Budget up to £800k.',
        duration: 180,
      },
    });

    res.json({
      success: true,
      message: 'Lead created successfully',
      lead: {
        id: lead._id,
        name: lead.contact.fullName,
        email: lead.contact.email,
        phone: lead.contact.phone,
        propertyInterest: lead.propertyInterest?.propertyAddress,
        score: lead.score.value,
        status: lead.status,
        priority: lead.priority,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - get all leads
app.get('/test/leads', async (req, res) => {
  try {
    const Lead = require('./src/models/Lead');
    const leads = await Lead.find({ deletedAt: null })
      .populate('agentId', 'companyName')
      .populate('propertyInterest.propertyId', 'title address')
      .sort({ 'score.value': -1 });

    res.json({
      success: true,
      count: leads.length,
      leads: leads.map((l) => ({
        id: l._id,
        name: l.contact.fullName,
        email: l.contact.email,
        phone: l.contact.phone,
        score: l.score.value,
        status: l.status,
        priority: l.priority,
        channel: l.source.channel,
        agent: l.agentId?.companyName,
      })),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - delete all leads
app.delete('/test/leads', async (req, res) => {
  try {
    const Lead = require('./src/models/Lead');
    const result = await Lead.deleteMany({});

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} leads`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - create a booking
app.post('/test/booking', async (req, res) => {
  try {
    const Agent = require('./src/models/Agent');
    const Lead = require('./src/models/Lead');
    const Property = require('./src/models/Property');
    const Booking = require('./src/models/Booking');

    const agent = await Agent.findOne();
    const lead = await Lead.findOne();
    const property = await Property.findOne();

    if (!agent || !lead || !property) {
      return res.status(400).json({
        success: false,
        error: 'Missing required data. Create agent, lead, and property first.',
      });
    }

    // Book for tomorrow at 2pm
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const booking = await Booking.create({
      agentId: agent._id,
      leadId: lead._id,
      propertyId: property._id,
      type: 'viewing',
      scheduledDate: tomorrow,
      duration: 30,
      customer: {
        name: lead.contact.firstName + ' ' + (lead.contact.lastName || ''),
        phone: lead.contact.phone,
        email: lead.contact.email,
      },
      property: {
        address: `${property.address.line1}, ${property.address.city}`,
        reference: property.externalRef,
      },
      status: 'confirmed',
    });

    res.json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        id: booking._id,
        type: booking.type,
        scheduledDate: booking.scheduledDate,
        duration: booking.duration,
        endDate: booking.endDate,
        customer: booking.customer,
        property: booking.property,
        status: booking.status,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - get all bookings
app.get('/test/bookings', async (req, res) => {
  try {
    const Booking = require('./src/models/Booking');
    const bookings = await Booking.find({ deletedAt: null })
      .populate('agentId', 'companyName')
      .populate('leadId', 'contact')
      .populate('propertyId', 'title address')
      .sort({ scheduledDate: 1 });

    res.json({
      success: true,
      count: bookings.length,
      bookings: bookings.map((b) => ({
        id: b._id,
        type: b.type,
        scheduledDate: b.scheduledDate,
        duration: `${b.duration} mins`,
        customer: b.customer.name,
        property: b.property.address,
        status: b.status,
        agent: b.agentId?.companyName,
      })),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - check availability
app.get('/test/bookings/availability', async (req, res) => {
  try {
    const Agent = require('./src/models/Agent');
    const Booking = require('./src/models/Booking');

    const agent = await Agent.findOne();
    if (!agent) {
      return res.status(400).json({
        success: false,
        error: 'No agent found',
      });
    }

    // Get bookings for next 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const bookings = await Booking.find({
      agentId: agent._id,
      scheduledDate: { $gte: today, $lt: nextWeek },
      status: { $in: ['pending', 'confirmed'] },
      deletedAt: null,
    }).sort({ scheduledDate: 1 });

    res.json({
      success: true,
      period: {
        from: today,
        to: nextWeek,
      },
      bookedSlots: bookings.map((b) => ({
        date: b.scheduledDate,
        duration: b.duration,
        customer: b.customer.name,
        property: b.property.address,
      })),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - delete all bookings
app.delete('/test/bookings', async (req, res) => {
  try {
    const Booking = require('./src/models/Booking');
    const result = await Booking.deleteMany({});

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} bookings`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - create a conversation
app.post('/test/conversation', async (req, res) => {
  try {
    const Agent = require('./src/models/Agent');
    const Lead = require('./src/models/Lead');
    const Conversation = require('./src/models/Conversation');

    const agent = await Agent.findOne();
    const lead = await Lead.findOne();

    if (!agent) {
      return res.status(400).json({
        success: false,
        error: 'No agent found',
      });
    }

    const now = new Date();
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);

    const conversation = await Conversation.create({
      agentId: agent._id,
      leadId: lead?._id,
      externalId: 'vf_conv_' + Date.now(),
      channel: 'webchat',
      customer: {
        phone: '07700900456',
        identifier: '192.168.1.100',
      },
      startedAt: threeMinutesAgo,
      endedAt: now,
      messages: [
        {
          role: 'assistant',
          content: 'Hello! How can I help you today?',
          timestamp: threeMinutesAgo,
        },
        {
          role: 'user',
          content: "I'm looking for a 3 bedroom house in London",
          timestamp: new Date(threeMinutesAgo.getTime() + 10000),
        },
        {
          role: 'assistant',
          content: "Great! What's your budget?",
          timestamp: new Date(threeMinutesAgo.getTime() + 15000),
        },
        {
          role: 'user',
          content: 'Around £750,000',
          timestamp: new Date(threeMinutesAgo.getTime() + 25000),
        },
        {
          role: 'assistant',
          content:
            'Perfect! I found a beautiful 3-bed Victorian house at 123 High Street for £750,000. Would you like to book a viewing?',
          timestamp: new Date(threeMinutesAgo.getTime() + 30000),
        },
        {
          role: 'user',
          content: 'Yes please!',
          timestamp: new Date(threeMinutesAgo.getTime() + 40000),
        },
      ],
      summary:
        'Customer looking for 3-bed house in London with £750k budget. Interested in property at 123 High Street. Booking requested.',
      intent: {
        primary: 'property_search',
        confidence: 0.95,
      },
      outcome: 'booking_made',
      metrics: {
        sentiment: 'positive',
      },
    });

    res.json({
      success: true,
      message: 'Conversation created successfully',
      conversation: {
        id: conversation._id,
        channel: conversation.channel,
        duration: conversation.duration + ' seconds',
        messageCount: conversation.metrics.messageCount,
        userMessages: conversation.metrics.userMessageCount,
        assistantMessages: conversation.metrics.assistantMessageCount,
        outcome: conversation.outcome,
        summary: conversation.summary,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - get all conversations
app.get('/test/conversations', async (req, res) => {
  try {
    const Conversation = require('./src/models/Conversation');
    const conversations = await Conversation.find({ deletedAt: null })
      .populate('agentId', 'companyName')
      .populate('leadId', 'contact')
      .sort({ startedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      count: conversations.length,
      conversations: conversations.map((c) => ({
        id: c._id,
        channel: c.channel,
        startedAt: c.startedAt,
        duration: c.duration ? c.duration + 's' : 'ongoing',
        messages: c.metrics?.messageCount || 0,
        outcome: c.outcome,
        sentiment: c.metrics?.sentiment,
        agent: c.agentId?.companyName,
      })),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - get conversation details
app.get('/test/conversation/:id', async (req, res) => {
  try {
    const Conversation = require('./src/models/Conversation');
    const conversation = await Conversation.findById(req.params.id)
      .populate('agentId', 'companyName email')
      .populate('leadId', 'contact');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    res.json({
      success: true,
      conversation: {
        id: conversation._id,
        channel: conversation.channel,
        startedAt: conversation.startedAt,
        endedAt: conversation.endedAt,
        duration: conversation.duration + ' seconds',
        summary: conversation.summary,
        outcome: conversation.outcome,
        messages: conversation.messages,
        agent: conversation.agentId,
        lead: conversation.leadId,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint - delete all conversations
app.delete('/test/conversations', async (req, res) => {
  try {
    const Conversation = require('./src/models/Conversation');
    const result = await Conversation.deleteMany({});

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} conversations`,
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
