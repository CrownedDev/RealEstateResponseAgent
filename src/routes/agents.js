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

/**
 * @swagger
 * /api/v1/agents/me:
 *   get:
 *     summary: Get agent profile
 *     description: Retrieve the authenticated agent's profile information
 *     tags: [Agents]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Agent profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Agent'
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', getProfile);

/**
 * @swagger
 * /api/v1/agents/me:
 *   patch:
 *     summary: Update agent profile
 *     description: Update the authenticated agent's profile information
 *     tags: [Agents]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *                 example: "Smith & Sons Estate Agents Ltd"
 *               email:
 *                 type: string
 *                 example: "newemail@smithandsons.com"
 *               phone:
 *                 type: string
 *                 example: "07700900123"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch('/me', updateProfile);

/**
 * @swagger
 * /api/v1/agents/stats:
 *   get:
 *     summary: Get agent statistics
 *     description: Retrieve statistics including property count, lead count, bookings, and conversation usage
 *     tags: [Agents]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     properties:
 *                       type: number
 *                       example: 45
 *                     leads:
 *                       type: number
 *                       example: 123
 *                     bookings:
 *                       type: number
 *                       example: 67
 *                     conversations:
 *                       type: number
 *                       example: 234
 *                     subscription:
 *                       type: object
 *                       properties:
 *                         conversationsUsed:
 *                           type: number
 *                           example: 234
 *                         conversationLimit:
 *                           type: number
 *                           example: 500
 *                         percentageUsed:
 *                           type: number
 *                           example: 47
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', getStats);

module.exports = router;
