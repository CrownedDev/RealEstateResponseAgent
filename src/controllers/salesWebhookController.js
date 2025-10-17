// src/controllers/salesWebhookController.js
// FIXED VERSION - Correct field names matching Prospect model

const { AppError } = require('../middleware/errorHandler');
const { logger } = require('../middleware/logger');

// @desc    Capture lead from sales demo chatbot
// @route   POST /api/v1/sales/capture-lead
// @access  Public
const captureSalesLead = async (req, res, next) => {
  try {
    const {
      company_name, // ← Input from frontend/Voiceflow (snake_case)
      contact_name,
      email,
      phone,
      website,
      industry,
      business_type,
      current_crm,
      team_size,
      branch_count,
      monthly_enquiries,
      pain_points,
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

    // Check for existing prospect
    let prospect = await Prospect.findOne({ email: email.toLowerCase() });

    if (prospect) {
      // Update existing prospect
      prospect.lastContactDate = new Date();

      if (monthly_enquiries) prospect.monthlyEnquiries = monthly_enquiries;
      if (current_crm) prospect.currentCRM = current_crm;
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
        text: `Re-engaged via ${channel || 'website'}. Enquiries: ${monthly_enquiries || 'N/A'}/mo`,
        addedBy: 'system',
      });

      await prospect.save();
      logger.info(`♻️ Existing prospect re-engaged: ${email}`);

      return res.json({
        success: true,
        prospect_id: prospect._id,
        returning: true,
        message: `Welcome back, ${contact_name.split(' ')[0]}! We have your info.`,
      });
    }

    // ✅ FIXED: Create new prospect with CORRECT camelCase field names
    prospect = new Prospect({
      companyName: company_name, // ✅ camelCase
      contactName: contact_name, // ✅ camelCase
      email: email.toLowerCase(),
      phone: phone,
      industry: industry || 'real_estate',
      currentCRM: current_crm, // ✅ camelCase
      monthlyEnquiries: monthly_enquiries, // ✅ camelCase
      numberOfBranches: branch_count || 1, // ✅ camelCase
      teamSize: team_size, // ✅ camelCase
      painPoints: Array.isArray(pain_points)
        ? pain_points
        : pain_points
          ? [pain_points]
          : [],
      channelsInterestedIn: Array.isArray(channels_needed) // ✅ camelCase
        ? channels_needed
        : channels_needed
          ? [channels_needed]
          : [],
      preferredContactMethod: preferred_contact || 'email', // ✅ camelCase
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

    // Calculate lead score
    let score = 10;
    if (monthly_enquiries > 500) score += 30;
    else if (monthly_enquiries > 200) score += 20;
    else if (monthly_enquiries > 100) score += 10;
    if (current_crm === 'reapit') score += 15;
    if (pain_points?.includes('after_hours')) score += 15;
    if (pain_points?.includes('response_time')) score += 10;
    if (team_size > 5) score += 10;
    if (branch_count > 1) score += 10;

    prospect.notes.push({
      text: `New lead via ${channel || 'website'}. Score: ${score}/100. Enquiries: ${monthly_enquiries || 0}/mo`,
      addedBy: 'system',
    });

    await prospect.save();
    logger.info(`✅ Sales lead captured: ${email} - Score: ${score}`);

    res.status(201).json({
      success: true,
      prospect_id: prospect._id,
      lead_score: score,
      message: `Thanks ${contact_name.split(' ')[0]}! We'll contact you within 24 hours.`,
    });
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

    for (let i = 0; i < 5; i++) {
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
// @access  Private (internal)
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
