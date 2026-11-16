const { expect } = require('chai');
const RateLimitService = require('../src/services/rate-limit-service');
const InMemoryBucketStore = require('../src/infrastructure/in-memory-bucket-store');

describe('RateLimitService', () => {
  it('creates independent buckets per endpoint', () => {
    let time = 0;
    const service = new RateLimitService({
      configurations: [
        { endpoint: 'GET /a', burst: 1, sustained: 0 },
        { endpoint: 'GET /b', burst: 2, sustained: 0 }
      ],
      bucketStore: new InMemoryBucketStore(),
      clock: () => time
    });

    expect(service.take('GET /a').accepted).to.equal(true);
    expect(service.take('GET /a').accepted).to.equal(false);

    // Consume only once
    const resultB = service.take('GET /b');
    expect(resultB.accepted).to.equal(true);
    expect(resultB.remainingTokens).to.equal(1);
  });

  it('returns not-found for an unconfigured endpoint', () => {
    const service = new RateLimitService({
      configurations: [],
      bucketStore: new InMemoryBucketStore(),
      clock: () => 0
    });

    expect(service.take('GET /missing')).to.deep.equal({ found: false });
  });
});
