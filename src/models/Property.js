const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  // Agent Reference
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true,
    index: true
  },
  
  // External References
  externalRef: {
    type: String,
    required: true
  },
  sourceSystem: {
    type: String,
    enum: ['crm', 'feed', 'manual']
  },
  
  // Basic Details
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Address
  address: {
    line1: {
      type: String,
      required: true
    },
    line2: String,
    city: {
      type: String,
      required: true,
      index: true
    },
    county: String,
    postcode: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    country: {
      type: String,
      default: 'United Kingdom'
    },
    
    // For geospatial queries (future feature)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    }
  },
  
  // Property Details
  type: {
    type: String,
    required: true,
    enum: ['house', 'flat', 'bungalow', 'maisonette', 'land', 'commercial'],
    index: true
  },
  subtype: String, // 'detached', 'semi-detached', 'terraced', 'end-terrace'
  bedrooms: {
    type: Number,
    required: true,
    min: 0,
    max: 20,
    index: true
  },
  bathrooms: {
    type: Number,
    min: 0
  },
  receptionRooms: Number,
  
  // Pricing
  price: {
    amount: {
      type: Number,
      required: true,
      min: 0,
      index: true
    },
    currency: {
      type: String,
      default: 'GBP'
    },
    qualifier: {
      type: String,
      enum: ['asking', 'guide', 'fixed', 'poa', 'offers-over']
    }
  },
  
  // If rental
  rental: {
    isRental: {
      type: Boolean,
      default: false
    },
    rentPeriod: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly']
    },
    furnished: {
      type: String,
      enum: ['furnished', 'unfurnished', 'part-furnished']
    },
    availableFrom: Date
  },
  
  // Status
  status: {
    type: String,
    enum: ['available', 'under-offer', 'sold', 'let', 'withdrawn', 'draft'],
    default: 'available',
    index: true
  },
  marketingStatus: {
    type: String,
    enum: ['available', 'sstc', 'sold', 'let-agreed', 'let'],
    index: true
  },
  
  // Features
  features: [String],
  keyFeatures: [String],
  
  // Images
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    order: Number,
    isPrimary: Boolean
  }],
  
  // Documents
  floorplan: String,
  epcDocument: String,
  virtualTour: String,
  
  // Energy Performance
  epcRating: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G']
  },
  
  // Metrics (for internal use)
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    enquiries: {
      type: Number,
      default: 0
    },
    viewings: {
      type: Number,
      default: 0
    },
    lastEnquiry: Date
  },
  
  // SEO
  slug: {
    type: String,
    lowercase: true,
    index: true
  },
  
  // Dates
  listedDate: Date,
  lastModified: Date,
  
  // Soft Delete
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
propertySchema.index({ agentId: 1, status: 1, deletedAt: 1 });
propertySchema.index({ agentId: 1, bedrooms: 1, 'price.amount': 1 });
propertySchema.index({ agentId: 1, 'address.postcode': 1 });
propertySchema.index({ agentId: 1, type: 1, status: 1 });

// Text index for search
propertySchema.index({
  title: 'text',
  description: 'text',
  'address.line1': 'text',
  'address.city': 'text'
});

// Generate slug before saving
propertySchema.pre('save', function(next) {
  if (!this.slug) {
    const slugify = str => str.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    this.slug = `${slugify(this.address.line1)}-${this.externalRef}`;
  }
  next();
});

// Query helper
propertySchema.query.available = function() {
  return this.where({ 
    status: 'available',
    deletedAt: null 
  });
};

module.exports = mongoose.model('Property', propertySchema);