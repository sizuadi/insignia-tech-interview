import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await prisma.$transaction([
      prisma.taskLog.findMany({
        where: { task: { userId: req.userId } },
        include: { task: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.taskLog.count({ where: { task: { userId: req.userId } } }),
    ]);

    res.json({
      success: true,
      data: logs,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

export const getLogsByTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.taskId, userId: req.userId },
    });
    if (!task) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
      return;
    }

    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip  = (page - 1) * limit;

    const [logs, total] = await prisma.$transaction([
      prisma.taskLog.findMany({
        where: { taskId: req.params.taskId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.taskLog.count({ where: { taskId: req.params.taskId } }),
    ]);

    res.json({
      success: true,
      data: logs,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

