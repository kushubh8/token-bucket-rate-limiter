const express = require('express');

function createRoutes(controller) {
  const router = express.Router();
  router.post('/take/', controller.take);
  return router;
}

module.exports = createRoutes;
