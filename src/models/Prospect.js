// src/models/Prospect.js
// This tracks YOUR prospects (potential Royal Response customers)
// Different from Lead.js which tracks your clients' property leads

const mongoose = require('mongoose');

const prospectSchema = new mongoose.Schema(
  {
    // ===== Basic Contact Info =====
    company_name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },

    contact_name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      index: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
    },

    // ===== Industry Information =====
    industry: {
      type: String,
      enum: [
        'real_estate',
        'property_management',
        'lettings',
        'commercial_property',
        'healthcare',
        'hospitality',
        'automotive',
        'professional_services',
        'retail',
        'other',
      ],
      required: true,
      default: 'real_estate',
      index: true,
    },

    industry_other: String, // If industry === 'other'
    business_type: String, // Sub-category within industry

    // ===== Company Details =====
    company_size: Number, // Number of employees
    branch_count: Number, // Number of locations
    monthly_enquiries: Number, // Volume indicator
    annual_revenue: String, // Revenue band

    // ===== CRM Information =====
    current_crm: {
      type: String,
      enum: [
        'reapit',
        'alto',
        'jupix',
        'expert_agent',
        'vebra',
        'dezrez',
        'salesforce',
        'hubspot',
        'zoho',
        'none',
        'other',
      ],
      default: 'none',
    },

    crm_other: String, // If CRM === 'other'

    // ===== Pain Points =====
    pain_points: {
      after_hours: Boolean,
      response_time: Boolean,
      lead_management: Boolean,
      admin_time: Boolean,
      missed_calls: Boolean,
      qualification: Boolean,
      other: String,
    },

    // ===== Requirements =====
    requirements: {
      channels: [String], // ['webchat', 'phone', 'whatsapp', 'sms']
      integration_priority: String,
      budget_range: String, // '500-1000', '1000-2000', '2000+'
      timeline: String, // 'immediate', '1-month', '3-months', '6-months'
      decision_makers: Number,
    },

    // ===== Lead Scoring =====
    lead_score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 5,
    },

    // ===== Sales Pipeline Status =====
    status: {
      type: String,
      enum: [
        'new_lead', // Just captured
        're-engaged', // Returned after previous interaction
        'qualified', // Qualified as good fit
        'demo_requested', // Wants a demo
        'demo_scheduled', // Demo booked
        'demo_completed', // Demo done
        'proposal_sent', // Proposal/pricing sent
        'negotiating', // In negotiation
        'won', // Became a client!
        'lost', // Didn't convert
        'nurture', // Long-term nurture
        'unqualified', // Not a fit
      ],
      default: 'new_lead',
      index: true,
    },

    // ===== Meeting Information =====
    meeting: {
      scheduled_date: Date,
      completed_date: Date,
      type: {
        type: String,
        enum: ['video_call', 'phone_call', 'in_person'],
      },
      status: {
        type: String,
        enum: ['scheduled', 'completed', 'no_show', 'cancelled'],
      },
      notes: String,
      recording_url: String,
    },

    // ===== Lost Reason (if status === 'lost') =====
    lost_reason: {
      type: String,
      enum: [
        'price',
        'features',
        'competitor',
        'timing',
        'no_budget',
        'no_decision',
        'technical_limitations',
        'wrong_industry',
        'other',
      ],
    },
    lost_notes: String,
    competitor_chosen: String,

    // ===== Activation =====
    activated: {
      type: Boolean,
      default: false,
      index: true,
    },
    activation_date: Date,
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent', // Links to Agent when they become a client
    },

    // ===== Marketing Attribution =====
    source: {
      type: String,
      enum: [
        'website_chat',
        'website_phone',
        'website_form',
        'referral',
        'linkedin',
        'cold_outreach',
        'networking',
        'content_marketing',
        'google_ads',
        'facebook_ads',
        'partner',
        'other',
      ],
      default: 'website_chat',
    },

    referral_source: String,

    utm_params: {
      utm_source: String,
      utm_medium: String,
      utm_campaign: String,
      utm_term: String,
      utm_content: String,
    },

    landing_page: String,

    // ===== Communication History =====
    notes: [
      {
        created_at: {
          type: Date,
          default: Date.now,
        },
        created_by: String,
        note: String,
        type: {
          type: String,
          enum: ['call', 'email', 'meeting', 'general'],
        },
      },
    ],

    emails_sent: [
      {
        sent_at: Date,
        subject: String,
        template: String,
        opened: Boolean,
        clicked: Boolean,
      },
    ],

    // ===== Engagement Tracking =====
    conversation_id: String, // From Voiceflow
    demo_watched: Boolean,
    resources_downloaded: [String],
    last_contact_date: Date,
    next_follow_up_date: Date,
    follow_up_count: {
      type: Number,
      default: 0,
    },

    // ===== Tags =====
    tags: [String], // ['high-value', 'urgent', 'technical-buyer', etc.]

    // ===== Soft Delete =====
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ===== Indexes =====
prospectSchema.index({ email: 1 });
prospectSchema.index({ company_name: 'text', contact_name: 'text' });
prospectSchema.index({ status: 1, lead_score: -1 });
prospectSchema.index({ activated: 1 });
prospectSchema.index({ created_at: -1 });

// ===== Auto-calculate lead score on save =====
prospectSchema.pre('save', function (next) {
  if (
    this.isModified('monthly_enquiries') ||
    this.isModified('pain_points') ||
    this.isModified('current_crm') ||
    this.isModified('status')
  ) {
    let score = 10; // Base score

    // Volume scoring
    if (this.monthly_enquiries > 500) score += 30;
    else if (this.monthly_enquiries > 200) score += 20;
    else if (this.monthly_enquiries > 100) score += 10;

    // CRM scoring (easier integrations score higher)
    if (this.current_crm === 'reapit') score += 15;
    else if (['alto', 'jupix'].includes(this.current_crm)) score += 10;
    else if (this.current_crm === 'none') score += 5;

    // Pain point scoring
    if (this.pain_points?.after_hours) score += 15;
    if (this.pain_points?.response_time) score += 10;
    if (this.pain_points?.missed_calls) score += 10;
    if (this.pain_points?.lead_management) score += 5;

    // Company size scoring
    if (this.company_size > 10) score += 10;
    else if (this.company_size > 5) score += 5;

    // Multi-branch bonus
    if (this.branch_count > 2) score += 10;
    else if (this.branch_count > 1) score += 5;

    // Status multiplier
    if (this.status === 'demo_completed') score += 20;
    else if (this.status === 'demo_scheduled') score += 15;
    else if (this.status === 'qualified') score += 10;

    this.lead_score = Math.min(score, 100);
  }

  // Auto-calculate probability based on status
  const probabilityMap = {
    new_lead: 5,
    're-engaged': 10,
    qualified: 15,
    demo_requested: 20,
    demo_scheduled: 30,
    demo_completed: 50,
    proposal_sent: 60,
    negotiating: 75,
    won: 100,
    lost: 0,
    nurture: 10,
    unqualified: 0,
  };

  if (this.isModified('status')) {
    this.probability = probabilityMap[this.status] || 5;
  }

  next();
});

// ===== Methods =====
prospectSchema.methods.addNote = function (
  note,
  type = 'general',
  createdBy = 'system'
) {
  this.notes.push({
    note,
    type,
    created_by: createdBy,
  });
  return this.save();
};

prospectSchema.methods.scheduleFollowUp = function (days = 3) {
  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + days);
  this.next_follow_up_date = followUpDate;
  this.follow_up_count += 1;
  return this.save();
};

prospectSchema.methods.convertToClient = async function () {
  const Agent = mongoose.model('Agent');

  // Create new Agent (client) record
  const agent = new Agent({
    companyName: this.company_name,
    email: this.email,
    phone: this.phone,
    industry: this.industry,
    businessType: this.business_type,
    crmIntegration: {
      provider: this.current_crm,
    },
    subscription: {
      tier: 'professional',
      status: 'trial',
      conversationLimit: 100,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 day trial
    },
    onboardedAt: new Date(),
  });

  await agent.save();

  // Update prospect record
  this.activated = true;
  this.activation_date = new Date();
  this.client_id = agent._id;
  this.status = 'won';

  await this.save();

  return agent;
};

// ===== Virtuals =====
prospectSchema.virtual('days_in_pipeline').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

prospectSchema.virtual('is_hot_lead').get(function () {
  return (
    this.lead_score >= 70 &&
    ['demo_requested', 'demo_scheduled'].includes(this.status)
  );
});

prospectSchema.virtual('needs_follow_up').get(function () {
  if (!this.next_follow_up_date) return false;
  return new Date() > this.next_follow_up_date;
});

module.exports = mongoose.model('Prospect', prospectSchema);
