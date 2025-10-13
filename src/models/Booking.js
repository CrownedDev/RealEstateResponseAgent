const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // References
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
    index: true
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  
  // Booking Type
  type: {
    type: String,
    enum: ['viewing', 'valuation', 'meeting', 'callback'],
    required: true,
    index: true
  },
  
  // Date & Time
  scheduledDate: {
    type: Date,
    required: true,
    index: true
  },
  duration: {
    type: Number, // minutes
    default: 30
  },
  endDate: Date,
  
  // Customer Details (denormalized for quick access)
  customer: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: String
  },
  
  // Property Details (denormalized)
  property: {
    address: String,
    reference: String
  },
  
  // Assignment
  assignedNegotiator: {
    name: String,
    phone: String,
    email: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show', 'rescheduled'],
    default: 'pending',
    index: true
  },
  
  // Confirmations
  confirmations: {
    customer: {
      email: {
        sent: Boolean,
        sentAt: Date
      },
      sms: {
        sent: Boolean,
        sentAt: Date
      }
    },
    agent: {
      email: {
        sent: Boolean,
        sentAt: Date
      }
    }
  },
  
  // Reminders
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms']
    },
    scheduledFor: Date,
    sent: Boolean,
    sentAt: Date
  }],
  
  // Calendar Integration
  calendar: {
    eventId: String, // Google Calendar event ID
    synced: Boolean,
    lastSyncAt: Date
  },
  
  // Outcome (after booking)
  outcome: {
    attended: Boolean,
    feedback: String,
    nextSteps: String,
    interested: Boolean
  },
  
  // Notes
  notes: String,
  internalNotes: String,
  
  // Cancellation
  cancellation: {
    cancelledAt: Date,
    cancelledBy: {
      type: String,
      enum: ['customer', 'agent', 'system']
    },
    reason: String
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
bookingSchema.index({ agentId: 1, scheduledDate: 1, deletedAt: 1 });
bookingSchema.index({ agentId: 1, status: 1, scheduledDate: 1 });
bookingSchema.index({ leadId: 1 });
bookingSchema.index({ propertyId: 1 });

// Ensure no double bookings (same time slot)
bookingSchema.index(
  { agentId: 1, scheduledDate: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      status: { $in: ['pending', 'confirmed'] },
      deletedAt: null 
    }
  }
);

// Pre-save: Calculate end date
bookingSchema.pre('save', function(next) {
  if (this.scheduledDate && this.duration) {
    this.endDate = new Date(this.scheduledDate.getTime() + this.duration * 60000);
  }
  next();
});

// Method to check if booking conflicts with another
bookingSchema.methods.hasConflict = async function() {
  const Booking = mongoose.model('Booking');
  
  const conflicting = await Booking.findOne({
    agentId: this.agentId,
    _id: { $ne: this._id },
    status: { $in: ['pending', 'confirmed'] },
    deletedAt: null,
    $or: [
      // New booking starts during existing booking
      {
        scheduledDate: { $lte: this.scheduledDate },
        endDate: { $gt: this.scheduledDate }
      },
      // New booking ends during existing booking
      {
        scheduledDate: { $lt: this.endDate },
        endDate: { $gte: this.endDate }
      },
      // New booking encompasses existing booking
      {
        scheduledDate: { $gte: this.scheduledDate },
        endDate: { $lte: this.endDate }
      }
    ]
  });
  
  return !!conflicting;
};

module.exports = mongoose.model('Booking', bookingSchema);