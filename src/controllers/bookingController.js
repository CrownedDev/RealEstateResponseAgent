const Booking = require('../models/Booking');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all bookings for agent
// @route   GET /api/v1/bookings
// @access  Private
const getBookings = async (req, res, next) => {
  try {
    const { status, type, from, to } = req.query;

    const query = {
      agentId: req.agentId,
      deletedAt: null,
    };

    // Apply filters
    if (status) query.status = status;
    if (type) query.type = type;
    if (from || to) {
      query.scheduledDate = {};
      if (from) query.scheduledDate.$gte = new Date(from);
      if (to) query.scheduledDate.$lte = new Date(to);
    }

    const bookings = await Booking.find(query)
      .populate('leadId', 'contact')
      .populate('propertyId', 'title address')
      .sort({ scheduledDate: 1 })
      .select('-__v');

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      agentId: req.agentId,
      deletedAt: null,
    })
      .populate('leadId')
      .populate('propertyId');

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create booking
// @route   POST /api/v1/bookings
// @access  Private
const createBooking = async (req, res, next) => {
  try {
    const bookingData = {
      ...req.body,
      agentId: req.agentId,
    };

    const booking = new Booking(bookingData);

    // Check for conflicts
    const hasConflict = await booking.hasConflict();
    if (hasConflict) {
      return next(new AppError('Time slot not available', 409));
    }

    await booking.save();

    // Update lead status
    const Lead = require('../models/Lead');
    await Lead.findByIdAndUpdate(booking.leadId, {
      status: 'viewing-booked',
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking
// @route   PATCH /api/v1/bookings/:id
// @access  Private
const updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      agentId: req.agentId,
      deletedAt: null,
    });

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    Object.assign(booking, req.body);
    await booking.save();

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel booking
// @route   DELETE /api/v1/bookings/:id
// @access  Private
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      agentId: req.agentId,
      deletedAt: null,
    });

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledAt: new Date(),
      cancelledBy: 'agent',
      reason: req.body.reason || 'Cancelled by agent',
    };

    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check availability
// @route   GET /api/v1/bookings/availability
// @access  Private
// @desc    Check availability
// @route   GET /api/v1/bookings/availability
// @access  Private
const checkAvailability = async (req, res, next) => {
  try {
    const { date } = req.query;

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
    }).sort({ scheduledDate: 1 });

    // Generate available slots (9am - 6pm, 30-min intervals)
    const allSlots = [];
    for (let hour = 9; hour < 18; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    // Extract booked time slots (convert from UTC to local time)
    const bookedSlots = bookings.map((b) => {
      const localDate = new Date(b.scheduledDate);
      const hours = localDate.getHours();
      const mins = localDate.getMinutes();
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    });

    // Also mark the slot after (for duration)
    const bookedSlotsWithDuration = [...bookedSlots];
    bookings.forEach((b) => {
      const localDate = new Date(b.scheduledDate);
      const endTime = new Date(localDate.getTime() + b.duration * 60000);

      // Mark all 30-min slots covered by this booking
      let currentTime = new Date(localDate);
      while (currentTime < endTime) {
        const hours = currentTime.getHours();
        const mins = currentTime.getMinutes();
        const slot = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        if (!bookedSlotsWithDuration.includes(slot)) {
          bookedSlotsWithDuration.push(slot);
        }
        currentTime = new Date(currentTime.getTime() + 30 * 60000); // Add 30 mins
      }
    });

    const availableSlots = allSlots.filter(
      (slot) => !bookedSlotsWithDuration.includes(slot)
    );

    res.json({
      success: true,
      date,
      availableSlots,
      bookedSlots: bookings.map((b) => ({
        time: b.scheduledDate,
        duration: `${b.duration} mins`,
        customer: b.customer.name,
        property: b.property.address,
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  cancelBooking,
  checkAvailability,
};
