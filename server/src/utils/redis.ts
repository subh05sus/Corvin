import { createClient } from 'redis';
import { config } from '../config';

// REDIS_URL takes precedence (supports rediss:// for TLS on managed services like Railway/Upstash)
const redisUrl = config.redis_url ||
  (config.redis_username && config.redis_password
    ? `redis://${config.redis_username}:${config.redis_password}@${config.redis_host}:${config.redis_port}`
    : `redis://${config.redis_host}:${config.redis_port}`);

const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

redisClient.connect();

export default redisClient;
