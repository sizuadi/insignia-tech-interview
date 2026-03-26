import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || 'fallback_access_secret',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'fallback_refresh_secret',
  accessTokenExpiry: '15m' as const,
  refreshTokenExpiry: '7d' as const,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  databaseUrl: process.env.DATABASE_URL || '',
};
