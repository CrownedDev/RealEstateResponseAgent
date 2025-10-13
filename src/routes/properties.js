const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');
const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties,
} = require('../controllers/propertyController');

// All routes require authentication
router.use(authenticate);

// Property routes
router.get('/', getProperties);
router.post('/', createProperty);
router.post('/search', searchProperties);
router.get('/:id', validateObjectId('id'), getProperty);
router.patch('/:id', validateObjectId('id'), updateProperty);
router.delete('/:id', validateObjectId('id'), deleteProperty);

module.exports = router;
