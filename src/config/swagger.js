const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Royal Response API',
      version: '1.0.0',
      description:
        '24/7 AI Response System for UK Estate Agents - Complete RESTful API with webhook endpoints for Voiceflow integration',
      contact: {
        name: 'API Support',
        email: 'support@royalresponse.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.royalresponse.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description:
            'API key for authentication. Get this from your agent profile in MongoDB.',
        },
      },
      schemas: {
        Agent: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '68ed359730ae49287ff89210' },
            companyName: {
              type: 'string',
              example: 'Smith & Sons Estate Agents',
            },
            slug: { type: 'string', example: 'smith-sons-estate-agents' },
            email: { type: 'string', example: 'contact@smithandsons.com' },
            phone: { type: 'string', example: '07700900123' },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
            },
            subscription: {
              type: 'object',
              properties: {
                tier: {
                  type: 'string',
                  enum: ['essential', 'professional', 'enterprise'],
                },
                status: {
                  type: 'string',
                  enum: ['trial', 'active', 'paused', 'cancelled'],
                },
                conversationsUsed: { type: 'number', example: 45 },
                conversationLimit: { type: 'number', example: 500 },
              },
            },
          },
        },
        Property: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: {
              type: 'string',
              example: 'Beautiful 3-Bed Victorian House',
            },
            description: { type: 'string' },
            address: {
              type: 'object',
              properties: {
                line1: { type: 'string', example: '123 High Street' },
                city: { type: 'string', example: 'London' },
                postcode: { type: 'string', example: 'SW1A 1AA' },
              },
            },
            type: {
              type: 'string',
              enum: [
                'house',
                'flat',
                'bungalow',
                'maisonette',
                'land',
                'commercial',
              ],
            },
            bedrooms: { type: 'number', example: 3 },
            bathrooms: { type: 'number', example: 2 },
            price: {
              type: 'object',
              properties: {
                amount: { type: 'number', example: 750000 },
                currency: { type: 'string', example: 'GBP' },
              },
            },
            status: {
              type: 'string',
              enum: ['available', 'under-offer', 'sold', 'let', 'withdrawn'],
            },
            features: { type: 'array', items: { type: 'string' } },
            epcRating: {
              type: 'string',
              enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
            },
          },
        },
        Lead: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            contact: {
              type: 'object',
              properties: {
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Smith' },
                email: { type: 'string', example: 'john.smith@email.com' },
                phone: { type: 'string', example: '07700900456' },
              },
            },
            score: {
              type: 'object',
              properties: {
                value: {
                  type: 'number',
                  example: 75,
                  description: 'Auto-calculated score (0-100)',
                },
              },
            },
            status: {
              type: 'string',
              enum: [
                'new',
                'contacted',
                'qualified',
                'viewing-booked',
                'converted',
                'lost',
              ],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
            },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: {
              type: 'string',
              enum: ['viewing', 'valuation', 'callback'],
            },
            scheduledDate: { type: 'string', format: 'date-time' },
            duration: {
              type: 'number',
              example: 30,
              description: 'Duration in minutes',
            },
            customer: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'John Smith' },
                phone: { type: 'string', example: '07700900456' },
                email: { type: 'string', example: 'john.smith@email.com' },
              },
            },
            status: {
              type: 'string',
              enum: [
                'pending',
                'confirmed',
                'completed',
                'cancelled',
                'no-show',
              ],
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Resource not found' },
          },
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to API route files
};

module.exports = swaggerJsdoc(options);
