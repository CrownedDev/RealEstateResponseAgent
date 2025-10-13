const express = require('express');
const router = express.Router();

// Import route modules
const agentRoutes = require('./agents');
const propertyRoutes = require('./properties');

// Mount routes
router.use('/agents', agentRoutes);
router.use('/properties', propertyRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Royal Response API v1',
    endpoints: {
      agents: '/api/v1/agents',
      properties: '/api/v1/properties',
      leads: '/api/v1/leads',
      bookings: '/api/v1/bookings',
      webhooks: '/api/v1/webhooks',
    },
  });
});

module.exports = router;
