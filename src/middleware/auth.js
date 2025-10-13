const Agent = require('../models/Agent');
const { AppError } = require('./errorHandler');
const { logger } = require('./logger');

// Authenticate requests using API key
const authenticate = async (req, res, next) => {
  try {
    // Get API key from header or query
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey) {
      return next(new AppError('API key required', 401));
    }

    // Find agent by API key (include the select: false field)
    const agent = await Agent.findOne({
      apiKey,
      status: 'active',
      deletedAt: null,
    }).select('+apiKey');

    if (!agent) {
      logger.warn(`Invalid API key attempted: ${apiKey.substring(0, 10)}...`);
      return next(new AppError('Invalid API key', 401));
    }

    // Check subscription status
    if (
      agent.subscription.status !== 'active' &&
      agent.subscription.status !== 'trial'
    ) {
      return next(new AppError('Subscription inactive', 403));
    }

    // Check conversation limit
    if (
      agent.subscription.conversationsUsed >=
      agent.subscription.conversationLimit
    ) {
      return next(new AppError('Monthly conversation limit reached', 429));
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
    next(new AppError('Authentication failed', 500));
  }
};

// Identify agent by phone number (for Twilio webhooks)
const identifyByPhone = async (req, res, next) => {
  try {
    const phoneNumber = req.body.From || req.body.from || req.query.from;

    if (!phoneNumber) {
      return next(new AppError('Phone number required', 400));
    }

    // Find agent by phone number
    const agent = await Agent.findOne({
      'channels.phone.number': phoneNumber,
      status: 'active',
      deletedAt: null,
    });

    if (!agent) {
      logger.warn(`No agent found for phone: ${phoneNumber}`);
      return next(new AppError('Agent not found', 404));
    }

    req.agent = agent;
    req.agentId = agent._id;

    next();
  } catch (error) {
    logger.error('Phone identification error:', error);
    next(new AppError('Identification failed', 500));
  }
};

module.exports = {
  authenticate,
  identifyByPhone,
};
