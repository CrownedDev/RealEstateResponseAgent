const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    // Agent Reference
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true,
    },

    // Contact Information
    contact: {
      firstName: {
        type: String,
        required: true,
        trim: true,
      },
      lastName: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      },
      phone: {
        type: String,
        required: true,
      },
      preferredContact: {
        type: String,
        enum: ['phone', 'email', 'whatsapp'],
        default: 'phone',
      },
    },

    // Property Interest
    propertyInterest: {
      propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
      },
      propertyRef: String,
      propertyAddress: String,
      propertyPrice: Number,
    },

    // Requirements
    requirements: {
      bedrooms: Number,
      propertyType: String,
      location: String,
      maxBudget: Number,
      mustHaves: [String],
    },

    timeline: {
      type: String,
      enum: ['immediate', 'short-term', 'medium-term', 'long-term', 'flexible'],
    },
    financials: {
      mortgageApproval: {
        type: String,
        enum: ['none', 'in-progress', 'approved'],
      },
      budget: Number,
      deposit: Number,
    },

    // Lead Score (0-100)
    score: {
      value: {
        type: Number,
        min: 0,
        max: 100,
        default: 50,
        index: true,
      },
      factors: {
        hasEmail: Number,
        hasPhone: Number,
        propertySpecified: Number,
        viewingBooked: Number,
      },
      lastCalculated: Date,
    },

    // Source & Channel
    source: {
      channel: {
        type: String,
        enum: ['phone', 'webchat', 'whatsapp', 'messenger', 'manual'],
        required: true,
        index: true,
      },
      referrer: String,
    },

    // Conversation Summary
    conversation: {
      conversationId: String,
      summary: String,
      duration: Number,
    },

    // Status
    status: {
      type: String,
      enum: [
        'new',
        'contacted',
        'qualified',
        'viewing-booked',
        'converted',
        'lost',
      ],
      default: 'new',
      index: true,
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },

    // Notes
    notes: [
      {
        text: String,
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Soft Delete
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
leadSchema.index({ agentId: 1, status: 1 });
leadSchema.index({ agentId: 1, 'score.value': -1 });
leadSchema.methods.setPriority = function () {
  // Urgent: Immediate timeline + high score = act NOW
  if (this.timeline === 'immediate' && this.score.value >= 75) {
    console.log('Setting URGENT');
    this.priority = 'urgent';
  } else if (this.score.value >= 75) {
    console.log('Setting HIGH');
    this.priority = 'high';
  } else if (this.score.value >= 50) {
    this.priority = 'medium';
  } else {
    this.priority = 'low';
  }
};
leadSchema.index({ 'contact.email': 1 });
leadSchema.index({ 'contact.phone': 1 });

// Virtual for full name
leadSchema.virtual('contact.fullName').get(function () {
  return `${this.contact.firstName} ${this.contact.lastName || ''}`.trim();
});

// Method to calculate lead score
leadSchema.methods.calculateScore = function () {
  let score = 30; // Base score
  const factors = {};

  // Email provided (+15)
  if (this.contact.email) {
    score += 15;
    factors.hasEmail = 15;
  }

  // Phone provided (+10)
  if (this.contact.phone) {
    score += 10;
    factors.hasPhone = 10;
  }

  // Specific property interest (+20)
  if (this.propertyInterest.propertyId) {
    score += 20;
    factors.propertySpecified = 20;
  }

  // Viewing booked (+25)
  if (this.status === 'viewing-booked') {
    score += 25;
    factors.viewingBooked = 25;
  }

  this.score.value = Math.min(score, 100);
  this.score.factors = factors;
  this.score.lastCalculated = new Date();

  return this.score.value;
};

// Auto-calculate score before saving
leadSchema.pre('save', function (next) {
  if (
    this.isModified('contact') ||
    this.isModified('propertyInterest') ||
    this.isModified('financials') ||
    this.isModified('timeline')
  ) {
    this.calculateScore();
    this.setPriority();
  }
  next();
});

module.exports = mongoose.model('Lead', leadSchema);
