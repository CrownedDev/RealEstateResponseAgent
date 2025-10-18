// src/controllers/salesWebhookController.js
const Prospect = require('../models/Prospect');
const { AppError } = require('../middleware/errorHandler');
const { logger } = require('../middleware/logger');

// @desc    Look up prospect by Voiceflow ID
// @route   GET /api/v1/sales/voiceflow/:prospectId
// @access  Public
const lookupProspectByVoiceflowId = async (req, res, next) => {
  try {
    const { prospectId } = req.params;

    logger.info(`🔍 Voiceflow lookup: ${prospectId}`);

    const prospect = await Prospect.findOne({
      voiceflowProspectId: prospectId,
    }).select(
      'contactName companyName email phone currentCRM monthlyEnquiries status totalInteractions'
    );

    if (!prospect) {
      return res.json({
        success: true,
        found: false,
        message: 'New user',
      });
    }

    // Update interaction tracking
    prospect.lastInteractionDate = new Date();
    prospect.totalInteractions = (prospect.totalInteractions || 0) + 1;
    await prospect.save();

    logger.info(
      `✅ Found prospect: ${prospect.contactName} (${prospect.email})`
    );

    res.json({
      success: true,
      found: true,
      prospect: {
        id: prospect._id,
        contactName: prospect.contactName,
        companyName: prospect.companyName,
        email: prospect.email,
        phone: prospect.phone,
        currentCRM: prospect.currentCRM,
        monthlyEnquiries: prospect.monthlyEnquiries,
        status: prospect.status,
        totalInteractions: prospect.totalInteractions,
      },
      message: `Welcome back, ${prospect.contactName}!`,
    });
  } catch (error) {
    logger.error('❌ Voiceflow lookup error:', error);
    next(new AppError('Lookup failed', 500));
  }
};

// @desc    Capture lead from sales demo chatbot
// @route   POST /api/v1/sales/capture-lead
// @access  Public
const captureSalesLead = async (req, res, next) => {
  // ← CHANGED: Added 'next'
  try {
    // ← REMOVED: Line 2 with destructuring
    // Support BOTH Voiceflow (snake_case) AND frontend form (alternative names)
    const company_name = req.body.company_name || req.body.company;
    const contact_name = req.body.contact_name || req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;
    const current_crm = req.body.current_crm || req.body.crm;
    const monthly_enquiries = req.body.monthly_enquiries;
    const challenges = req.body.challenges;
    const voiceflow_prospect_id = req.body.voiceflow_prospect_id;

    const {
      industry,
      channels_needed,
      preferred_contact,
      conversation_id,
      channel,
      message_count,
      duration_seconds,
    } = req.body;

    // Validate required fields
    if (!contact_name || !email || !phone) {
      return next(
        new AppError('Contact name, email, and phone are required', 400)
      );
    }

    logger.info(`📥 Lead capture request: ${email} from ${channel || 'form'}`);

    // Check for existing prospect
    let prospect = await Prospect.findOne({
      $or: [
        { voiceflowProspectId: voiceflow_prospect_id },
        { email: email?.toLowerCase() },
        { phone: phone },
      ].filter(Boolean),
    });

    // Calculate lead score
    let score = 10;
    if (monthly_enquiries > 500) score += 30;
    else if (monthly_enquiries > 200) score += 20;
    else if (monthly_enquiries > 100) score += 10;

    const crmScores = {
      other: 10,
      alto: 20,
      jupix: 20,
      expert_agent: 18,
      street: 18,
      veco: 15,
      reapit: 15,
      dezrez: 12,
      rex: 12,
      vebra: 12,
      agent_os: 12,
      salesforce: 10,
      hubspot: 10,
      zoho: 8,
      none: 5,
    };
    score += crmScores[current_crm] || 10;

    if (prospect) {
      // Update existing
      prospect.lastContactDate = new Date();

      if (voiceflow_prospect_id && !prospect.voiceflowProspectId) {
        prospect.voiceflowProspectId = voiceflow_prospect_id;
      }
      prospect.totalInteractions = (prospect.totalInteractions || 0) + 1;
      prospect.lastInteractionDate = new Date();

      if (monthly_enquiries) prospect.monthlyEnquiries = monthly_enquiries;
      if (current_crm) prospect.currentCRM = current_crm;
      if (company_name) prospect.companyName = company_name;

      if (channels_needed) {
        prospect.channelsInterestedIn = Array.isArray(channels_needed)
          ? channels_needed
          : [channels_needed].filter(Boolean);
      }

      if (conversation_id) {
        prospect.conversationData = {
          messageCount: message_count,
          durationSeconds: duration_seconds,
          channel: channel,
          completedAt: new Date(),
        };
        prospect.voiceflowConversationId = conversation_id;
      }

      prospect.notes.push({
        text: `Re-engaged via ${channel || 'website form'}. Enquiries: ${monthly_enquiries || 'N/A'}/mo`,
        addedBy: 'system',
      });

      await prospect.save();
      logger.info(`♻️ Existing prospect updated: ${email}`);

      return res.json({
        success: true,
        prospect_id: prospect._id,
        voiceflow_prospect_id: prospect.voiceflowProspectId, // ← ADD THIS
        returning: true,
        message: `Welcome back, ${contact_name.split(' ')[0]}!`,
      });
    } else {
      // ← ADD THIS 'else {'
      // Create new prospect with CORRECT field mapping
      prospect = new Prospect({
        voiceflowProspectId: voiceflow_prospect_id, // ← ADD THIS
        contactName: contact_name,
        companyName: company_name,
        email: email.toLowerCase(),
        phone: phone,
        industry: industry || 'real_estate',
        currentCRM: current_crm,
        monthlyEnquiries: monthly_enquiries,
        totalInteractions: 1, // ← ADD THIS
        lastInteractionDate: new Date(), // ← ADD THIS
        channelsInterestedIn: Array.isArray(channels_needed)
          ? channels_needed
          : channels_needed
            ? [channels_needed]
            : [],
        preferredContactMethod: preferred_contact || 'email',
        source:
          channel === 'chat'
            ? 'website_chat'
            : channel === 'phone'
              ? 'phone'
              : channel === 'whatsapp'
                ? 'whatsapp'
                : 'website_form',
        status: 'new',
        voiceflowConversationId: conversation_id,
        conversationData: conversation_id
          ? {
              messageCount: message_count,
              durationSeconds: duration_seconds,
              channel: channel,
              startedAt: new Date(),
              completedAt: new Date(),
            }
          : undefined,
        lastContactDate: new Date(),
      });

      if (challenges) {
        prospect.notes.push({
          text: `Initial challenges: ${challenges}`,
          addedBy: 'system',
        });
      } else {
        prospect.notes.push({
          text: `New lead via ${channel || 'website form'}. Score: ${score}/100. Enquiries: ${monthly_enquiries || 'N/A'}/mo`,
          addedBy: 'system',
        });
      }

      await prospect.save();
      logger.info(`✅ Sales lead captured: ${email} - Score: ${score}`);

      res.status(201).json({
        success: true,
        prospect_id: prospect._id,
        voiceflow_prospect_id: prospect.voiceflowProspectId, // ← ADD THIS
        existing: false, // ← ADD THIS
        lead_score: score,
        message: `Thanks ${contact_name.split(' ')[0]}! We'll contact you within 24 hours.`,
      });
    } // ← ADD THIS closing brace for 'else'
  } catch (error) {
    logger.error('❌ Capture sales lead error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return next(
        new AppError(`Validation failed: ${messages.join(', ')}`, 400)
      );
    }

    next(new AppError('Failed to capture lead', 500));
  }
};

// @desc    Calculate ROI
// @route   POST /api/v1/sales/calculate-roi
// @access  Public
const calculateROI = async (req, res, next) => {
  try {
    const { industry = 'real_estate', monthly_enquiries } = req.body;

    if (!monthly_enquiries || monthly_enquiries < 1) {
      return next(new AppError('Monthly enquiries required', 400));
    }

    const calculations = {
      real_estate: {
        afterHoursPercentage: 0.4,
        conversionRate: 0.15,
        avgCommission: 6000,
        systemMonthlyCost: 800,
      },
    };

    const config = calculations[industry] || calculations.real_estate;

    const afterHoursLost = Math.round(
      monthly_enquiries * config.afterHoursPercentage
    );
    const viewingsPerMonth = Math.round(afterHoursLost * config.conversionRate);
    const annualViewings = viewingsPerMonth * 12;
    const annualSalesLost = Math.round(annualViewings * 0.1);
    const commissionLost = annualSalesLost * config.avgCommission;
    const annualSystemCost = config.systemMonthlyCost * 12;
    const netBenefit = commissionLost - annualSystemCost;
    const roiPercentage = Math.round((netBenefit / annualSystemCost) * 100);

    res.json({
      success: true,
      industry,
      monthlyEnquiries: monthly_enquiries,
      afterHoursLost,
      viewingsPerMonth,
      annualSalesLost,
      commissionLost,
      systemCost: annualSystemCost,
      netBenefit,
      roiPercentage,
      formatted: {
        commissionLost: `£${commissionLost.toLocaleString()}`,
        systemCost: `£${annualSystemCost.toLocaleString()}`,
        netBenefit: `£${netBenefit.toLocaleString()}`,
      },
    });
  } catch (error) {
    logger.error('Calculate ROI error:', error);
    next(new AppError('Failed to calculate ROI', 500));
  }
};

// @desc    Get available meeting slots
// @route   GET /api/v1/sales/availability
// @access  Public
const getAvailableSlots = async (req, res, next) => {
  try {
    const { timezone = 'Europe/London' } = req.query;

    const slots = [];
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const dateStr = date.toISOString().split('T')[0];
      slots.push(
        { date: dateStr, time: '10:00', available: true, duration_minutes: 30 },
        { date: dateStr, time: '11:00', available: true, duration_minutes: 30 },
        { date: dateStr, time: '14:00', available: true, duration_minutes: 30 },
        { date: dateStr, time: '15:00', available: true, duration_minutes: 30 }
      );
    }

    res.json({
      success: true,
      timezone,
      slots: slots.slice(0, 12),
    });
  } catch (error) {
    logger.error('Get availability error:', error);
    next(new AppError('Failed to get availability', 500));
  }
};

// @desc    Book a meeting
// @route   POST /api/v1/sales/book-meeting
// @access  Public
const bookMeeting = async (req, res, next) => {
  try {
    const { prospect_id, date, time, type = 'video_call' } = req.body;

    const prospect = await Prospect.findById(prospect_id);
    if (!prospect) {
      return next(new AppError('Prospect not found', 404));
    }

    prospect.status = 'demo_scheduled';
    prospect.demoScheduledDate = new Date(`${date}T${time}:00`);

    prospect.notes.push({
      text: `Demo scheduled for ${date} at ${time} (${type})`,
      addedBy: 'system',
    });

    await prospect.save();

    logger.info(`📅 Meeting booked: ${prospect.email} - ${date} ${time}`);

    res.json({
      success: true,
      message: 'Meeting confirmed!',
      meeting: {
        date,
        time,
        type,
        join_url:
          type === 'video_call' ? 'https://meet.google.com/xxx-yyyy-zzz' : null,
      },
    });
  } catch (error) {
    logger.error('Book meeting error:', error);
    next(new AppError('Failed to book meeting', 500));
  }
};

// @desc    Update prospect status
// @route   PATCH /api/v1/sales/prospect/:id/status
// @access  Private
const updateProspectStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const prospect = await Prospect.findById(id);
    if (!prospect) {
      return next(new AppError('Prospect not found', 404));
    }

    prospect.status = status;

    if (notes) {
      prospect.notes.push({
        text: notes,
        addedBy: 'admin',
      });
    }

    if (status === 'won') {
      prospect.contractStartDate = new Date();
    } else if (status === 'lost') {
      prospect.lostReason = req.body.lost_reason;
    }

    await prospect.save();

    logger.info(`Prospect status updated: ${id} -> ${status}`);

    res.json({
      success: true,
      prospect,
    });
  } catch (error) {
    logger.error('Update prospect status error:', error);
    next(new AppError('Failed to update status', 500));
  }
};

module.exports = {
  captureSalesLead,
  calculateROI,
  getAvailableSlots,
  bookMeeting,
  updateProspectStatus,
};
