import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { scheduleTask, removeTask } from '../scheduler/scheduler';
import { TaskStatus } from '@prisma/client';

export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const search = (req.query.search as string)?.trim() || '';
    const skip  = (page - 1) * limit;

    const where = {
      userId: req.userId,
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    };

    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.task.count({ where }),
    ]);

    res.json({
      success: true,
      data: tasks,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

export const getTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!task) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
      return;
    }
    res.json({ success: true, data: task });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, schedule, webhookUrl, payloadJson, maxRetry } = req.body;

    if (!name || !schedule || !webhookUrl || !payloadJson) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name, schedule, webhookUrl, and payloadJson are required' } });
      return;
    }

    const task = await prisma.task.create({
      data: {
        userId: req.userId!,
        name,
        schedule,
        webhookUrl,
        payloadJson,
        maxRetry: maxRetry ?? 3,
        status: TaskStatus.ACTIVE,
      },
    });

    scheduleTask(task.id, task.schedule);
    res.status(201).json({ success: true, message: 'Task created successfully', data: task });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
      return;
    }

    const { name, schedule, webhookUrl, payloadJson, maxRetry } = req.body;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(schedule && { schedule }),
        ...(webhookUrl && { webhookUrl }),
        ...(payloadJson && { payloadJson }),
        ...(maxRetry !== undefined && { maxRetry }),
      },
    });

    if (schedule && task.status === TaskStatus.ACTIVE) {
      scheduleTask(task.id, task.schedule);
    }

    res.json({ success: true, message: 'Task updated successfully', data: task });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
      return;
    }

    removeTask(req.params.id);
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

export const toggleTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
      return;
    }

    const newStatus =
      existing.status === TaskStatus.ACTIVE ? TaskStatus.PAUSED : TaskStatus.ACTIVE;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { status: newStatus },
    });

    if (newStatus === TaskStatus.ACTIVE) {
      scheduleTask(task.id, task.schedule);
    } else {
      removeTask(task.id);
    }

    const label = newStatus === TaskStatus.ACTIVE ? 'resumed' : 'paused';
    res.json({ success: true, message: `Task ${label} successfully`, data: task });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

