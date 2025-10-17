// src/controllers/salesWebhookController.js
// Webhooks for YOUR sales demo bot (capturing prospects for Royal Response)

const Prospect = require('../models/Prospect'); // You'll need to create this
const { AppError } = require('../middleware/errorHandler');
const { logger } = require('../middleware/logger');

// @desc    Capture lead from sales demo chatbot
// @route   POST /api/v1/sales/capture-lead
// @access  Public (no auth needed for sales demo)
const captureSalesLead = async (req, res, next) => {
  try {
    const {
      company_name,
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
      conversation_id,
      channel,
    } = req.body;

    // Check for existing prospect
    let prospect = await Prospect.findOne({ email });

    if (prospect) {
      // Update existing prospect
      prospect.lastContactDate = new Date();
      prospect.status = 're-engaged';

      // Add note about re-engagement
      prospect.notes.push({
        note: `Re-engaged via ${channel} demo. Monthly enquiries: ${monthly_enquiries}`,
        type: 'general',
      });
    } else {
      // Create new prospect
      prospect = new Prospect({
        company_name,
        contact_name,
        email,
        phone,
        website,
        industry: industry || 'real_estate',
        business_type,
        current_crm,
        company_size: team_size,
        branch_count,
        monthly_enquiries,
        pain_points,
        requirements: {
          channels: channels_needed,
        },
        source: channel === 'webchat' ? 'website_chat' : channel,
        status: 'new_lead',
        conversation_id,
      });
    }

    // Calculate lead score
    let score = 10; // Base score

    if (monthly_enquiries > 500) score += 30;
    else if (monthly_enquiries > 200) score += 20;
    else if (monthly_enquiries > 100) score += 10;

    if (current_crm === 'reapit') score += 15; // Easier integration
    if (pain_points?.after_hours) score += 15;
    if (pain_points?.response_time) score += 10;
    if (team_size > 5) score += 10;
    if (branch_count > 1) score += 10;

    prospect.lead_score = Math.min(score, 100);

    await prospect.save();

    logger.info(`Sales lead captured: ${email} - Score: ${score}`);

    res.json({
      success: true,
      prospect_id: prospect._id,
      lead_score: prospect.lead_score,
      message: `Thanks ${contact_name.split(' ')[0]}! I've saved your information.`,
    });
  } catch (error) {
    logger.error('Sales lead capture error:', error);
    next(new AppError('Failed to capture lead', 500));
  }
};

// @desc    Calculate ROI for prospect
// @route   POST /api/v1/sales/calculate-roi
// @access  Public
const calculateROI = async (req, res, next) => {
  try {
    const { industry, monthly_enquiries, avg_transaction_value } = req.body;

    let calculations = {};

    if (industry === 'real_estate') {
      // Estate agent calculations
      const afterHoursRate = 0.4; // 40% of enquiries are after hours
      const missedLeadRate = 0.85; // 85% won't call back
      const conversionRate = 0.025; // 2.5% of leads convert
      const avgCommission = avg_transaction_value || 4500; // Average UK estate agent commission

      const afterHoursEnquiries = Math.round(
        monthly_enquiries * afterHoursRate
      );
      const missedLeads = Math.round(afterHoursEnquiries * missedLeadRate);
      const potentialConversions = missedLeads * conversionRate * 12; // Annual
      const revenueRecovered = Math.round(potentialConversions * avgCommission);
      const systemCost = 12000; // £1000/month
      const netBenefit = revenueRecovered - systemCost;
      const roiPercentage = Math.round((netBenefit / systemCost) * 100);

      calculations = {
        after_hours_enquiries: afterHoursEnquiries,
        missed_leads_monthly: missedLeads,
        potential_annual_conversions: Math.round(potentialConversions),
        revenue_recovered: revenueRecovered,
        system_cost: systemCost,
        net_benefit: netBenefit,
        roi_percentage: roiPercentage,
        payback_months:
          systemCost > 0 ? Math.round(systemCost / (revenueRecovered / 12)) : 0,
      };
    } else if (industry === 'healthcare') {
      // Healthcare calculations (different metrics)
      const afterHoursRate = 0.3; // 30% of calls are after hours
      const missedAppointmentValue = 150; // Average appointment value

      const afterHoursEnquiries = Math.round(
        monthly_enquiries * afterHoursRate
      );
      const potentialAppointments = afterHoursEnquiries * 0.7; // 70% book
      const revenueRecovered = Math.round(
        potentialAppointments * missedAppointmentValue * 12
      );
      const systemCost = 12000;

      calculations = {
        after_hours_enquiries: afterHoursEnquiries,
        potential_appointments_monthly: potentialAppointments,
        revenue_recovered: revenueRecovered,
        system_cost: systemCost,
        net_benefit: revenueRecovered - systemCost,
        roi_percentage: Math.round(
          ((revenueRecovered - systemCost) / systemCost) * 100
        ),
      };
    } else {
      // Generic calculation
      const afterHoursRate = 0.35;
      const afterHoursEnquiries = Math.round(
        monthly_enquiries * afterHoursRate
      );

      calculations = {
        after_hours_enquiries: afterHoursEnquiries,
        message: "We'll create a custom ROI calculation for your industry",
      };
    }

    res.json({
      success: true,
      industry,
      calculation: calculations,
    });
  } catch (error) {
    logger.error('ROI calculation error:', error);
    next(new AppError('Failed to calculate ROI', 500));
  }
};

// @desc    Get available meeting slots
// @route   GET /api/v1/sales/availability
// @access  Public
const getAvailableSlots = async (req, res, next) => {
  try {
    const { week = 'current', timezone = 'Europe/London' } = req.query;

    // In production, this would integrate with your calendar
    // For now, return mock availability
    const slots = [];
    const now = new Date();
    const startDate =
      week === 'next' ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : now;

    // Generate slots for next 5 business days
    for (let i = 0; i < 5; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // Morning and afternoon slots
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
      slots: slots.slice(0, 12), // Return max 12 slots
    });
  } catch (error) {
    logger.error('Get availability error:', error);
    next(new AppError('Failed to get availability', 500));
  }
};

// @desc    Book a demo meeting
// @route   POST /api/v1/sales/book-meeting
// @access  Public
const bookMeeting = async (req, res, next) => {
  try {
    const { prospect_id, date, time, type = 'video_call' } = req.body;

    const prospect = await Prospect.findById(prospect_id);
    if (!prospect) {
      return next(new AppError('Prospect not found', 404));
    }

    // Update prospect status
    prospect.status = 'demo_scheduled';
    prospect.meeting = {
      scheduled_date: new Date(`${date}T${time}:00`),
      type,
      status: 'scheduled',
    };

    // Add note
    prospect.notes.push({
      note: `Demo scheduled for ${date} at ${time}`,
      type: 'meeting',
    });

    await prospect.save();

    // In production, you would:
    // 1. Create calendar event (Google Calendar API)
    // 2. Send confirmation email
    // 3. Send calendar invite
    // 4. Set up reminder notifications

    logger.info(`Meeting booked for prospect: ${prospect.email}`);

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
// @access  Private (for your internal use)
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
        note: notes,
        type: 'general',
        created_by: 'system',
      });
    }

    // Handle status-specific logic
    if (status === 'won') {
      prospect.activated = true;
      prospect.activation_date = new Date();
      // Create new Agent record
      // Send onboarding emails
    } else if (status === 'lost') {
      prospect.lost_reason = req.body.lost_reason;
      prospect.lost_notes = req.body.lost_notes;
    }

    await prospect.save();

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
