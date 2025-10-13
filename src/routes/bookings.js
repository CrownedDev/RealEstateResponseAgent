const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');
const {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  cancelBooking,
  checkAvailability,
} = require('../controllers/bookingController');

// All routes require authentication
router.use(authenticate);

// Booking routes
router.get('/', getBookings);
router.post('/', createBooking);
router.get('/availability', checkAvailability);
router.get('/:id', validateObjectId('id'), getBooking);
router.patch('/:id', validateObjectId('id'), updateBooking);
router.delete('/:id', validateObjectId('id'), cancelBooking);

module.exports = router;
