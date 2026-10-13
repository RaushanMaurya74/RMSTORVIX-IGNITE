// RMSTORVIX IGNITE — Vercel Serverless Function Entry Point
// Dispatches incoming HTTP requests through the application request pipeline

const { handleRequest } = require('../server/server.js');

module.exports = async (req, res) => {
  try {
    // If Vercel rewrote the request to /api, recover the client's actual requested pathname
    let clientUrl = req.url;
    if (clientUrl === '/api' || clientUrl === '/api/' || clientUrl === '/api/index') {
      const originalPath = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'];
      clientUrl = originalPath || '/';
    }
    req.url = clientUrl;

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
