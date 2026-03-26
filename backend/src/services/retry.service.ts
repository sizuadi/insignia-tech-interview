import { Queue, Worker, Job } from 'bullmq';
import redis from '../config/redis';
import prisma from '../config/prisma';
import { sendDiscordWebhook, DiscordWebhookPayload } from './discord.service';
import { LogStatus } from '@prisma/client';

export interface RetryJobData {
  taskId: string;
  webhookUrl: string;
  payload: DiscordWebhookPayload;
  attempt: number;
  maxRetry: number;
}

export const webhookQueue = new Queue<RetryJobData>('webhook-retry', {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

export const createWebhookWorker = (): Worker<RetryJobData> => {
  return new Worker<RetryJobData>(
    'webhook-retry',
    async (job: Job<RetryJobData>) => {
      const { taskId, webhookUrl, payload, attempt, maxRetry } = job.data;

      const result = await sendDiscordWebhook(webhookUrl, payload);

      await prisma.taskLog.create({
        data: {
          taskId,
          executionTime: new Date(),
          status: result.success ? LogStatus.SUCCESS : LogStatus.FAILED,
          retryCount: attempt,
          message: result.message,
        },
      });

      if (!result.success) {
        if (attempt < maxRetry) {
          const delay = Math.pow(2, attempt) * 1000;
          await webhookQueue.add(
            `retry-${taskId}-${attempt + 1}`,
            { taskId, webhookUrl, payload, attempt: attempt + 1, maxRetry },
            { delay }
          );
        } else {
          await prisma.task.update({
            where: { id: taskId },
            data: { status: 'FAILED' },
          });
        }
        throw new Error(result.message);
      }
    },
    { connection: redis }
  );
};
