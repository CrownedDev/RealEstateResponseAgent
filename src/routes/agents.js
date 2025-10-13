const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  getStats,
} = require('../controllers/agentController');

// All routes require authentication
router.use(authenticate);

// Agent routes
router.get('/me', getProfile);
router.patch('/me', updateProfile);
router.get('/stats', getStats);

module.exports = router;
