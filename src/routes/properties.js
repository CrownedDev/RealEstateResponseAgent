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

/**
 * @swagger
 * /api/v1/properties/search:
 *   post:
 *     summary: Search properties
 *     description: Search available properties by bedrooms, price, location, and type
 *     tags: [Properties]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bedrooms:
 *                 type: number
 *                 example: 3
 *               maxPrice:
 *                 type: number
 *                 example: 800000
 *               location:
 *                 type: string
 *                 example: "London"
 *               type:
 *                 type: string
 *                 enum: [house, flat, bungalow, maisonette, land, commercial]
 *                 example: "house"
 *     responses:
 *       200:
 *         description: Properties found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 *       401:
 *         description: Unauthorized
 */
router.post('/search', searchProperties);

router.get('/', getProperties);
router.post('/', createProperty);
router.get('/:id', validateObjectId('id'), getProperty);
router.patch('/:id', validateObjectId('id'), updateProperty);
router.delete('/:id', validateObjectId('id'), deleteProperty);

module.exports = router;
