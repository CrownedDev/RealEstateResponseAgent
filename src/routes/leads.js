const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');
const {
  getLeads,
  getLead,
  createLead,
  updateLead,
  addNote,
  getLeadStats,
} = require('../controllers/leadController');

// All routes require authentication
router.use(authenticate);

// Lead routes
router.get('/', getLeads);
router.post('/', createLead);
router.get('/stats', getLeadStats);
router.get('/:id', validateObjectId('id'), getLead);
router.patch('/:id', validateObjectId('id'), updateLead);
router.post('/:id/notes', validateObjectId('id'), addNote);

module.exports = router;
