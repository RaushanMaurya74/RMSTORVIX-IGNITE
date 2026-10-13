// RMSTORVIX IGNITE — Vercel Serverless Function Entry Point
// Dispatches incoming HTTP requests through the application request pipeline

const { handleRequest } = require('../server/server.js');

module.exports = async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (err) {
    console.error('[RMSTORVIX IGNITE] Vercel Serverless unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        error: 'Internal Server Error',
        message: err.message,
        app: 'RMSTORVIX IGNITE'
      }));
    }
  }
};
