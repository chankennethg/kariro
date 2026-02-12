import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from './env.js';

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const aiQueue = new Queue('ai-jobs', { connection });
