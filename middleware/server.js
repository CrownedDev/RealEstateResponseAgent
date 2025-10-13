const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Install: npm install express-mongo-sanitize xss-clean

// Sanitize data
app.use(mongoSanitize()); // Prevent MongoDB injection
app.use(xss()); // Prevent XSS attacks