// src/routes/sales.js
const express = require('express');
const router = express.Router();
const {
  captureSalesLead,
  calculateROI,
  getAvailableSlots,
  bookMeeting,
  updateProspectStatus,
  lookupProspectByVoiceflowId,
} = require('../controllers/salesWebhookController');

// Public endpoints (no auth required for sales demo bot)
router.get('/voiceflow/:prospectId', lookupProspectByVoiceflowId);
router.post('/capture-lead', captureSalesLead);
router.post('/calculate-roi', calculateROI);
router.get('/availability', getAvailableSlots);
router.post('/book-meeting', bookMeeting);

// Internal endpoints (you might want to add auth for these)
router.patch('/prospect/:id/status', updateProspectStatus);

module.exports = router;
