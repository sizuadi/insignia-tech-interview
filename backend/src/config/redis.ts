import IORedis from 'ioredis';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) {
      console.warn('Redis unavailable — retry queue disabled');
      return null; // stop retrying
    }
    return Math.min(times * 500, 2000);
  },
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => {
  if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
    // Suppress repeated connection refused noise; already warned above
    return;
  }
  console.error('Redis error:', err);
});

export default redis;
