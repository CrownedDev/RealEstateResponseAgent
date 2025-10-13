const Lead = require('../models/Lead');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all leads for agent
// @route   GET /api/v1/leads
// @access  Private
const getLeads = async (req, res, next) => {
  try {
    const { status, priority, minScore } = req.query;

    const query = {
      agentId: req.agentId,
      deletedAt: null,
    };

    // Apply filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (minScore) query['score.value'] = { $gte: parseInt(minScore) };

    const leads = await Lead.find(query)
      .populate('propertyInterest.propertyId', 'title address price')
      .sort({ 'score.value': -1, createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single lead
// @route   GET /api/v1/leads/:id
// @access  Private
const getLead = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      agentId: req.agentId,
      deletedAt: null,
    }).populate('propertyInterest.propertyId');

    if (!lead) {
      return next(new AppError('Lead not found', 404));
    }

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create lead
// @route   POST /api/v1/leads
// @access  Private
const createLead = async (req, res, next) => {
  try {
    const leadData = {
      ...req.body,
      agentId: req.agentId,
    };

    const lead = await Lead.create(leadData);

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lead
// @route   PATCH /api/v1/leads/:id
// @access  Private
const updateLead = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      agentId: req.agentId,
      deletedAt: null,
    });

    if (!lead) {
      return next(new AppError('Lead not found', 404));
    }

    // Update fields
    Object.assign(lead, req.body);
    await lead.save();

    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add note to lead
// @route   POST /api/v1/leads/:id/notes
// @access  Private
const addNote = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      agentId: req.agentId,
      deletedAt: null,
    });

    if (!lead) {
      return next(new AppError('Lead not found', 404));
    }

    lead.notes.push({
      text: req.body.note,
      addedAt: new Date(),
    });

    await lead.save();

    res.json({
      success: true,
      message: 'Note added successfully',
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get lead statistics
// @route   GET /api/v1/leads/stats
// @access  Private
const getLeadStats = async (req, res, next) => {
  try {
    const stats = await Lead.aggregate([
      {
        $match: {
          agentId: req.agentId,
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgScore: { $avg: '$score.value' },
        },
      },
    ]);

    const totalLeads = await Lead.countDocuments({
      agentId: req.agentId,
      deletedAt: null,
    });

    res.json({
      success: true,
      data: {
        total: totalLeads,
        byStatus: stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeads,
  getLead,
  createLead,
  updateLead,
  addNote,
  getLeadStats,
};
