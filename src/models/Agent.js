const mongoose = require('mongoose');
const crypto = require('crypto');

const agentSchema = new mongoose.Schema(
  {
    // Basic Info
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // ===== INDUSTRY CONFIGURATION (NEW) =====
    industry: {
      type: String,
      enum: [
        'real_estate', // Estate agents (primary)
        'property_management', // Property managers
        'lettings', // Letting agents
        'commercial_property', // Commercial real estate
        'healthcare', // Future: Doctors, dentists
        'hospitality', // Future: Hotels, restaurants
        'automotive', // Future: Car dealerships
        'professional_services', // Future: Law firms, accountants
        'retail', // Future: Retail stores
        'other',
      ],
      required: true,
      default: 'real_estate',
      index: true,
    },

    businessType: {
      type: String,
      // For real estate: 'estate_agent', 'lettings', 'both'
      // For healthcare: 'gp_practice', 'dental', 'specialist'
      // For hospitality: 'hotel', 'restaurant', 'bar'
      // Etc.
    },

    // ===== CRM INTEGRATION (NEW) =====
    crmIntegration: {
      provider: {
        type: String,
        enum: [
          'reapit',
          'alto',
          'jupix',
          'expert_agent',
          'vebra',
          'dezrez',
          'none',
          'other',
        ],
        default: 'none',
      },
      credentials: {
        apiUrl: String,
        clientId: String,
        clientSecret: { type: String, select: false }, // Hidden by default
        refreshToken: { type: String, select: false },
      },
      propertyFeedUrl: String,
      syncEnabled: {
        type: Boolean,
        default: false,
      },
      lastSyncAt: Date,
    },

    // ===== VOICEFLOW CONFIGURATION (NEW) =====
    voiceflowConfig: {
      projectId: String, // Voiceflow project ID for this client
      apiKey: String, // Voiceflow API key (if using API)
      environment: {
        type: String,
        enum: ['development', 'production'],
        default: 'production',
      },
      customGreeting: String, // Override default greeting
      businessHours: {
        timezone: { type: String, default: 'Europe/London' },
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String },
      },
    },

    // ===== COMMUNICATION CHANNELS (NEW) =====
    channels: {
      webchat: {
        enabled: { type: Boolean, default: true },
        widgetCode: String, // Unique embed code
        primaryColor: { type: String, default: '#6B46C1' }, // Royal purple
        position: {
          type: String,
          enum: ['bottom-right', 'bottom-left'],
          default: 'bottom-right',
        },
      },
      phone: {
        enabled: { type: Boolean, default: false },
        number: String, // Twilio phone number
        twilioSid: String,
        voiceLanguage: { type: String, default: 'en-GB' },
      },
      whatsapp: {
        enabled: { type: Boolean, default: false },
        number: String, // WhatsApp Business number
        businessId: String,
      },
      sms: {
        enabled: { type: Boolean, default: true },
        number: String, // SMS sending number
      },
    },

    // Contact
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },

    phone: {
      type: String,
      required: true,
      match: [/^(\+44|0)[0-9]{10}$/, 'Please provide a valid UK phone number'],
    },

    // API Key for authentication
    apiKey: {
      type: String,
      unique: true,
      default: () => `rr_${crypto.randomBytes(32).toString('hex')}`,
      select: false, // Don't return in queries by default
    },

    // Subscription
    subscription: {
      tier: {
        type: String,
        enum: ['essential', 'professional', 'enterprise'],
        default: 'professional',
      },
      status: {
        type: String,
        enum: ['trial', 'active', 'paused', 'cancelled'],
        default: 'trial',
      },
      monthlyPrice: Number,
      conversationsUsed: {
        type: Number,
        default: 0,
      },
      conversationLimit: Number,
      trialEndsAt: Date,
      nextBillingDate: Date,
    },

    // ===== CUSTOMIZATION (NEW) =====
    customization: {
      companyLogo: String, // URL to logo
      brandColors: {
        primary: String,
        secondary: String,
      },
      customFields: [
        {
          name: String,
          type: { type: String, enum: ['text', 'number', 'boolean', 'date'] },
          required: Boolean,
        },
      ],
    },

    // ===== SETTINGS (NEW) =====
    settings: {
      leadNotifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        slack: { type: Boolean, default: false },
      },
      autoResponse: {
        enabled: { type: Boolean, default: true },
        delaySeconds: { type: Number, default: 0 },
      },
      leadScoring: {
        enabled: { type: Boolean, default: true },
        customRules: [
          {
            field: String,
            operator: String,
            value: String,
            points: Number,
          },
        ],
      },
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },

    // Timestamps
    onboardedAt: Date,
    lastActiveAt: Date,

    // Soft delete
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug from company name before validation
agentSchema.pre('validate', function (next) {
  if (!this.slug && this.companyName) {
    this.slug = this.companyName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  }
  next();
});

// Method to soft delete
agentSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.status = 'inactive';
  return this.save();
};

// Method to reset monthly conversation count
agentSchema.methods.resetMonthlyUsage = function () {
  this.subscription.conversationsUsed = 0;
  return this.save();
};

// Method to increment conversation usage
agentSchema.methods.incrementUsage = function () {
  this.subscription.conversationsUsed += 1;
  this.lastActiveAt = new Date();
  return this.save();
};

// Virtual for checking if trial expired
agentSchema.virtual('isTrialExpired').get(function () {
  if (this.subscription.status !== 'trial') return false;
  if (!this.subscription.trialEndsAt) return false;
  return new Date() > this.subscription.trialEndsAt;
});

// Virtual for embed widget URL
agentSchema.virtual('widgetUrl').get(function () {
  return `https://royalresponseagents.com/widget/${this.slug}`;
});

module.exports = mongoose.model('Agent', agentSchema);
