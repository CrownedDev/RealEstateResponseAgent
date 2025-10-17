const { AppError, errorHandler } = require('../../src/middleware/errorHandler');
const { authenticate } = require('../../src/middleware/auth');
const Agent = require('../../src/models/Agent');
const mongoose = require('mongoose');

// Mock the Agent model
jest.mock('../../src/models/Agent');

// Mock the logger to avoid creating log files during tests
jest.mock('../../src/middleware/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
  requestLogger: jest.fn((req, res, next) => next()),
}));

describe('Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Middleware', () => {
    it('should authenticate valid API key', async () => {
      const testAgent = {
        _id: new mongoose.Types.ObjectId(),
        apiKey: 'test_api_key_123',
        status: 'active',
        subscription: {
          status: 'active',
          conversationsUsed: 10,
          conversationLimit: 100,
        },
        lastActiveAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock the Agent.findOne to return a mock agent with select method
      Agent.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(testAgent),
      });

      const req = {
        headers: { 'x-api-key': 'test_api_key_123' },
      };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(req.agentId).toBeDefined();
      expect(req.agentId.toString()).toBe(testAgent._id.toString());
      expect(req.agent).toBeDefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject missing API key', async () => {
      const req = { headers: {}, query: {} };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('API key required');
    });

    it('should reject invalid API key', async () => {
      Agent.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const req = {
        headers: { 'x-api-key': 'invalid_key' },
      };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('Invalid API key');
    });

    it('should reject expired or deleted agent', async () => {
      const testAgent = {
        _id: new mongoose.Types.ObjectId(),
        apiKey: 'test_api_key_123',
        status: 'active',
        subscription: {
          status: 'expired',
          conversationsUsed: 10,
          conversationLimit: 100,
        },
      };

      Agent.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(testAgent),
      });

      const req = {
        headers: { 'x-api-key': 'test_api_key_123' },
      };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain('Subscription inactive');
    });

    it('should reject when conversation limit reached', async () => {
      const testAgent = {
        _id: new mongoose.Types.ObjectId(),
        apiKey: 'test_api_key_123',
        status: 'active',
        subscription: {
          status: 'active',
          conversationsUsed: 100,
          conversationLimit: 100,
        },
      };

      Agent.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(testAgent),
      });

      const req = {
        headers: { 'x-api-key': 'test_api_key_123' },
      };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(429);
      expect(error.message).toContain('Monthly conversation limit reached');
    });
  });

  describe('Error Handler Middleware', () => {
    it('should handle AppError with correct status code', () => {
      const error = new AppError('Custom error', 400);

      const req = { path: '/test', method: 'GET', ip: '127.0.0.1' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Custom error',
        })
      );
    });

    it('should handle ValidationError as 400', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        field1: { message: 'Field1 is required' },
        field2: { message: 'Field2 must be valid' },
      };

      const req = { path: '/test', method: 'POST', ip: '127.0.0.1' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Field1 is required, Field2 must be valid',
        })
      );
    });

    it('should handle CastError as 404', () => {
      const error = new Error('Cast to ObjectId failed');
      error.name = 'CastError';

      const req = { path: '/test', method: 'GET', ip: '127.0.0.1' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Resource not found',
        })
      );
    });

    it('should handle duplicate key error as 400', () => {
      const error = new Error('Duplicate key');
      error.code = 11000;
      error.keyValue = { email: 'test@test.com' };

      const req = { path: '/test', method: 'POST', ip: '127.0.0.1' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'email already exists',
        })
      );
    });

    it('should default to 500 for unknown errors', () => {
      const error = new Error('Unknown error');

      const req = { path: '/test', method: 'GET', ip: '127.0.0.1' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unknown error',
        })
      );
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';

      const error = new Error('Dev error');
      error.stack = 'Error: Dev error\n    at Object.<anonymous>';

      const req = { path: '/test', method: 'GET', ip: '127.0.0.1' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String),
        })
      );

      process.env.NODE_ENV = 'test';
    });
  });

  describe('AppError Class', () => {
    it('should create AppError with message and status code', () => {
      const error = new AppError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should work without status code', () => {
      const error = new AppError('Server error', 500);

      expect(error.message).toBe('Server error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test error', 400);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Test error');
      expect(error.constructor.name).toBe('AppError');
    });
  });
});
