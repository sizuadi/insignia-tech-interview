import cron from 'node-cron';
import prisma from '../config/prisma';
import { sendDiscordWebhook } from '../services/discord.service';
import { webhookQueue } from '../services/retry.service';
import { LogStatus, TaskStatus } from '@prisma/client';
import { DiscordWebhookPayload } from '../services/discord.service';

const scheduledJobs = new Map<string, cron.ScheduledTask>();

const executeTask = async (taskId: string): Promise<void> => {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.status !== TaskStatus.ACTIVE) return;

  const result = await sendDiscordWebhook(task.webhookUrl, task.payloadJson as DiscordWebhookPayload);

  await prisma.taskLog.create({
    data: {
      taskId,
      executionTime: new Date(),
      status: result.success ? LogStatus.SUCCESS : LogStatus.FAILED,
      retryCount: 0,
      message: result.message,
    },
  });

  if (!result.success && task.maxRetry > 0) {
    await webhookQueue.add(
      `retry-${taskId}-1`,
      {
        taskId,
        webhookUrl: task.webhookUrl,
        payload: task.payloadJson as DiscordWebhookPayload,
        attempt: 1,
        maxRetry: task.maxRetry,
      },
      { delay: 1000 }
    );
  }
};

export const scheduleTask = (taskId: string, schedule: string): void => {
  if (scheduledJobs.has(taskId)) {
    scheduledJobs.get(taskId)?.stop();
    scheduledJobs.delete(taskId);
  }

  if (!cron.validate(schedule)) {
    console.warn(`Invalid cron expression for task ${taskId}: ${schedule}`);
    return;
  }

  const job = cron.schedule(schedule, () => executeTask(taskId), { timezone: 'UTC' });
  scheduledJobs.set(taskId, job);
  console.log(`Scheduled task ${taskId} with cron: ${schedule}`);
};

export const removeTask = (taskId: string): void => {
  const job = scheduledJobs.get(taskId);
  if (job) {
    job.stop();
    scheduledJobs.delete(taskId);
    console.log(`Removed scheduled task ${taskId}`);
  }
};

export const initScheduler = async (): Promise<void> => {
  const activeTasks = await prisma.task.findMany({
    where: { status: TaskStatus.ACTIVE },
    select: { id: true, schedule: true },
  });

  for (const task of activeTasks) {
    scheduleTask(task.id, task.schedule);
  }

  console.log(`Scheduler initialized with ${activeTasks.length} active tasks`);
};
