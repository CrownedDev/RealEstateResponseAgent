const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // References
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
    index: true
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  
  // Conversation ID from Voiceflow/other platform
  externalId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Channel
  channel: {
    type: String,
    enum: ['phone', 'webchat', 'whatsapp', 'messenger'],
    required: true,
    index: true
  },
  
  // Customer (may not be lead yet)
  customer: {
    phone: String,
    identifier: String // Could be IP, device ID, etc.
  },
  
  // Conversation Data
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  endedAt: Date,
  duration: Number, // seconds
  
  // Messages
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system']
    },
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Transcript (full text for search)
  transcript: {
    type: String,
    text: true // Text index for search
  },
  
  // AI-generated summary
  summary: String,
  
  // Intent & Outcome
  intent: {
    primary: String, // 'property_search', 'booking', 'information'
    confidence: Number
  },
  outcome: {
    type: String,
    enum: ['lead_captured', 'booking_made', 'information_provided', 'escalated', 'abandoned'],
    index: true
  },
  
  // Metrics
  metrics: {
    messageCount: Number,
    userMessageCount: Number,
    assistantMessageCount: Number,
    avgResponseTime: Number, // milliseconds
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    }
  },
  
  // Escalation (to human)
  escalation: {
    required: Boolean,
    requestedAt: Date,
    reason: String,
    handledBy: String
  },
  
  // Quality
  quality: {
    customerSatisfaction: Number, // 1-5 if collected
    aiPerformance: Number, // Internal scoring
    issues: [String] // Any problems detected
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
conversationSchema.index({ agentId: 1, startedAt: -1 });
conversationSchema.index({ agentId: 1, outcome: 1 });
conversationSchema.index({ leadId: 1 });
conversationSchema.index({ channel: 1, startedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);