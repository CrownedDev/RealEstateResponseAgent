require('dotenv').config();
const mongoose = require('mongoose');

// Global setup - runs once before all tests
beforeAll(async () => {
  // Only connect if not already connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
}, 30000);

// Global teardown - runs once after all tests
afterAll(async () => {
  await mongoose.connection.close();
}, 30000);
