// routes/voiceflow-webhook.routes.js
// Webhook endpoint specifically for Voiceflow sales demo agent

const express = require('express');
const router = express.Router();

// Middleware to validate Voiceflow requests
const validateVoiceflow = (req, res, next) => {
  // You can add webhook signature validation here if needed
  // For now, just check that required fields exist
  const { contact_name, email, phone } = req.body;

  if (!contact_name && !email && !phone) {
    return res.status(400).json({
      success: false,
      error: 'At least one contact field required (name, email, or phone)',
    });
  }

  next();
};

// @desc    Capture lead from Voiceflow conversation
// @route   POST /api/v1/voiceflow/capture-lead
// @access  Public (but should validate webhook signature in production)
router.post('/capture-lead', validateVoiceflow, async (req, res) => {
  try {
    const {
      // Contact info - from your Voiceflow entities
      contact_name,
      email,
      phone,
      company,
      industry,
      role,
      challenge,

      // Conversation metadata
      conversation_id,
      channel, // 'chat', 'phone', 'whatsapp'
      preferred_contact, // 'email', 'whatsapp', 'sms'

      // Additional fields you might collect
      current_crm,
      monthly_enquiries,
      pain_points,

      // Voiceflow tracking
      message_count,
      duration_seconds,
    } = req.body;

    console.log('📞 Voiceflow lead captured:', {
      contact_name,
      email,
      company,
      channel,
    });

    // Create lead using your existing Lead model
    // Note: You already have /api/v1/webhooks/lead endpoint
    // This is a simplified version specifically for Voiceflow

    const Lead = require('../models/Lead');

    const leadData = {
      // You'll need to associate with an agentId
      // For now, use a default "sales" agent or create one
      agentId: '000000000000000000000001', // Replace with your sales team agent ID

      contact: {
        firstName: contact_name?.split(' ')[0] || '',
        lastName: contact_name?.split(' ').slice(1).join(' ') || '',
        email: email || '',
        phone: phone || '',
        preferredContact: preferred_contact || 'email',
      },

      source:
        channel === 'chat'
          ? 'website_chat'
          : channel === 'phone'
            ? 'phone'
            : channel === 'whatsapp'
              ? 'whatsapp'
              : 'website',

      status: 'new',
      priority: 'medium',

      // Custom fields for your business
      metadata: {
        company: company || '',
        industry: industry || 'real_estate',
        role: role || '',
        challenge: challenge || '',
        current_crm: current_crm || '',
        monthly_enquiries: monthly_enquiries || 0,
        pain_points: pain_points || [],

        // Voiceflow tracking
        voiceflow_conversation_id: conversation_id,
        message_count: message_count || 0,
        conversation_duration: duration_seconds || 0,
      },

      notes: [
        {
          text: `Lead captured via Voiceflow ${channel || 'chat'}. Challenge: ${challenge || 'Not specified'}`,
          addedBy: 'system',
          createdAt: new Date(),
        },
      ],
    };

    const lead = await Lead.create(leadData);

    // Send notifications (email, Slack, etc.)
    // You can add notification logic here
    console.log('✅ Lead created:', lead._id);

    // Return response that Voiceflow can use
    res.status(201).json({
      success: true,
      message: `Thanks ${contact_name}! We'll be in touch within 24 hours.`,
      lead_id: lead._id,

      // Optional: Return data Voiceflow can use in conversation
      next_step: 'confirmation',
      preferred_contact: preferred_contact || 'email',
    });
  } catch (error) {
    console.error('❌ Error capturing Voiceflow lead:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to capture lead. Please try again.',
      message:
        'We had a technical issue. Can you try contacting us directly at hello@royalresponse.com?',
    });
  }
});

// @desc    Calculate ROI for prospect
// @route   POST /api/v1/voiceflow/calculate-roi
// @access  Public
router.post('/calculate-roi', (req, res) => {
  try {
    const { monthly_enquiries, avg_commission } = req.body;

    if (!monthly_enquiries) {
      return res.status(400).json({
        success: false,
        error: 'monthly_enquiries required',
      });
    }

    // Your proven calculations from docs
    const afterHoursLost = Math.round(monthly_enquiries * 0.4);
    const viewingsPerMonth = Math.round(afterHoursLost * 0.42);
    const annualSalesLost = Math.round(viewingsPerMonth * 0.3 * 12);
    const commission = avg_commission || 4500;
    const commissionLost = annualSalesLost * commission;
    const systemCost = 12000; // £12K/year from your pricing
    const netBenefit = commissionLost - systemCost;
    const roiPercentage = Math.round((netBenefit / systemCost) * 100);

    const roi = {
      monthly_enquiries,
      after_hours_lost: afterHoursLost,
      viewings_per_month: viewingsPerMonth,
      annual_sales_lost: annualSalesLost,
      avg_commission: commission,
      commission_lost: commissionLost,
      system_cost: systemCost,
      net_benefit: netBenefit,
      roi_percentage: roiPercentage,

      // Formatted strings for Voiceflow to display
      display: {
        commission_lost: `£${commissionLost.toLocaleString()}`,
        system_cost: `£${systemCost.toLocaleString()}`,
        net_benefit: `£${netBenefit.toLocaleString()}`,
        roi_text: `${roiPercentage}% ROI`,
      },
    };

    res.json({
      success: true,
      roi,
    });
  } catch (error) {
    console.error('Error calculating ROI:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate ROI',
    });
  }
});

module.exports = router;
