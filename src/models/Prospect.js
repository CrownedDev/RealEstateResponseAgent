// models/Prospect.js
// Model for YOUR sales pipeline - estate agents wanting to buy your service

const mongoose = require('mongoose');

const prospectSchema = new mongoose.Schema(
  {
    // Contact Information
    contactName: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },

    // Company Information
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    industry: {
      type: String,
      enum: [
        'real_estate',
        'healthcare',
        'automotive',
        'hospitality',
        'professional_services',
        'other',
      ],
      default: 'real_estate',
    },
    industryOther: {
      type: String,
      trim: true,
    },

    // Business Details
    currentCRM: {
      type: String,
      enum: [
        'reapit',
        'alto',
        'jupix',
        'expert_agent',
        'dezrez',
        'none',
        'other',
      ],
    },
    monthlyEnquiries: {
      type: Number,
      min: 0,
    },
    numberOfBranches: {
      type: Number,
      default: 1,
      min: 1,
    },
    teamSize: {
      type: Number,
      min: 1,
    },

    // Pain Points & Needs
    painPoints: [
      {
        type: String,
        trim: true,
      },
    ],
    channelsInterestedIn: [
      {
        type: String,
        enum: ['chat', 'phone', 'whatsapp', 'sms', 'email'],
      },
    ],
    preferredContactMethod: {
      type: String,
      enum: ['email', 'phone', 'whatsapp', 'sms'],
      default: 'email',
    },

    // Sales Pipeline Status
    status: {
      type: String,
      enum: [
        'new', // Just captured
        'contacted', // Reached out
        'demo_scheduled', // Demo booked
        'demo_completed', // Demo done
        'proposal_sent', // Quote sent
        'negotiation', // Discussing terms
        'won', // Signed!
        'lost', // Didn't convert
        'nurture', // Not ready yet
      ],
      default: 'new',
    },
    lostReason: {
      type: String,
      trim: true,
    },

    // Demo & Meeting Info
    demoScheduledDate: {
      type: Date,
    },
    demoCompletedDate: {
      type: Date,
    },
    demoNotes: {
      type: String,
      trim: true,
    },

    // ROI Calculation (from Voiceflow)
    calculatedROI: {
      monthlyEnquiries: Number,
      afterHoursLost: Number,
      viewingsPerMonth: Number,
      annualSalesLost: Number,
      commissionLost: Number,
      systemCost: Number,
      netBenefit: Number,
      roiPercentage: Number,
    },

    // Lead Source & Tracking
    source: {
      type: String,
      enum: [
        'website_chat',
        'website_form',
        'phone',
        'whatsapp',
        'referral',
        'outbound',
        'event',
        'other',
      ],
      default: 'website_chat',
    },
    referredBy: {
      type: String,
      trim: true,
    },

    // Voiceflow Conversation Data
    voiceflowConversationId: {
      type: String,
    },
    conversationData: {
      messageCount: Number,
      durationSeconds: Number,
      channel: String,
      startedAt: Date,
      completedAt: Date,
    },

    // Follow-up & Notes
    lastContactDate: {
      type: Date,
      default: Date.now,
    },
    nextFollowUpDate: {
      type: Date,
    },
    notes: [
      {
        text: {
          type: String,
          required: true,
        },
        addedBy: {
          type: String,
          default: 'system',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Contract & Revenue
    contractValue: {
      type: Number,
      min: 0,
    },
    monthlyRecurring: {
      type: Number,
      min: 0,
    },
    contractStartDate: {
      type: Date,
    },

    // Assignment
    assignedTo: {
      type: String,
      trim: true,
    },

    // Priority
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // Metadata for any additional info
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for performance
prospectSchema.index({ email: 1 });
prospectSchema.index({ phone: 1 });
prospectSchema.index({ companyName: 1 });
prospectSchema.index({ status: 1 });
prospectSchema.index({ industry: 1 });
prospectSchema.index({ createdAt: -1 });
prospectSchema.index({ nextFollowUpDate: 1 });

// Compound indexes
prospectSchema.index({ status: 1, createdAt: -1 });
prospectSchema.index({ assignedTo: 1, status: 1 });

// Virtual for full name (if needed)
prospectSchema.virtual('displayName').get(function () {
  return `${this.contactName} (${this.companyName})`;
});

// Method to calculate lead score
prospectSchema.methods.calculateLeadScore = function () {
  let score = 0;

  // Monthly enquiries scoring
  if (this.monthlyEnquiries >= 200) score += 30;
  else if (this.monthlyEnquiries >= 100) score += 20;
  else if (this.monthlyEnquiries >= 50) score += 10;

  // CRM presence (shows they're established)
  if (this.currentCRM && this.currentCRM !== 'none') score += 20;

  // Team size (bigger = more budget)
  if (this.teamSize >= 10) score += 20;
  else if (this.teamSize >= 5) score += 10;

  // Multiple channels interest
  if (this.channelsInterestedIn?.length >= 3) score += 15;
  else if (this.channelsInterestedIn?.length >= 2) score += 10;

  // Demo scheduled/completed
  if (this.demoCompletedDate) score += 15;
  else if (this.demoScheduledDate) score += 10;

  return Math.min(score, 100); // Cap at 100
};

// Static method to get pipeline stats
prospectSchema.statics.getPipelineStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$contractValue' },
      },
    },
  ]);

  return stats;
};

// Pre-save hook to update lastContactDate when status changes
prospectSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.lastContactDate = new Date();
  }
  next();
});

const Prospect = mongoose.model('Prospect', prospectSchema);

module.exports = Prospect;
