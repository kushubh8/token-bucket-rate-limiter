const express = require('express');
const RateLimitController = require('./http/rate-limit-controller');
const createRoutes = require('./http/routes');

function createApp({ rateLimitService }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb', strict: true }));

  const controller = new RateLimitController(rateLimitService);
  app.use('/', createRoutes(controller));

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found'
      }
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return res.status(400).json({
        error: {
          code: 'INVALID_JSON',
          message: 'Request body must be valid JSON'
        }
      });
    }

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  });

  return app;
}

module.exports = createApp;
