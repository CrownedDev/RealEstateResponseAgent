const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  // Agent Reference
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
    index: true
  },
  
  // Contact Information
  contact: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      required: true,
      match: [/^(\+44|0)[0-9]{10}$/, 'Please provide a valid UK phone number']
    },
    preferredContact: {
      type: String,
      enum: ['phone', 'email', 'whatsapp'],
      default: 'phone'
    }
  },
  
  // Property Interest
  propertyInterest: {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property'
    },
    propertyRef: String,
    propertyAddress: String,
    propertyPrice: Number
  },
  
  // Lead Intelligence
  intelligence: {
    buyerType: {
      type: String,
      enum: ['first-time-buyer', 'selling-to-move', 'investor', 'downsizer', 'relocating', 'unknown'],
      default: 'unknown'
    },
    sellingProperty: {
      type: Boolean,
      default: false
    },
    currentPropertyAddress: String,
    timeline: {
      type: String,
      enum: ['immediate', 'within-month', 'within-3-months', 'within-6-months', 'browsing'],
      default: 'browsing'
    },
    budget: {
      min: Number,
      max: Number,
      approved: Boolean // Mortgage approved
    },
    requirements: {
      bedrooms: Number,
      propertyType: String,
      location: String,
      mustHaves: [String] // parking, garden, etc.
    }
  },
  
  // Lead Score
  score: {
    value: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
      index: true
    },
    factors: {
      hasEmail: Number,
      hasPhone: Number,
      propertySpecified: Number,
      viewingBooked: Number,
      sellingProperty: Number,
      mortgageApproved: Number,
      engagementLevel: Number
    },
    lastCalculated: Date
  },
  
  // Source & Channel
  source: {
    channel: {
      type: String,
      enum: ['phone', 'webchat', 'whatsapp', 'messenger', 'manual'],
      required: true,
      index: true
    },
    campaignId: String,
    utmParams: mongoose.Schema.Types.Mixed,
    referrer: String
  },
  
  // Conversation Data
  conversation: {
    conversationId: String,
    transcript: String,
    summary: String,
    duration: Number, // seconds
    messageCount: Number,
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    }
  },
  
  // Status & Workflow
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'viewing-booked', 'viewing-completed', 'offer-made', 'converted', 'lost', 'nurture'],
    default: 'new',
    index: true
  },
  assignedTo: {
    type: String // Agent/negotiator name or ID
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  // Follow-ups
  followUp: {
    required: {
      type: Boolean,
      default: false
    },
    scheduledFor: Date,
    reason: String,
    completed: Boolean
  },
  
  // Notes & Tags
  notes: [{
    text: String,
    addedBy: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  
  // CRM Sync
  crmSync: {
    synced: {
      type: Boolean,
      default: false
    },
    crmId: String,
    lastSyncAt: Date,
    syncError: String
  },
  
  // GDPR & Compliance
  consent: {
    marketing: {
      type: Boolean,
      default: false
    },
    dataProcessing: {
      type: Boolean,
      default: true
    },
    consentGivenAt: Date,
    ipAddress: String
  },
  
  // Metrics
  metrics: {
    responseTime: Number, // How fast we responded (seconds)
    conversionTime: Number, // Time from lead to conversion (seconds)
    touchpoints: Number // Number of interactions
  },
  
  // Soft Delete
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
leadSchema.index({ agentId: 1, status: 1, deletedAt: 1 });
leadSchema.index({ agentId: 1, 'score.value': -1 });
leadSchema.index({ agentId: 1, priority: 1, createdAt: -1 });
leadSchema.index({ 'contact.email': 1 });
leadSchema.index({ 'contact.phone': 1 });
leadSchema.index({ createdAt: -1 });

// Virtual for full name
leadSchema.virtual('contact.fullName').get(function() {
  return `${this.contact.firstName} ${this.contact.lastName || ''}`.trim();
});

// Method to calculate lead score
leadSchema.methods.calculateScore = function() {
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
  
  // Specific property interest (+15)
  if (this.propertyInterest.propertyId) {
    score += 15;
    factors.propertySpecified = 15;
  }
  
  // Viewing booked (+20)
  if (this.status === 'viewing-booked' || this.status === 'viewing-completed') {
    score += 20;
    factors.viewingBooked = 20;
  }
  
  // Selling property (+15)
  if (this.intelligence.sellingProperty) {
    score += 15;
    factors.sellingProperty = 15;
  }
  
  // Mortgage approved (+10)
  if (this.intelligence.budget?.approved) {
    score += 10;
    factors.mortgageApproved = 10;
  }
  
  // Timeline urgency (up to +10)
  const timelineScores = {
    'immediate': 10,
    'within-month': 7,
    'within-3-months': 4,
    'within-6-months': 2,
    'browsing': 0
  };
  const timelineScore = timelineScores[this.intelligence.timeline] || 0;
  score += timelineScore;
  factors.timeline = timelineScore;
  
  this.score.value = Math.min(score, 100);
  this.score.factors = factors;
  this.score.lastCalculated = new Date();
  
  return this.score.value;
};

// Pre-save: Calculate score
leadSchema.pre('save', function(next) {
  if (this.isNew || this.isModified()) {
    this.calculateScore();
  }
  next();
});

module.exports = mongoose.model('Lead', leadSchema);