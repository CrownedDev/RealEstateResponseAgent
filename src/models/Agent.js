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

module.exports = mongoose.model('Agent', agentSchema);
