class TokenBucket {
  constructor({ capacity, refillPerMinute, now }) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new TypeError('capacity must be a positive integer');
    }
    if (typeof refillPerMinute !== 'number' ||
        !Number.isFinite(refillPerMinute) ||
        refillPerMinute < 0) {
      throw new TypeError('refillPerMinute must be a finite non-negative number');
    }
    if (typeof now !== 'function') {
      throw new TypeError('now must be a function');
    }

    this.capacity = capacity;
    this.refillPerMillisecond = refillPerMinute / 60000;
    this.now = now;
    this.tokens = capacity;
    this.lastRefillAt = now();
  }

  refill() {
    const currentTime = this.now();
    // A monotonic clock should never move backwards. Clamp defensively regardless.
    const elapsed = Math.max(0, currentTime - this.lastRefillAt);

    if (elapsed > 0 && this.refillPerMillisecond > 0) {
      this.tokens = Math.min(
        this.capacity,
        this.tokens + elapsed * this.refillPerMillisecond
      );
    }

    // Advance the timestamp even when full, so time spent at capacity is not
    // incorrectly accumulated as future refill credit.
    this.lastRefillAt = Math.max(this.lastRefillAt, currentTime);
  }

  take() {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return {
        accepted: true,
        remainingTokens: Math.floor(this.tokens)
      };
    }

    return {
      accepted: false,
      remainingTokens: 0
    };
  }

  getAvailableTokens() {
    this.refill();
    return this.tokens;
  }
}

module.exports = TokenBucket;
