const { expect } = require('chai');
const http = require('http');
const createApp = require('../src/app');
const RateLimitService = require('../src/services/rate-limit-service');
const InMemoryBucketStore = require('../src/infrastructure/in-memory-bucket-store');

function request(port, method, requestPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: requestPath,
      method,
      headers: payload ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      } : {}
    }, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: responseBody ? JSON.parse(responseBody) : null
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe('HTTP API', () => {
  let server;
  let port;

  beforeEach((done) => {
    const service = new RateLimitService({
      configurations: [{ endpoint: 'GET /users/:id', burst: 1, sustained: 0 }],
      bucketStore: new InMemoryBucketStore(),
      clock: () => 0
    });
    server = createApp({ rateLimitService: service }).listen(0, () => {
      port = server.address().port;
      done();
    });
  });

  afterEach((done) => server.close(done));

  it('consumes a token and returns the remaining count', async () => {
    const response = await request(port, 'POST', '/take/', {
      endpoint: 'GET /users/:id'
    });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ remainingTokens: 0, accepted: true });
  });

  it('rejects when no tokens remain', async () => {
    await request(port, 'POST', '/take/', { endpoint: 'GET /users/:id' });
    const response = await request(port, 'POST', '/take/', {
      endpoint: 'GET /users/:id'
    });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ remainingTokens: 0, accepted: false });
  });

  it('validates missing endpoint', async () => {
    const response = await request(port, 'POST', '/take/', {});
    expect(response.status).to.equal(400);
  });

  it('returns 404 for unknown endpoint keys', async () => {
    const response = await request(port, 'POST', '/take/', {
      endpoint: 'GET /unknown'
    });
    expect(response.status).to.equal(404);
  });
});
