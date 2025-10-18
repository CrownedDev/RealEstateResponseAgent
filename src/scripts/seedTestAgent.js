// src/routes/prospects.routes.js
// PUBLIC endpoints for lead capture (no auth required)

const express = require('express');
const router = express.Router();

// ===== CAPTURE LEAD - PUBLIC ENDPOINT =====
// @route   POST /api/v1/prospects/capture
// @access  Public
router.post('/capture', async (req, res) => {
  try {
    const {
      company_name,
      contact_name,
      email,
      phone,
      current_crm,
      monthly_enquiries,
      message,
      source = 'website_form',
    } = req.body;

    // Basic validation
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Email or phone required',
      });
    }

    // Check if prospect already exists
    let prospect = await Prospect.findOne({
      $or: [{ email: email }, { phone: phone }],
    });

    if (prospect) {
      // Update existing prospect
      prospect.last_contact_date = new Date();
      if (company_name) prospect.company_name = company_name;
      if (contact_name) prospect.contact_name = contact_name;
      if (current_crm) prospect.current_crm = current_crm;
      if (monthly_enquiries) prospect.monthly_enquiries = monthly_enquiries;

      await prospect.save();

      return res.json({
        success: true,
        user_id: user._id,
        message: 'Welcome back! We have your information.',
      });
    }

    // Create new prospect
    prospect = await Prospect.create({
      company_name,
      contact_name,
      email,
      phone,
      current_crm,
      monthly_enquiries,
      source,
      status: 'new_lead',
      last_contact_date: new Date(),
    });

    console.log('✅ New prospect captured:', {
      id: user._id,
      email: prospect.email,
      company: prospect.company_name,
    });

    res.status(201).json({
      success: true,
      user_id: user._id,
      message: "Thank you! We'll be in touch soon.",
    });
  } catch (error) {
    console.error('❌ Prospect capture error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to capture lead. Please try again.',
    });
  }
});

// ===== CAPTURE LEAD (Alternative endpoint for Voiceflow) =====
// @route   POST /api/v1/prospects/capture-lead
// @access  Public
router.post('/capture-lead', async (req, res) => {
  try {
    const {
      contact_name,
      email,
      phone,
      company,
      current_crm,
      monthly_enquiries,
      conversation_id,
      channel = 'chat',
    } = req.body;

    // Basic validation
    if (!contact_name && !email && !phone) {
      return res.status(400).json({
        success: false,
        error: 'At least one contact field required',
      });
    }

    // Check if prospect exists
    let prospect = await Prospect.findOne({
      $or: [{ email: email }, { phone: phone }],
    });

    if (prospect) {
      prospect.last_contact_date = new Date();
      await prospect.save();

      return res.json({
        success: true,
        user_id: user._id,
        existing: true,
        message: `Welcome back, ${contact_name || 'there'}!`,
      });
    }

    // Create new prospect
    prospect = await Prospect.create({
      company_name: company,
      contact_name,
      email,
      phone,
      current_crm,
      monthly_enquiries,
      source:
        channel === 'chat'
          ? 'website_chat'
          : channel === 'phone'
            ? 'website_phone'
            : 'website_chat',
      status: 'new_lead',
      last_contact_date: new Date(),
    });

    console.log('✅ Voiceflow lead captured:', {
      id: user._id,
      name: contact_name,
      channel,
    });

    res.status(201).json({
      success: true,
      user_id: user._id,
      message: `Thanks ${contact_name}! We'll be in touch within 24 hours.`,
    });
  } catch (error) {
    console.error('❌ Voiceflow capture error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to capture lead',
    });
  }
});

// ===== CALCULATE ROI - PUBLIC ENDPOINT =====
// @route   POST /api/v1/prospects/calculate-roi
// @access  Public
router.post('/calculate-roi', (req, res) => {
  try {
    const { monthly_enquiries, avg_commission = 4500 } = req.body;

    if (!monthly_enquiries) {
      return res.status(400).json({
        success: false,
        error: 'monthly_enquiries required',
      });
    }

    // ROI calculations based on your proven numbers
    const afterHoursLost = Math.round(monthly_enquiries * 0.4);
    const viewingsPerMonth = Math.round(afterHoursLost * 0.42);
    const annualSalesLost = Math.round(viewingsPerMonth * 0.3 * 12);
    const commissionLost = annualSalesLost * avg_commission;
    const systemCost = 12000; // £12K/year
    const netBenefit = commissionLost - systemCost;
    const roiPercentage = Math.round((netBenefit / systemCost) * 100);

    res.json({
      success: true,
      roi: {
        monthly_enquiries,
        after_hours_lost: afterHoursLost,
        viewings_per_month: viewingsPerMonth,
        annual_sales_lost: annualSalesLost,
        avg_commission,
        commission_lost: commissionLost,
        system_cost: systemCost,
        net_benefit: netBenefit,
        roi_percentage: roiPercentage,
        display: {
          commission_lost: `£${commissionLost.toLocaleString()}`,
          system_cost: `£${systemCost.toLocaleString()}`,
          net_benefit: `£${netBenefit.toLocaleString()}`,
          roi_text: `${roiPercentage}% ROI`,
        },
      },
    });
  } catch (error) {
    console.error('❌ ROI calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate ROI',
    });
  }
});

// ===== CHECK AVAILABILITY - PUBLIC ENDPOINT =====
// @route   GET /api/v1/prospects/availability
// @access  Public
router.get('/availability', (req, res) => {
  try {
    // Mock availability data
    // In production, integrate with Google Calendar API
    const today = new Date();
    const slots = [];

    // Generate next 5 business days with slots
    for (let i = 1; i <= 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const dateStr = date.toISOString().split('T')[0];

      slots.push(
        { date: dateStr, time: '10:00', available: true },
        { date: dateStr, time: '14:00', available: true },
        { date: dateStr, time: '16:00', available: true }
      );
    }

    res.json({
      success: true,
      slots: slots.slice(0, 10), // Return first 10 slots
    });
  } catch (error) {
    console.error('❌ Availability check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability',
    });
  }
});

// ===== BOOK MEETING - PUBLIC ENDPOINT =====
// @route   POST /api/v1/prospects/book-meeting
// @access  Public
router.post('/book-meeting', async (req, res) => {
  try {
    const {
      prospect_email,
      prospect_name,
      prospect_phone,
      company_name,
      slot_date,
      slot_time,
      timezone = 'Europe/London',
    } = req.body;

    // Basic validation
    if (!prospect_email || !slot_date || !slot_time) {
      return res.status(400).json({
        success: false,
        error: 'Email, date, and time required',
      });
    }

    // Find or create prospect
    let prospect = await Prospect.findOne({ email: prospect_email });

    if (!prospect) {
      prospect = await Prospect.create({
        contact_name: prospect_name,
        email: prospect_email,
        phone: prospect_phone,
        company_name,
        source: 'demo_booking',
        status: 'demo_scheduled',
      });
    } else {
      prospect.status = 'demo_scheduled';
      prospect.last_contact_date = new Date();
      await prospect.save();
    }

    // TODO: Integrate with Google Calendar to create actual booking

    console.log('✅ Demo booked:', {
      prospect: prospect_email,
      date: slot_date,
      time: slot_time,
    });

    res.json({
      success: true,
      user_id: user._id,
      meeting_confirmed: true,
      message: "Meeting booked! You'll receive a calendar invite shortly.",
    });
  } catch (error) {
    console.error('❌ Booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to book meeting',
    });
  }
});

module.exports = router;
