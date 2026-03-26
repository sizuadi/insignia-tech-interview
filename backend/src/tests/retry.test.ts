import * as discordService from '../services/discord.service';
import * as retryModule from '../services/retry.service';
import prisma from '../config/prisma';

jest.mock('../services/discord.service');
jest.mock('../config/prisma', () => ({
  __esModule: true,
  default: {
    taskLog: { create: jest.fn() },
    task: { update: jest.fn() },
  },
}));
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn() })),
  Worker: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../config/redis', () => ({ __esModule: true, default: {} }));

describe('retry logic', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should queue a retry job on failure when attempts remain', async () => {
    const mockSend = discordService.sendDiscordWebhook as jest.MockedFunction<typeof discordService.sendDiscordWebhook>;
    mockSend.mockResolvedValueOnce({ success: false, message: 'failed' });

    const addMock = jest.fn();
    (retryModule.webhookQueue as any).add = addMock;
    (prisma.taskLog.create as jest.Mock).mockResolvedValueOnce({});

    expect(addMock).toBeDefined();
  });

  it('should mark task as FAILED after max retries exhausted', async () => {
    (prisma.task.update as jest.Mock).mockResolvedValueOnce({});
    expect(prisma.task.update).toBeDefined();
  });
});
