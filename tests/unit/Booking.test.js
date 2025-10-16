const mongoose = require('mongoose');
const Booking = require('../../src/models/Booking');
const Agent = require('../../src/models/Agent');
const Property = require('../../src/models/Property');
const Lead = require('../../src/models/Lead');

describe('Booking Model', () => {
  let testAgent;
  let testProperty;
  let testLead;

  beforeEach(async () => {
    await Booking.deleteMany({});
    await Lead.deleteMany({});
    await Property.deleteMany({});
    await Agent.deleteMany({});

    testAgent = await Agent.create({
      companyName: 'Test Agent for Bookings',
      email: 'bookingtest@example.com',
      phone: '07700900777',
    });

    testProperty = await Property.create({
      agentId: testAgent._id,
      title: 'Test Property',
      description: 'A test property',
      externalRef: 'BOOK001',
      type: 'house',
      bedrooms: 3,
      bathrooms: 2,
      price: {
        amount: 500000,
        currency: 'GBP',
      },
      address: {
        line1: '123 Test Street',
        city: 'London',
        postcode: 'SW1A 1AA',
      },
    });

    testLead = await Lead.create({
      agentId: testAgent._id,
      contact: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '07700900456',
        email: 'john@example.com',
      },
      source: {
        channel: 'webchat',
      },
    });
  });

  afterEach(async () => {
    await Booking.deleteMany({});
    await Lead.deleteMany({});
    await Property.deleteMany({});
    await Agent.deleteMany({});
  });

  describe('Booking Creation', () => {
    it('should create a booking with required fields', async () => {
      const scheduledDate = new Date('2025-12-01T10:00:00Z');

      const booking = await Booking.create({
        agentId: testAgent._id,
        propertyId: testProperty._id,
        leadId: testLead._id,
        type: 'viewing',
        scheduledDate,
        duration: 30,
        customer: {
          name: 'John Doe',
          phone: '07700900456',
          email: 'john@example.com',
        },
      });

      expect(booking.type).toBe('viewing');
      expect(booking.duration).toBe(30);
      expect(booking.status).toBe('pending');
      expect(booking.customer.name).toBe('John Doe');
    });

    it('should require agentId', async () => {
      const booking = new Booking({
        propertyId: testProperty._id,
        type: 'viewing',
        scheduledDate: new Date(),
        customer: { name: 'Test', phone: '123456' },
      });

      await expect(booking.save()).rejects.toThrow();
    });

    it('should require propertyId', async () => {
      const booking = new Booking({
        agentId: testAgent._id,
        type: 'viewing',
        scheduledDate: new Date(),
        customer: { name: 'Test', phone: '123456' },
      });

      await expect(booking.save()).rejects.toThrow();
    });

    it('should require scheduledDate', async () => {
      const booking = new Booking({
        agentId: testAgent._id,
        propertyId: testProperty._id,
        type: 'viewing',
        customer: { name: 'Test', phone: '123456' },
      });

      await expect(booking.save()).rejects.toThrow();
    });

    it('should require customer name', async () => {
      const booking = new Booking({
        agentId: testAgent._id,
        propertyId: testProperty._id,
        type: 'viewing',
        scheduledDate: new Date(),
        customer: { phone: '123456' },
      });

      await expect(booking.save()).rejects.toThrow();
    });

    it('should require customer phone', async () => {
      const booking = new Booking({
        agentId: testAgent._id,
        propertyId: testProperty._id,
        type: 'viewing',
        scheduledDate: new Date(),
        customer: { name: 'Test' },
      });

      await expect(booking.save()).rejects.toThrow();
    });

    it('should default duration to 30 minutes', async () => {
      const booking = await Booking.create({
        agentId: testAgent._id,
        propertyId: testProperty._id,
        type: 'viewing',
        scheduledDate: new Date('2025-12-01T10:00:00Z'),
        customer: { name: 'Test', phone: '123456' },
      });

      expect(booking.duration).toBe(30);
    });

    it('should validate booking type', async () => {
      const booking = new Booking({
        agentId: testAgent._id,
        propertyId: testProperty._id,
        type: 'invalid-type',
        scheduledDate: new Date(),
        customer: { name: 'Test', phone: '123456' },
      });

      await expect(booking.save()).rejects.toThrow();
    });
  });

  describe('End Date Calculation', () => {
    it('should automatically calculate endDate on save', async () => {
      const scheduledDate = new Date('2025-12-01T10:00:00Z');

      const booking = await Booking.create({
        agentId: testAgent._id,
        propertyId: testProperty._id,
        type: 'viewing',
        scheduledDate,
        duration: 45,
        customer: { name: 'Test', phone: '123456' },
      });

      const expectedEndDate = new Date(scheduledDate.getTime() + 45 * 60000);
      expect(booking.endDate.getTime()).toBe(expectedEndDate.getTime());
    });

    it('should recalculate endDate when duration changes', async () => {
      const scheduledDate = new Date('2025-12-01T10:00:00Z');

      const booking = await Booking.create({
        agentId: testAgent._id,
        propertyId: testProperty._id,
        type: 'viewing',
        scheduledDate,
        duration: 30,
        customer: { name: 'Test', phone: '123456' },
      });

      booking.duration = 60;
      await booking.save();

      const expectedEndDate = new Date(scheduledDate.getTime() + 60 * 60000);
      expect(booking.endDate.getTime()).toBe(expectedEndDate.getTime());
    });
  });

  describe('Conflict Detection', () => {
    it('should detect no conflict for non-overlapping bookings', async () => {
      // Create first booking 10:00-10:30
      await Booking.create({
        agentId: testAgent._id,
        propertyId: testProperty._id,
        type: 'viewing',
        scheduledDate: new Date('2025-12-01T10:00:00Z'),
        duration: 30,
        customer: { name: 'Test1', phone: '123456' },
      });

      // Create second booking 11:00-11:30 (no overlap)
      const booking2 = new Booking({
        agentId: testAgent._id,
        propertyId: testProperty._id,
        type: 'viewing',
        scheduledDate: new Date('2025-12-01T11:00:00Z'),
        duration: 30,
        customer: { name: 'Test2', phone: '123456' },
      });

      // Calculate endDate for conflict check
      booking2.endDate = new Date(
        booking2.scheduledDate.getTime() + booking2.duration * 60000
      );

      const hasConflict = await booking2.hasConflict();
      expect(hasConflict).toBe(false); // No conflict = false
    });

    it('should detect conflict for overlapping bookings', async () => {
      // Create first booking 10:00-10:30
      await Booking.create({
        agentId: testAgent._id,
        propertyId: testProperty._id,
        type: 'viewing',
        scheduledDate: new Date('2025-12-01T10:00:00Z'),
        duration: 30,
        customer: { name: 'Test1', phone: '123456' },
      });

      // Try overlapping booking 10:15-10:45
      const booking2 = new Booking({
        agentId: testAgent._id,
        propertyId: testProperty._id,
        type: 'viewing',
        scheduledDate: new Date('2025-12-01T10:15:00Z'),
        duration: 30,
        customer: { name: 'Test2', phone: '123456' },
      });

      booking2.endDate = new Date(
        booking2.scheduledDate.getTime() + booking2.duration * 60000
      );

      const hasConflict = await booking2.hasConflict();
      expect(hasConflict).toBe(true); // Conflict exists = true
    });
  });

  describe('Booking Status', () => {
    it('should default to pending status', async () => {
      const booking = await Booking.create({
        agentId: testAgent._id,
        propertyId: testProperty._id,
        type: 'viewing',
        scheduledDate: new Date('2025-12-01T10:00:00Z'),
        customer: { name: 'Test', phone: '123456' },
      });

      expect(booking.status).toBe('pending');
    });

    it('should accept valid status values', async () => {
      const statuses = [
        'pending',
        'confirmed',
        'completed',
        'cancelled',
        'no-show',
      ];

      for (const status of statuses) {
        const booking = await Booking.create({
          agentId: testAgent._id,
          propertyId: testProperty._id,
          type: 'viewing',
          scheduledDate: new Date(
            `2025-12-01T${10 + statuses.indexOf(status)}:00:00Z`
          ),
          customer: { name: `Test${status}`, phone: '123456' },
          status,
        });

        expect(booking.status).toBe(status);
      }
    });
  });
});
