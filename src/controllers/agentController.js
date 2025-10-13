const Agent = require('../models/Agent');
const { AppError } = require('../middleware/errorHandler');
const { logger } = require('../middleware/logger');

// @desc    Get agent profile
// @route   GET /api/v1/agents/me
// @access  Private (requires API key)
const getProfile = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.agentId);

    res.json({
      success: true,
      data: {
        id: agent._id,
        companyName: agent.companyName,
        slug: agent.slug,
        email: agent.email,
        phone: agent.phone,
        subscription: agent.subscription,
        status: agent.status,
        onboardedAt: agent.onboardedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update agent profile
// @route   PATCH /api/v1/agents/me
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { companyName, email, phone } = req.body;

    const agent = await Agent.findById(req.agentId);

    if (!agent) {
      return next(new AppError('Agent not found', 404));
    }

    // Update allowed fields
    if (companyName) agent.companyName = companyName;
    if (email) agent.email = email;
    if (phone) agent.phone = phone;

    await agent.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: agent,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get agent statistics
// @route   GET /api/v1/agents/stats
// @access  Private
const getStats = async (req, res, next) => {
  try {
    const Property = require('../models/Property');
    const Lead = require('../models/Lead');
    const Booking = require('../models/Booking');
    const Conversation = require('../models/Conversation');

    const [propertyCount, leadCount, bookingCount, conversationCount] =
      await Promise.all([
        Property.countDocuments({ agentId: req.agentId, deletedAt: null }),
        Lead.countDocuments({ agentId: req.agentId, deletedAt: null }),
        Booking.countDocuments({ agentId: req.agentId, deletedAt: null }),
        Conversation.countDocuments({ agentId: req.agentId, deletedAt: null }),
      ]);

    const agent = await Agent.findById(req.agentId);

    res.json({
      success: true,
      data: {
        properties: propertyCount,
        leads: leadCount,
        bookings: bookingCount,
        conversations: conversationCount,
        subscription: {
          conversationsUsed: agent.subscription.conversationsUsed,
          conversationLimit: agent.subscription.conversationLimit,
          percentageUsed: Math.round(
            (agent.subscription.conversationsUsed /
              agent.subscription.conversationLimit) *
              100
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getStats,
};
