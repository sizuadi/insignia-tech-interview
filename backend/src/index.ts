import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { initScheduler } from './scheduler/scheduler';
import { createWebhookWorker } from './services/retry.service';
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/tasks.routes';
import logRoutes from './routes/logs.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(errorMiddleware);

const start = async (): Promise<void> => {
  await initScheduler();

  try {
    createWebhookWorker();
    console.log('BullMQ retry worker started');
  } catch (err) {
    console.warn('Redis unavailable — retry worker not started. Tasks will still execute but retries are disabled.');
  }

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
  });
};

start().catch(console.error);

export default app;
