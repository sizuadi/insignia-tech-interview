import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import taskRoutes from '../routes/tasks.routes';
import { errorMiddleware } from '../middleware/error.middleware';

jest.mock('../config/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    task: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));
jest.mock('../scheduler/scheduler', () => ({
  scheduleTask: jest.fn(),
  removeTask: jest.fn(),
}));

import prisma from '../config/prisma';

const app = express();
app.use(express.json());
app.use('/api/tasks', taskRoutes);
app.use(errorMiddleware);

const validToken = jwt.sign({ userId: 'user-1', username: 'testuser' }, config.accessTokenSecret);
const authHeader = { Authorization: `Bearer ${validToken}` };

describe('Tasks CRUD API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/tasks', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(401);
    });

    it('should return tasks list', async () => {
      const mockTasks = [{ id: 'task-1', name: 'Test', status: 'ACTIVE' }];
      (prisma.$transaction as jest.Mock).mockResolvedValueOnce([mockTasks, 1]);
      const res = await request(app).get('/api/tasks').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('POST /api/tasks', () => {
    it('should return 400 if required fields missing', async () => {
      const res = await request(app).post('/api/tasks').set(authHeader).send({ name: 'Only name' });
      expect(res.status).toBe(400);
    });

    it('should create a task', async () => {
      const mockTask = {
        id: 'task-1',
        name: 'My Task',
        schedule: '* * * * *',
        webhookUrl: 'https://discord.com/api/webhooks/test',
        payloadJson: { content: 'hello' },
        status: 'ACTIVE',
      };
      (prisma.task.create as jest.Mock).mockResolvedValueOnce(mockTask);
      const res = await request(app)
        .post('/api/tasks')
        .set(authHeader)
        .send({
          name: 'My Task',
          schedule: '* * * * *',
          webhookUrl: 'https://discord.com/api/webhooks/test',
          payloadJson: { content: 'hello' },
        });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('My Task');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should return 404 if task not found', async () => {
      (prisma.task.findFirst as jest.Mock).mockResolvedValueOnce(null);
      const res = await request(app).delete('/api/tasks/nonexistent').set(authHeader);
      expect(res.status).toBe(404);
    });

    it('should delete task successfully', async () => {
      (prisma.task.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'task-1' });
      (prisma.task.delete as jest.Mock).mockResolvedValueOnce({});
      const res = await request(app).delete('/api/tasks/task-1').set(authHeader);
      expect(res.status).toBe(200);
    });
  });
});
