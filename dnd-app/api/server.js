// api/server.js — Vercel serverless entry point
// Vercel looks for files inside /api and calls them as serverless functions.
// We just re-export the Express app; Vercel wraps it automatically.
module.exports = require('../server/index.js');
