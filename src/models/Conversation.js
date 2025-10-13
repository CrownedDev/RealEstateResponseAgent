const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // Agent Reference
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true,
    },

    // Lead Reference (if converted to lead)
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
    },

    // External ID from Voiceflow/other platform
    externalId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Channel
    channel: {
      type: String,
      enum: ['phone', 'webchat', 'whatsapp', 'messenger'],
      required: true,
      index: true,
    },

    // Customer Identifier (may not be a lead yet)
    customer: {
      phone: String,
      identifier: String, // Could be IP, device ID, etc.
    },

    // Timing
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    endedAt: Date,

    duration: Number, // seconds

    // Messages
    messages: [
      {
        role: {
          type: String,
          enum: ['user', 'assistant', 'system'],
        },
        content: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // AI-generated summary
    summary: String,

    // Intent & Outcome
    intent: {
      primary: String, // 'property_search', 'booking', 'information'
      confidence: Number,
    },

    outcome: {
      type: String,
      enum: [
        'lead_captured',
        'booking_made',
        'information_provided',
        'escalated',
        'abandoned',
      ],
      index: true,
    },

    // Metrics
    metrics: {
      messageCount: Number,
      userMessageCount: Number,
      assistantMessageCount: Number,
      sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative'],
      },
    },

    // Escalation (to human agent)
    escalation: {
      required: Boolean,
      requestedAt: Date,
      reason: String,
    },

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
conversationSchema.index({ agentId: 1, startedAt: -1 });
conversationSchema.index({ agentId: 1, outcome: 1 });
conversationSchema.index({ leadId: 1 });
conversationSchema.index({ channel: 1, startedAt: -1 });

// Calculate duration before saving
conversationSchema.pre('save', function (next) {
  if (this.endedAt && this.startedAt) {
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }

  // Calculate message counts
  if (this.messages && this.messages.length > 0) {
    this.metrics = this.metrics || {};
    this.metrics.messageCount = this.messages.length;
    this.metrics.userMessageCount = this.messages.filter(
      (m) => m.role === 'user'
    ).length;
    this.metrics.assistantMessageCount = this.messages.filter(
      (m) => m.role === 'assistant'
    ).length;
  }

  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
