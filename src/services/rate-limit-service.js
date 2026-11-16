const TokenBucket = require('../domain/token-bucket');

class RateLimitService {
  constructor({ configurations, bucketStore, clock }) {
    if (!Array.isArray(configurations)) {
      throw new TypeError('configurations must be an array');
    }
    if (!bucketStore) {
      throw new TypeError('bucketStore is required');
    }
    if (typeof clock !== 'function') {
      throw new TypeError('clock must be a function');
    }

    this.bucketStore = bucketStore;
    this.configurations = new Map();

    configurations.forEach((config) => {
      this.configurations.set(config.endpoint, config);
      this.bucketStore.set(
        config.endpoint,
        new TokenBucket({
          capacity: config.burst,
          refillPerMinute: config.sustained,
          now: clock
        })
      );
    });
  }

  take(endpoint) {
    const config = this.configurations.get(endpoint);

    if (!config) {
      return { found: false };
    }

    const bucket = this.bucketStore.get(endpoint);
    const outcome = bucket.take();

    return {
      found: true,
      endpoint,
      accepted: outcome.accepted,
      remainingTokens: outcome.remainingTokens
    };
  }
}

module.exports = RateLimitService;
