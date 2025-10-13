const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');
const {
  captureLead,
  searchPropertiesWebhook,
  getPropertyDetails,
  createBookingWebhook,
  checkAvailabilityWebhook,
  logConversation,
} = require('../controllers/webhookController');

// All webhook routes require authentication
router.use(authenticate);

// Webhook routes for Voiceflow integration
router.post('/lead', captureLead);
console.log('✅ /lead route registered');

router.post('/search-properties', searchPropertiesWebhook);
console.log('✅ /search-properties route registered');

router.get('/property/:id', validateObjectId('id'), getPropertyDetails);
console.log('✅ /property/:id route registered');

router.post('/booking', createBookingWebhook);
console.log('✅ /booking route registered');

router.post('/check-availability', checkAvailabilityWebhook);
console.log('✅ /check-availability route registered');

router.post('/conversation', logConversation);
console.log('✅ /conversation route registered');

module.exports = router;
