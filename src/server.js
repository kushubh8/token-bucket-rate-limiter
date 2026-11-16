const { performance } = require('perf_hooks');
const ConfigLoader = require('./config/config-loader');
const InMemoryBucketStore = require('./infrastructure/in-memory-bucket-store');
const RateLimitService = require('./services/rate-limit-service');
const createApp = require('./app');

function buildApplication() {
  const configPath = process.env.RATE_LIMIT_CONFIG || undefined;
  const config = new ConfigLoader(configPath).load();

  const bucketStore = new InMemoryBucketStore();
  const rateLimitService = new RateLimitService({
    configurations: config.rateLimitsPerEndpoint,
    bucketStore,
    clock: () => performance.now()
  });

  return createApp({ rateLimitService });
}

if (require.main === module) {
  try {
    const app = buildApplication();
    const port = Number(process.env.PORT) || 3000;

    app.listen(port, () => {
      process.stdout.write(`Rate limiter listening on port ${port}\n`);
    });
  } catch (error) {
    process.stderr.write(`Startup failed: ${error.message}\n`);
    process.exit(1);
  }
}

module.exports = { buildApplication };
