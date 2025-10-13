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

/**
 * @swagger
 * /api/v1/webhooks/lead:
 *   post:
 *     summary: Capture lead from chatbot
 *     description: Create a new lead from chatbot conversation with automatic scoring
 *     tags: [Webhooks]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - phone
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Smith"
 *               email:
 *                 type: string
 *                 example: "john.smith@email.com"
 *               phone:
 *                 type: string
 *                 example: "07700900456"
 *               propertyId:
 *                 type: string
 *                 example: "68ed359730ae49287ff89210"
 *               channel:
 *                 type: string
 *                 enum: [phone, webchat, whatsapp, messenger]
 *                 example: "webchat"
 *               conversationId:
 *                 type: string
 *                 example: "vf_conv_123456"
 *     responses:
 *       201:
 *         description: Lead captured successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Lead captured successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     leadId:
 *                       type: string
 *                     score:
 *                       type: number
 *                       example: 75
 *                       description: "Auto-calculated score (0-100)"
 *                     status:
 *                       type: string
 *                       example: "new"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/lead', captureLead);

/**
 * @swagger
 * /api/v1/webhooks/search-properties:
 *   post:
 *     summary: Search properties for chatbot
 *     description: Search available properties with results formatted for chatbot responses
 *     tags: [Webhooks]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
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
 *     responses:
 *       200:
 *         description: Properties found and formatted for chatbot
 *       401:
 *         description: Unauthorized
 */
router.post('/search-properties', searchPropertiesWebhook);

/**
 * @swagger
 * /api/v1/webhooks/booking:
 *   post:
 *     summary: Create booking from chatbot
 *     description: Create a viewing booking with automatic conflict detection
 *     tags: [Webhooks]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - date
 *               - time
 *               - customerName
 *               - customerPhone
 *             properties:
 *               propertyId:
 *                 type: string
 *                 example: "68ed359730ae49287ff89210"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-16"
 *               time:
 *                 type: string
 *                 example: "10:00"
 *               customerName:
 *                 type: string
 *                 example: "John Smith"
 *               customerPhone:
 *                 type: string
 *                 example: "07700900456"
 *               customerEmail:
 *                 type: string
 *                 example: "john.smith@email.com"
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       409:
 *         description: Time slot not available (conflict detected)
 *       401:
 *         description: Unauthorized
 */
router.post('/booking', createBookingWebhook);

/**
 * @swagger
 * /api/v1/webhooks/check-availability:
 *   post:
 *     summary: Check booking availability
 *     description: Get available time slots for a specific date
 *     tags: [Webhooks]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-16"
 *     responses:
 *       200:
 *         description: Available slots retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 date:
 *                   type: string
 *                   example: "2025-10-16"
 *                 availableSlots:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["09:00", "09:30", "10:00"]
 *       401:
 *         description: Unauthorized
 */
router.post('/check-availability', checkAvailabilityWebhook);

router.get('/property/:id', validateObjectId('id'), getPropertyDetails);
router.post('/conversation', logConversation);

module.exports = router;
