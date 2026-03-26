import { scheduleTask, removeTask } from '../scheduler/scheduler';
import * as discordService from '../services/discord.service';
import * as retryService from '../services/retry.service';
import prisma from '../config/prisma';

jest.mock('../config/prisma', () => ({
  __esModule: true,
  default: {
    task: { findUnique: jest.fn() },
    taskLog: { create: jest.fn() },
  },
}));
jest.mock('../services/discord.service');
jest.mock('../services/retry.service', () => ({
  webhookQueue: { add: jest.fn() },
}));
jest.mock('node-cron', () => ({
  validate: jest.fn().mockReturnValue(true),
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

describe('scheduler', () => {
  it('should schedule a valid cron task without errors', () => {
    expect(() => scheduleTask('task-1', '* * * * *')).not.toThrow();
  });

  it('should remove a scheduled task without errors', () => {
    scheduleTask('task-2', '*/5 * * * *');
    expect(() => removeTask('task-2')).not.toThrow();
  });

  it('should replace an existing job when rescheduling', () => {
    scheduleTask('task-3', '* * * * *');
    scheduleTask('task-3', '*/10 * * * *');
    expect(() => removeTask('task-3')).not.toThrow();
  });
});
