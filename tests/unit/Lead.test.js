const mongoose = require('mongoose');
const Lead = require('../../src/models/Lead');
const Agent = require('../../src/models/Agent');
const Property = require('../../src/models/Property');

describe('Lead Model', () => {
  let testAgent;
  let testProperty;

  beforeEach(async () => {
    // Clean up FIRST to ensure fresh state
    await Lead.deleteMany({});
    await Property.deleteMany({});
    await Agent.deleteMany({});

    // Then create fresh test data
    testAgent = await Agent.create({
      companyName: 'Test Agent for Leads',
      email: 'leadtest@example.com',
      phone: '07700900999',
    });

    testProperty = await Property.create({
      agentId: testAgent._id,
      title: 'Test Property',
      description: 'A beautiful test property for testing',
      externalRef: 'TEST123',
      address: {
        line1: '123 Test Street',
        city: 'London',
        postcode: 'SW1A 1AA',
      },
      type: 'house',
      bedrooms: 3,
      bathrooms: 2,
      price: {
        amount: 500000,
        currency: 'GBP',
      },
    });
  });

  afterEach(async () => {
    await Lead.deleteMany({});
    await Property.deleteMany({});
    await Agent.deleteMany({});
  });

  describe('Lead Scoring', () => {
    it('should calculate base score for minimal contact info', async () => {
      const lead = await Lead.create({
        agentId: testAgent._id,
        contact: {
          firstName: 'John',
          phone: '07700900456',
        },
        source: {
          channel: 'webchat',
        },
      });

      expect(lead.score.value).toBeGreaterThanOrEqual(30);
      expect(lead.score.value).toBeLessThanOrEqual(40);
    });

    it('should add points for complete contact information', async () => {
      const lead = await Lead.create({
        agentId: testAgent._id,
        contact: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@email.com',
          phone: '07700900456',
        },
        source: {
          channel: 'webchat',
        },
      });

      expect(lead.score.value).toBeGreaterThanOrEqual(50);
    });

    it('should add points for property interest', async () => {
      const lead = await Lead.create({
        agentId: testAgent._id,
        contact: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@email.com',
          phone: '07700900456',
        },
        propertyInterest: {
          propertyId: testProperty._id,
          propertyRef: 'TEST123',
        },
        source: {
          channel: 'webchat',
        },
      });

      expect(lead.score.value).toBeGreaterThanOrEqual(70);
    });

    it('should cap score at 100', async () => {
      const lead = await Lead.create({
        agentId: testAgent._id,
        contact: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@email.com',
          phone: '07700900456',
        },
        propertyInterest: {
          propertyId: testProperty._id,
          propertyRef: 'TEST123',
        },
        financials: {
          mortgageApproval: 'approved',
          budget: 800000,
        },
        timeline: 'immediate',
        source: {
          channel: 'webchat',
        },
      });

      expect(lead.score.value).toBeLessThanOrEqual(100);
    });
  });

  describe('Lead Priority', () => {
    it('should set high priority for score >= 75', async () => {
      const lead = await Lead.create({
        agentId: testAgent._id,
        contact: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@email.com',
          phone: '07700900456',
        },
        propertyInterest: {
          propertyId: testProperty._id,
          propertyRef: 'TEST123',
        },
        financials: {
          mortgageApproval: 'approved',
          budget: 800000,
        },
        timeline: 'short-term',
        source: {
          channel: 'webchat',
        },
      });
      expect(lead.score.value).toBeGreaterThanOrEqual(75);

      expect(lead.priority).toBe('high');
    });

    it('should set medium priority for score 50-74', async () => {
      const lead = await Lead.create({
        agentId: testAgent._id,
        contact: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@email.com',
          phone: '07700900456',
        },
        source: {
          channel: 'webchat',
        },
      });

      expect(lead.priority).toBe('medium');
    });

    it('should set low priority for score < 50', async () => {
      const lead = await Lead.create({
        agentId: testAgent._id,
        contact: {
          firstName: 'John',
          phone: '07700900456',
        },
        source: {
          channel: 'webchat',
        },
      });

      // With minimal info, score should be < 50
      expect(lead.score.value).toBeLessThan(50);
      expect(lead.priority).toBe('low');
    });
    it('should set urgent priority for immediate timeline + high score', async () => {
      const lead = await Lead.create({
        agentId: testAgent._id,
        contact: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@email.com',
          phone: '07700900456',
        },
        propertyInterest: {
          propertyId: testProperty._id,
          propertyRef: 'TEST123',
        },
        financials: {
          mortgageApproval: 'approved',
          budget: 800000,
        },
        timeline: 'immediate',
        source: {
          channel: 'webchat',
        },
      });

      expect(lead.score.value).toBeGreaterThanOrEqual(75);
      expect(lead.priority).toBe('urgent');
    });
  });
});
