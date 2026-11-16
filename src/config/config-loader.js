const fs = require('fs');
const path = require('path');

class ConfigLoader {
  constructor(configPath) {
    this.configPath = configPath || path.resolve(process.cwd(), 'config.json');
  }

  load() {
    let raw;

    try {
      raw = fs.readFileSync(this.configPath, 'utf8');
    } catch (error) {
      throw new Error(`Unable to read configuration at ${this.configPath}: ${error.message}`);
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Invalid JSON in configuration: ${error.message}`);
    }

    return this.validate(parsed);
  }

  validate(config) {
    if (!config || !Array.isArray(config.rateLimitsPerEndpoint)) {
      throw new Error('Configuration must contain a rateLimitsPerEndpoint array');
    }

    const seen = new Set();

    const rateLimitsPerEndpoint = config.rateLimitsPerEndpoint.map((item, index) => {
      if (!item || typeof item.endpoint !== 'string' || !item.endpoint.trim()) {
        throw new Error(`Invalid endpoint at rateLimitsPerEndpoint[${index}]`);
      }

      if (seen.has(item.endpoint)) {
        throw new Error(`Duplicate endpoint configuration: ${item.endpoint}`);
      }
      seen.add(item.endpoint);

      if (!Number.isInteger(item.burst) || item.burst <= 0) {
        throw new Error(`burst must be a positive integer for ${item.endpoint}`);
      }

      if (typeof item.sustained !== 'number' ||
          !Number.isFinite(item.sustained) ||
          item.sustained < 0) {
        throw new Error(`sustained must be a finite non-negative number for ${item.endpoint}`);
      }

      return Object.freeze({
        endpoint: item.endpoint,
        burst: item.burst,
        sustained: item.sustained
      });
    });

    return Object.freeze({ rateLimitsPerEndpoint: Object.freeze(rateLimitsPerEndpoint) });
  }
}

module.exports = ConfigLoader;
