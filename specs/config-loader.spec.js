const { expect } = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ConfigLoader = require('../src/config/config-loader');

describe('ConfigLoader', () => {
  let directory;
  let configPath;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rate-limiter-'));
    configPath = path.join(directory, 'config.json');
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('loads valid configuration', () => {
    fs.writeFileSync(configPath, JSON.stringify({
      rateLimitsPerEndpoint: [
        { endpoint: 'GET /users/:id', burst: 10, sustained: 60 }
      ]
    }));

    const config = new ConfigLoader(configPath).load();
    expect(config.rateLimitsPerEndpoint).to.have.length(1);
  });

  it('rejects duplicate endpoint configuration', () => {
    fs.writeFileSync(configPath, JSON.stringify({
      rateLimitsPerEndpoint: [
        { endpoint: 'GET /users', burst: 10, sustained: 60 },
        { endpoint: 'GET /users', burst: 20, sustained: 60 }
      ]
    }));

    expect(() => new ConfigLoader(configPath).load()).to.throw('Duplicate endpoint');
  });

  it('rejects invalid burst values', () => {
    fs.writeFileSync(configPath, JSON.stringify({
      rateLimitsPerEndpoint: [
        { endpoint: 'GET /users', burst: 0, sustained: 60 }
      ]
    }));

    expect(() => new ConfigLoader(configPath).load()).to.throw('burst');
  });
});
