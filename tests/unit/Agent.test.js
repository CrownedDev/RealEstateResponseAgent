const mongoose = require('mongoose');
const Agent = require('../../src/models/Agent');

describe('Agent Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Agent.deleteMany({});
  });

  it('should create agent with auto-generated API key', async () => {
    const agent = await Agent.create({
      companyName: 'Test Estate Agents',
      email: 'test@example.com',
      phone: '07700900123',
    });

    expect(agent.apiKey).toBeDefined();
    expect(agent.apiKey).toMatch(/^rr_[a-f0-9]{64}$/);
    expect(agent.slug).toBe('test-estate-agents');
  });

  it('should auto-generate slug from company name', async () => {
    const agent = await Agent.create({
      companyName: 'Smith & Sons Estate Agents',
      email: 'smith@example.com',
      phone: '07700900456',
    });

    expect(agent.slug).toBe('smith-sons-estate-agents');
  });

  it('should require companyName', async () => {
    const agent = new Agent({
      email: 'test@example.com',
      phone: '07700900123',
    });

    await expect(agent.save()).rejects.toThrow();
  });
});
