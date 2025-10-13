const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  // Basic Info
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    index: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  // Contact
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: true,
    match: [/^(\+44|0)[0-9]{10}$/, 'Please provide a valid UK phone number']
  },
  
  // Branding
  branding: {
    logo: String,
    primaryColor: {
      type: String,
      default: '#1E40AF'
    },
    accentColor: String,
    assistantName: {
      type: String,
      default: 'Royalty'
    }
  },
  
  // Communication Channels
  channels: {
    phone: {
      number: String,
      twilioSid: String,
      enabled: {
        type: Boolean,
        default: true
      }
    },
    whatsapp: {
      number: String,
      enabled: {
        type: Boolean,
        default: true
      }
    },
    webChat: {
      enabled: {
        type: Boolean,
        default: true
      },
      domains: [String] // Allowed domains for CORS
    }
  },
  
  // Operating Hours (for intelligent routing)
  operatingHours: {
    timezone: {
      type: String,
      default: 'Europe/London'
    },
    schedule: {
      monday: { open: String, close: String, closed: Boolean },
      tuesday: { open: String, close: String, closed: Boolean },
      wednesday: { open: String, close: String, closed: Boolean },
      thursday: { open: String, close: String, closed: Boolean },
      friday: { open: String, close: String, closed: Boolean },
      saturday: { open: String, close: String, closed: Boolean },
      sunday: { open: String, close: String, closed: Boolean }
    }
  },
  
  // Integrations
  integrations: {
    crm: {
      type: {
        type: String,
        enum: ['reapit', 'alto', 'jupix', 'expert_agent', 'none']
      },
      credentials: mongoose.Schema.Types.Mixed, // Encrypted
      enabled: Boolean
    },
    calendar: {
      type: {
        type: String,
        enum: ['google', 'outlook', 'none']
      },
      calendarId: String,
      credentials: mongoose.Schema.Types.Mixed, // Encrypted
      enabled: Boolean
    },
    propertyFeed: {
      url: String,
      type: {
        type: String,
        enum: ['xml', 'json', 'api']
      },
      updateFrequency: {
        type: Number,
        default: 30 // minutes
      },
      lastSync: Date
    }
  },
  
  // Subscription & Billing
  subscription: {
    tier: {
      type: String,
      enum: ['essential', 'professional', 'enterprise'],
      default: 'professional'
    },
    status: {
      type: String,
      enum: ['trial', 'active', 'paused', 'cancelled'],
      default: 'trial'
    },
    monthlyPrice: Number,
    conversationLimit: Number,
    conversationsUsed: {
      type: Number,
      default: 0
    },
    billingCycle: {
      startDate: Date,
      endDate: Date
    }
  },
  
  // API Keys (for webhooks from Voiceflow)
  apiKey: {
    type: String,
    required: true,
    unique: true,
    select: false // Don't return in queries by default
  },
  
  // Notifications
  notifications: {
    newLead: {
      email: Boolean,
      sms: Boolean,
      immediateAlert: Boolean // For hot leads
    },
    booking: {
      email: Boolean,
      sms: Boolean,
      reminderBeforeHours: Number
    },
    dailyDigest: {
      enabled: Boolean,
      time: String // "09:00"
    }
  },
  
  // Settings
  settings: {
    leadScoreThreshold: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    },
    autoBookViewings: {
      type: Boolean,
      default: true
    },
    bufferTimeBetweenBookings: {
      type: Number,
      default: 30 // minutes
    },
    maxViewingsPerDay: {
      type: Number,
      default: 8
    }
  },
  
  // Status & Metadata
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  onboardedAt: Date,
  lastActiveAt: Date,
  
  // Soft Delete
  deletedAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
agentSchema.index({ slug: 1, deletedAt: 1 });
agentSchema.index({ 'channels.phone.number': 1 });
agentSchema.index({ status: 1, deletedAt: 1 });

// Virtual for full phone number
agentSchema.virtual('fullPhoneNumber').get(function() {
  return this.channels.phone.number;
});

// Pre-save: Generate API key if not exists
agentSchema.pre('save', async function(next) {
  if (!this.apiKey) {
    const crypto = require('crypto');
    this.apiKey = `rr_${crypto.randomBytes(32).toString('hex')}`;
  }
  next();
});

// Soft delete method
agentSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.status = 'inactive';
  return this.save();
};

// Query helper to exclude deleted
agentSchema.query.active = function() {
  return this.where({ deletedAt: null, status: 'active' });
};

module.exports = mongoose.model('Agent', agentSchema);