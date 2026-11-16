class RateLimitController {
  constructor(rateLimitService) {
    this.rateLimitService = rateLimitService;
    this.take = this.take.bind(this);
  }

  take(req, res) {
    const endpoint = req.body && req.body.endpoint;

    if (typeof endpoint !== 'string' || !endpoint.trim()) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ENDPOINT',
          message: 'Request body must contain a non-empty endpoint string'
        }
      });
    }

    const outcome = this.rateLimitService.take(endpoint);

    if (!outcome.found) {
      return res.status(404).json({
        error: {
          code: 'UNKNOWN_ENDPOINT',
          message: `No rate limit is configured for endpoint: ${endpoint}`
        }
      });
    }

    res.set('Cache-Control', 'no-store');
    return res.status(200).json({
      remainingTokens: outcome.remainingTokens,
      accepted: outcome.accepted
    });
  }
}

module.exports = RateLimitController;
