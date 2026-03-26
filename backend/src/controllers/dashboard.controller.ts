import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [total, active, paused, failed, recentLogs] = await prisma.$transaction([
      prisma.task.count({ where: { userId: req.userId } }),
      prisma.task.count({ where: { userId: req.userId, status: 'ACTIVE' } }),
      prisma.task.count({ where: { userId: req.userId, status: 'PAUSED' } }),
      prisma.task.count({ where: { userId: req.userId, status: 'FAILED' } }),
      prisma.taskLog.findMany({
        where: { task: { userId: req.userId } },
        include: { task: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    res.json({
      success: true,
      data: {
        summary: { total, active, paused, failed },
        recentLogs,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

