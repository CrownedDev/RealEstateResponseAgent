const express = require('express');
const router = express.Router();

// Import route modules
const agentRoutes = require('./agents');
const propertyRoutes = require('./properties');
const leadRoutes = require('./leads');
const bookingRoutes = require('./bookings');
const webhookRoutes = require('./webhooks');
const salesRoutes = require('./sales');

// Mount routes
router.use('/agents', agentRoutes);
router.use('/properties', propertyRoutes);
router.use('/leads', leadRoutes);
router.use('/bookings', bookingRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/sales', salesRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Royal Response API v1',
    version: '1.0.0',
    endpoints: {
      agents: '/api/v1/agents',
      properties: '/api/v1/properties',
      leads: '/api/v1/leads',
      bookings: '/api/v1/bookings',
      webhooks: '/api/v1/webhooks',
    },
    webhookEndpoints: {
      captureLead: 'POST /api/v1/webhooks/lead',
      searchProperties: 'POST /api/v1/webhooks/search-properties',
      getProperty: 'GET /api/v1/webhooks/property/:id',
      createBooking: 'POST /api/v1/webhooks/booking',
      checkAvailability: 'POST /api/v1/webhooks/check-availability',
      logConversation: 'POST /api/v1/webhooks/conversation',
    },
  });
});

module.exports = router;
