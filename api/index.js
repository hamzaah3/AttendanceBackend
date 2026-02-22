/**
 * Vercel serverless entry: all requests are rewritten to /api, so this handler
 * receives them and passes to the Express app.
 */
const app = require('../app');
module.exports = app;
