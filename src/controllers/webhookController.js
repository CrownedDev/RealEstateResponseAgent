const Lead = require('../models/Lead');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Conversation = require('../models/Conversation');
const Agent = require('../models/Agent');
const { AppError } = require('../middleware/errorHandler');
const { logger } = require('../middleware/logger');

// @desc    Capture lead from chatbot conversation
// @route   POST /api/v1/webhooks/lead
// @access  Private (API key)
const captureLead = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      propertyId,
      requirements,
      conversationId,
      channel,
    } = req.body;

    // Validate required fields
    if (!firstName || !phone) {
      return next(new AppError('First name and phone are required', 400));
    }

    const leadData = {
      agentId: req.agentId,
      contact: {
        firstName,
        lastName,
        email,
        phone,
        preferredContact: email ? 'email' : 'phone',
      },
      source: {
        channel: channel || 'webchat',
      },
      conversation: {
        conversationId,
      },
    };

    // Add property interest if provided
    if (propertyId) {
      const property = await Property.findById(propertyId);
      if (property) {
        leadData.propertyInterest = {
          propertyId: property._id,
          propertyRef: property.externalRef,
          propertyAddress: `${property.address.line1}, ${property.address.city}`,
          propertyPrice: property.price.amount,
        };
      }
    }

    // Add requirements if provided
    if (requirements) {
      leadData.requirements = requirements;
    }

    const lead = await Lead.create(leadData);

    logger.info(`Lead captured: ${lead._id} from ${channel}`);

    res.status(201).json({
      success: true,
      message: 'Lead captured successfully',
      data: {
        leadId: lead._id,
        score: lead.score.value,
        status: lead.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search properties for chatbot
// @route   POST /api/v1/webhooks/search-properties
// @access  Private (API key)
const searchPropertiesWebhook = async (req, res, next) => {
  try {
    const { bedrooms, minPrice, maxPrice, location, type } = req.body;

    const query = {
      agentId: req.agentId,
      status: 'available',
      deletedAt: null,
    };

    if (bedrooms) query.bedrooms = parseInt(bedrooms);
    if (type) query.type = type;

    if (minPrice || maxPrice) {
      query['price.amount'] = {};
      if (minPrice) query['price.amount'].$gte = parseInt(minPrice);
      if (maxPrice) query['price.amount'].$lte = parseInt(maxPrice);
    }

    if (location) {
      query.$or = [
        { 'address.city': new RegExp(location, 'i') },
        { 'address.postcode': new RegExp(location, 'i') },
      ];
    }

    const properties = await Property.find(query)
      .limit(5)
      .select(
        '_id title address bedrooms bathrooms price features epcRating images'
      )
      .sort({ 'price.amount': 1 });

    // Format for chatbot
    const formattedProperties = properties.map((p) => ({
      id: p._id,
      title: p.title,
      address: `${p.address.line1}, ${p.address.city}, ${p.address.postcode}`,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      price: `£${p.price.amount.toLocaleString()}`,
      features: p.features.slice(0, 3).join(', '),
      epcRating: p.epcRating,
      image: p.images && p.images.length > 0 ? p.images[0].url : null,
    }));

    res.json({
      success: true,
      count: formattedProperties.length,
      properties: formattedProperties,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get property details for chatbot
// @route   GET /api/v1/webhooks/property/:id
// @access  Private (API key)
const getPropertyDetails = async (req, res, next) => {
  try {
    const property = await Property.findOne({
      _id: req.params.id,
      agentId: req.agentId,
      status: 'available',
      deletedAt: null,
    });

    if (!property) {
      return next(new AppError('Property not found', 404));
    }

    // Format for chatbot
    const formatted = {
      id: property._id,
      title: property.title,
      description: property.description,
      address: `${property.address.line1}, ${property.address.city}, ${property.address.postcode}`,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      price: `£${property.price.amount.toLocaleString()}`,
      priceAmount: property.price.amount,
      features: property.features,
      epcRating: property.epcRating,
      images: property.images,
      isRental: property.rental.isRental,
    };

    res.json({
      success: true,
      property: formatted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create booking from chatbot
// @route   POST /api/v1/webhooks/booking
// @access  Private (API key)
const createBookingWebhook = async (req, res, next) => {
  try {
    const {
      leadId,
      propertyId,
      date,
      time,
      customerName,
      customerPhone,
      customerEmail,
    } = req.body;

    // Validate required fields
    if (!propertyId || !date || !time || !customerName || !customerPhone) {
      return next(new AppError('Missing required booking information', 400));
    }

    // Get property details
    const property = await Property.findById(propertyId);
    if (!property) {
      return next(new AppError('Property not found', 404));
    }

    // Parse date and time
    const [hours, minutes] = time.split(':');
    const scheduledDate = new Date(date);
    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const bookingData = {
      agentId: req.agentId,
      leadId: leadId || null,
      propertyId: property._id,
      type: 'viewing',
      scheduledDate,
      duration: 30,
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      },
      property: {
        address: `${property.address.line1}, ${property.address.city}`,
        reference: property.externalRef,
      },
      status: 'pending',
    };

    const booking = new Booking(bookingData);

    // Check for conflicts
    const hasConflict = await booking.hasConflict();
    if (hasConflict) {
      return res.status(409).json({
        success: false,
        error: 'Time slot not available',
        message:
          'This time slot is already booked. Please choose another time.',
      });
    }

    await booking.save();

    // Update lead status if leadId provided
    if (leadId) {
      await Lead.findByIdAndUpdate(leadId, {
        status: 'viewing-booked',
      });
    }

    logger.info(`Booking created via webhook: ${booking._id}`);

    res.status(201).json({
      success: true,
      message: 'Viewing booked successfully',
      booking: {
        id: booking._id,
        date: booking.scheduledDate,
        propertyAddress: booking.property.address,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check booking availability for chatbot
// @route   POST /api/v1/webhooks/check-availability
// @access  Private (API key)
const checkAvailabilityWebhook = async (req, res, next) => {
  try {
    const { date } = req.body;

    if (!date) {
      return next(new AppError('Date is required', 400));
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      agentId: req.agentId,
      scheduledDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed'] },
      deletedAt: null,
    });

    // Generate available slots (9am - 6pm, 30-min intervals)
    const allSlots = [];
    for (let hour = 9; hour < 18; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    // Mark booked slots
    const bookedSlots = [];
    bookings.forEach((b) => {
      const localDate = new Date(b.scheduledDate);
      const endTime = new Date(localDate.getTime() + b.duration * 60000);

      let currentTime = new Date(localDate);
      while (currentTime < endTime) {
        const hours = currentTime.getHours();
        const mins = currentTime.getMinutes();
        const slot = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        if (!bookedSlots.includes(slot)) {
          bookedSlots.push(slot);
        }
        currentTime = new Date(currentTime.getTime() + 30 * 60000);
      }
    });

    const availableSlots = allSlots.filter(
      (slot) => !bookedSlots.includes(slot)
    );

    res.json({
      success: true,
      date,
      availableSlots,
      message:
        availableSlots.length > 0
          ? `${availableSlots.length} slots available`
          : 'No slots available for this date',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log conversation from chatbot
// @route   POST /api/v1/webhooks/conversation
// @access  Private (API key)
const logConversation = async (req, res, next) => {
  try {
    const { externalId, channel, messages, outcome, leadId, customerPhone } =
      req.body;

    const conversationData = {
      agentId: req.agentId,
      leadId: leadId || null,
      externalId,
      channel: channel || 'webchat',
      customer: {
        phone: customerPhone,
      },
      messages: messages || [],
      outcome: outcome || 'information_provided',
      startedAt: new Date(req.body.startedAt) || new Date(),
    };

    if (req.body.endedAt) {
      conversationData.endedAt = new Date(req.body.endedAt);
    }

    const conversation = await Conversation.create(conversationData);

    // Update agent's conversation usage
    await Agent.findByIdAndUpdate(req.agentId, {
      $inc: { 'subscription.conversationsUsed': 1 },
    });

    logger.info(`Conversation logged: ${conversation._id}`);

    res.status(201).json({
      success: true,
      message: 'Conversation logged successfully',
      conversationId: conversation._id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  captureLead,
  searchPropertiesWebhook,
  getPropertyDetails,
  createBookingWebhook,
  checkAvailabilityWebhook,
  logConversation,
};
