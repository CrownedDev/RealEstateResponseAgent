const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    // References
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true,
    },

    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      // Not required - customer can book without being a lead first
    },

    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },

    // Booking Type
    type: {
      type: String,
      enum: ['viewing', 'valuation', 'callback'],
      required: true,
      index: true,
    },

    // Date & Time
    scheduledDate: {
      type: Date,
      required: true,
      index: true,
    },

    duration: {
      type: Number, // minutes
      default: 30,
    },

    endDate: Date,

    // Customer Details (denormalized for quick access)
    customer: {
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      email: String,
    },

    // Property Details (denormalized)
    property: {
      address: String,
      reference: String,
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
      default: 'pending',
      index: true,
    },

    // Confirmations Sent
    confirmations: {
      customerEmail: {
        sent: Boolean,
        sentAt: Date,
      },
      customerSMS: {
        sent: Boolean,
        sentAt: Date,
      },
    },

    // Notes
    notes: String,

    // Cancellation
    cancellation: {
      cancelledAt: Date,
      cancelledBy: {
        type: String,
        enum: ['customer', 'agent', 'system'],
      },
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
bookingSchema.index({ agentId: 1, scheduledDate: 1 });
bookingSchema.index({ agentId: 1, status: 1, scheduledDate: 1 });
bookingSchema.index({ leadId: 1 });
bookingSchema.index({ propertyId: 1 });

// Calculate end date before saving
bookingSchema.pre('save', function (next) {
  if (this.scheduledDate && this.duration) {
    this.endDate = new Date(
      this.scheduledDate.getTime() + this.duration * 60000
    );
  }
  next();
});

// Method to check if time slot is available
bookingSchema.methods.hasConflict = async function () {
  const Booking = mongoose.model('Booking');

  const conflicting = await Booking.findOne({
    agentId: this.agentId,
    _id: { $ne: this._id },
    status: { $in: ['pending', 'confirmed'] },
    deletedAt: null,
    $or: [
      {
        scheduledDate: { $lte: this.scheduledDate },
        endDate: { $gt: this.scheduledDate },
      },
      {
        scheduledDate: { $lt: this.endDate },
        endDate: { $gte: this.endDate },
      },
    ],
  });

  return !!conflicting;
};

module.exports = mongoose.model('Booking', bookingSchema);
