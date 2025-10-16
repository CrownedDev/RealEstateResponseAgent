const mongoose = require('mongoose');
const Conversation = require('../../src/models/Conversation');
const Agent = require('../../src/models/Agent');
const Lead = require('../../src/models/Lead');

describe('Conversation Model', () => {
  let testAgent;
  let testLead;

  beforeEach(async () => {
    await Conversation.deleteMany({});
    await Lead.deleteMany({});
    await Agent.deleteMany({});

    testAgent = await Agent.create({
      companyName: 'Test Agent for Conversations',
      email: 'convtest@example.com',
      phone: '07700900666',
    });

    testLead = await Lead.create({
      agentId: testAgent._id,
      contact: {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '07700900789',
        email: 'jane@example.com',
      },
      source: {
        channel: 'webchat',
      },
    });
  });

  afterEach(async () => {
    await Conversation.deleteMany({});
    await Lead.deleteMany({});
    await Agent.deleteMany({});
  });

  describe('Conversation Creation', () => {
    it('should create a conversation with required fields', async () => {
      const conversation = await Conversation.create({
        agentId: testAgent._id,
        leadId: testLead._id,
        channel: 'webchat',
      });

      expect(conversation.channel).toBe('webchat');
      expect(conversation.startedAt).toBeDefined();
      expect(conversation.messages).toEqual([]);
    });

    it('should require agentId', async () => {
      const conversation = new Conversation({
        leadId: testLead._id,
        channel: 'webchat',
      });

      await expect(conversation.save()).rejects.toThrow();
    });

    it('should require channel', async () => {
      const conversation = new Conversation({
        agentId: testAgent._id,
        leadId: testLead._id,
      });

      await expect(conversation.save()).rejects.toThrow();
    });

    it('should auto-generate startedAt', async () => {
      const conversation = await Conversation.create({
        agentId: testAgent._id,
        leadId: testLead._id,
        channel: 'phone',
      });

      expect(conversation.startedAt).toBeDefined();
      expect(conversation.startedAt).toBeInstanceOf(Date);
    });

    it('should validate channel type', async () => {
      const conversation = new Conversation({
        agentId: testAgent._id,
        channel: 'invalid-channel',
      });

      await expect(conversation.save()).rejects.toThrow();
    });

    it('should accept valid channel types', async () => {
      const channels = ['phone', 'webchat', 'whatsapp', 'messenger'];

      for (const channel of channels) {
        const conversation = await Conversation.create({
          agentId: testAgent._id,
          channel,
        });

        expect(conversation.channel).toBe(channel);
      }
    });
  });

  describe('Message Management', () => {
    it('should add messages to conversation', async () => {
      const conversation = await Conversation.create({
        agentId: testAgent._id,
        leadId: testLead._id,
        channel: 'webchat',
        messages: [
          {
            role: 'user',
            content: 'Hello, I want to book a viewing',
            timestamp: new Date(),
          },
          {
            role: 'assistant',
            content: 'Of course! Which property are you interested in?',
            timestamp: new Date(),
          },
        ],
      });

      expect(conversation.messages.length).toBe(2);
      expect(conversation.messages[0].role).toBe('user');
      expect(conversation.messages[1].role).toBe('assistant');
    });

    it('should auto-calculate message counts in pre-save hook', async () => {
      const conversation = await Conversation.create({
        agentId: testAgent._id,
        leadId: testLead._id,
        channel: 'phone',
        messages: [
          { role: 'user', content: 'Test 1', timestamp: new Date() },
          { role: 'assistant', content: 'Test 2', timestamp: new Date() },
          { role: 'user', content: 'Test 3', timestamp: new Date() },
        ],
      });

      expect(conversation.metrics.messageCount).toBe(3);
      expect(conversation.metrics.userMessageCount).toBe(2);
      expect(conversation.metrics.assistantMessageCount).toBe(1);
    });
  });

  describe('Conversation Duration', () => {
    it('should calculate duration when ended', async () => {
      const startedAt = new Date('2025-10-16T10:00:00Z');
      const endedAt = new Date('2025-10-16T10:05:30Z');

      const conversation = await Conversation.create({
        agentId: testAgent._id,
        leadId: testLead._id,
        channel: 'phone',
        startedAt,
        endedAt,
      });

      // Duration should be 330 seconds (5 min 30 sec)
      expect(conversation.duration).toBe(330);
    });

    it('should not calculate duration if not ended', async () => {
      const conversation = await Conversation.create({
        agentId: testAgent._id,
        leadId: testLead._id,
        channel: 'webchat',
      });

      expect(conversation.duration).toBeUndefined();
    });
  });

  describe('Conversation Outcome', () => {
    it('should track successful lead capture outcome', async () => {
      const conversation = await Conversation.create({
        agentId: testAgent._id,
        leadId: testLead._id,
        channel: 'webchat',
        endedAt: new Date(),
        outcome: 'lead_captured',
      });

      expect(conversation.outcome).toBe('lead_captured');
    });

    it('should track booking outcome', async () => {
      const conversation = await Conversation.create({
        agentId: testAgent._id,
        leadId: testLead._id,
        channel: 'phone',
        endedAt: new Date(),
        outcome: 'booking_made',
      });

      expect(conversation.outcome).toBe('booking_made');
    });

    it('should accept valid outcome values', async () => {
      const outcomes = [
        'lead_captured',
        'booking_made',
        'information_provided',
        'escalated',
        'abandoned',
      ];

      for (const outcome of outcomes) {
        const conversation = await Conversation.create({
          agentId: testAgent._id,
          channel: 'webchat',
          outcome,
        });

        expect(conversation.outcome).toBe(outcome);
      }
    });
  });

  describe('Conversation Summary & Intent', () => {
    it('should store AI-generated summary', async () => {
      const conversation = await Conversation.create({
        agentId: testAgent._id,
        leadId: testLead._id,
        channel: 'webchat',
        endedAt: new Date(),
        summary:
          'Customer inquired about 3-bed property in London. Viewing booked for Tuesday 2pm.',
      });

      expect(conversation.summary).toContain('3-bed property');
      expect(conversation.summary).toContain('Viewing booked');
    });

    it('should track conversation intent', async () => {
      const conversation = await Conversation.create({
        agentId: testAgent._id,
        leadId: testLead._id,
        channel: 'phone',
        intent: {
          primary: 'booking',
          confidence: 0.95,
        },
      });

      expect(conversation.intent.primary).toBe('booking');
      expect(conversation.intent.confidence).toBe(0.95);
    });
  });

  describe('Conversation Search', () => {
    beforeEach(async () => {
      // Create multiple conversations for search testing
      await Conversation.create([
        {
          agentId: testAgent._id,
          channel: 'webchat',
          startedAt: new Date('2025-10-15T09:00:00Z'),
          endedAt: new Date('2025-10-15T09:10:00Z'),
          outcome: 'lead_captured',
        },
        {
          agentId: testAgent._id,
          channel: 'phone',
          startedAt: new Date('2025-10-15T14:00:00Z'),
          endedAt: new Date('2025-10-15T14:05:00Z'),
          outcome: 'booking_made',
        },
        {
          agentId: testAgent._id,
          channel: 'whatsapp',
          startedAt: new Date('2025-10-16T10:00:00Z'),
        },
      ]);
    });

    it('should find conversations by channel', async () => {
      const phoneConvos = await Conversation.find({
        agentId: testAgent._id,
        channel: 'phone',
      });

      expect(phoneConvos.length).toBe(1);
      expect(phoneConvos[0].channel).toBe('phone');
    });

    it('should find conversations by outcome', async () => {
      const leadCaptured = await Conversation.find({
        agentId: testAgent._id,
        outcome: 'lead_captured',
      });

      expect(leadCaptured.length).toBe(1);
      expect(leadCaptured[0].outcome).toBe('lead_captured');
    });

    it('should find conversations by date range', async () => {
      const oct15 = await Conversation.find({
        agentId: testAgent._id,
        startedAt: {
          $gte: new Date('2025-10-15T00:00:00Z'),
          $lt: new Date('2025-10-16T00:00:00Z'),
        },
      });

      expect(oct15.length).toBe(2);
    });

    it('should find active conversations (no endedAt)', async () => {
      const active = await Conversation.find({
        agentId: testAgent._id,
        endedAt: null,
      });

      expect(active.length).toBe(1);
      expect(active[0].channel).toBe('whatsapp');
    });
  });

  describe('Escalation Tracking', () => {
    it('should track escalation requests', async () => {
      const conversation = await Conversation.create({
        agentId: testAgent._id,
        leadId: testLead._id,
        channel: 'phone',
        escalation: {
          required: true,
          requestedAt: new Date(),
          reason: 'Customer wants to speak to manager',
        },
      });

      expect(conversation.escalation.required).toBe(true);
      expect(conversation.escalation.reason).toContain('manager');
    });
  });
});
