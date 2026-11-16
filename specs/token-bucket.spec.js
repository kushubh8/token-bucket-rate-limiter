const { expect } = require('chai');
const TokenBucket = require('../src/domain/token-bucket');

describe('TokenBucket', () => {
  let time;
  let bucket;

  beforeEach(() => {
    time = 1000;
    bucket = new TokenBucket({
      capacity: 3,
      refillPerMinute: 120,
      now: () => time
    });
  });

  it('starts full and consumes one token per accepted request', () => {
    expect(bucket.take()).to.deep.equal({ accepted: true, remainingTokens: 2 });
    expect(bucket.take()).to.deep.equal({ accepted: true, remainingTokens: 1 });
    expect(bucket.take()).to.deep.equal({ accepted: true, remainingTokens: 0 });
  });

  it('rejects when the bucket is empty', () => {
    bucket.take();
    bucket.take();
    bucket.take();

    expect(bucket.take()).to.deep.equal({ accepted: false, remainingTokens: 0 });
  });

  it('refills one token every 500 milliseconds at 120 per minute', () => {
    bucket.take();
    bucket.take();
    bucket.take();

    time += 499;
    expect(bucket.take().accepted).to.equal(false);

    time += 1;
    expect(bucket.take()).to.deep.equal({ accepted: true, remainingTokens: 0 });
  });

  it('does not exceed burst capacity', () => {
    time += 60000;
    expect(bucket.getAvailableTokens()).to.equal(3);
  });

  it('supports zero sustained refill', () => {
    const noRefillBucket = new TokenBucket({
      capacity: 1,
      refillPerMinute: 0,
      now: () => time
    });

    noRefillBucket.take();
    time += 60000;
    expect(noRefillBucket.take().accepted).to.equal(false);
  });

  it('preserves fractional refill progress', () => {
    bucket.take();
    bucket.take();
    bucket.take();

    time += 250;
    expect(bucket.getAvailableTokens()).to.be.closeTo(0.5, 0.000001);
    time += 250;
    expect(bucket.take().accepted).to.equal(true);
  });
});
