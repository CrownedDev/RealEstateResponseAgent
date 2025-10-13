const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    // Agent Reference
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true,
    },

    // External Reference (from CRM or manual entry)
    externalRef: {
      type: String,
      required: true,
    },

    // Basic Details
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    // Address
    address: {
      line1: {
        type: String,
        required: true,
      },
      line2: String,
      city: {
        type: String,
        required: true,
        index: true,
      },
      postcode: {
        type: String,
        required: true,
        uppercase: true,
        index: true,
      },
      country: {
        type: String,
        default: 'United Kingdom',
      },
    },

    // Property Details
    type: {
      type: String,
      required: true,
      enum: ['house', 'flat', 'bungalow', 'maisonette', 'land', 'commercial'],
      index: true,
    },

    bedrooms: {
      type: Number,
      required: true,
      min: 0,
      max: 20,
      index: true,
    },

    bathrooms: {
      type: Number,
      min: 0,
    },

    // Pricing
    price: {
      amount: {
        type: Number,
        required: true,
        min: 0,
        index: true,
      },
      currency: {
        type: String,
        default: 'GBP',
      },
    },

    // Rental Info (if applicable)
    rental: {
      isRental: {
        type: Boolean,
        default: false,
      },
      rentPeriod: {
        type: String,
        enum: ['weekly', 'monthly', 'yearly'],
      },
      availableFrom: Date,
    },

    // Status
    status: {
      type: String,
      enum: ['available', 'under-offer', 'sold', 'let', 'withdrawn'],
      default: 'available',
      index: true,
    },

    // Features
    features: [String],

    // Images
    images: [
      {
        url: String,
        caption: String,
        isPrimary: Boolean,
      },
    ],

    // EPC Rating
    epcRating: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    },

    // Metrics
    metrics: {
      views: {
        type: Number,
        default: 0,
      },
      enquiries: {
        type: Number,
        default: 0,
      },
      viewings: {
        type: Number,
        default: 0,
      },
    },

    // Dates
    listedDate: {
      type: Date,
      default: Date.now,
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

// Compound indexes for common queries
propertySchema.index({ agentId: 1, status: 1 });
propertySchema.index({ agentId: 1, bedrooms: 1, 'price.amount': 1 });
propertySchema.index({ agentId: 1, 'address.postcode': 1 });

// Text search index
propertySchema.index({
  title: 'text',
  description: 'text',
  'address.line1': 'text',
  'address.city': 'text',
});

// Query helper for available properties
propertySchema.query.available = function () {
  return this.where({
    status: 'available',
    deletedAt: null,
  });
};

module.exports = mongoose.model('Property', propertySchema);
