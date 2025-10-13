const Agent = require('../models/Agent');
const logger = require('./logger');

// Authenticate API requests using API key
const authenticate = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }
    
    // Find agent by API key (include the select: false field)
    const agent = await Agent.findOne({ 
      apiKey,
      status: 'active',
      deletedAt: null 
    }).select('+apiKey');
    
    if (!agent) {
      logger.warn(`Invalid API key attempted: ${apiKey.substring(0, 10)}...`);
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    
    // Check subscription status
    if (agent.subscription.status !== 'active' && agent.subscription.status !== 'trial') {
      return res.status(403).json({
        success: false,
        error: 'Subscription inactive'
      });
    }
    
    // Check conversation limit
    if (agent.subscription.conversationsUsed >= agent.subscription.conversationLimit) {
      return res.status(429).json({
        success: false,
        error: 'Monthly conversation limit reached'
      });
    }
    
    // Attach agent to request
    req.agent = agent;
    req.agentId = agent._id;
    
    // Update last active
    agent.lastActiveAt = new Date();
    await agent.save();
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Identify agent by phone number (for incoming calls/messages)
const identifyByPhone = async (req, res, next) => {
  try {
    const phoneNumber = req.body.From || req.body.from || req.query.from;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number required'
      });
    }
    
    // Find agent by phone number
    const agent = await Agent.findOne({
      $or: [
        { 'channels.phone.number': phoneNumber },
        { 'channels.whatsapp.number': phoneNumber }
      ],
      status: 'active',
      deletedAt: null
    });
    
    if (!agent) {
      logger.warn(`No agent found for phone: ${phoneNumber}`);
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    req.agent = agent;
    req.agentId = agent._id;
    
    next();
  } catch (error) {
    logger.error('Phone identification error:', error);
    res.status(500).json({
      success: false,
      error: 'Identification failed'
    });
  }
};

module.exports = {
  authenticate,
  identifyByPhone
};