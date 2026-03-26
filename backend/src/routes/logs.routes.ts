import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getLogs, getLogsByTask } from '../controllers/logs.controller';

const router = Router();

router.use(authMiddleware);
router.get('/', getLogs);
router.get('/:taskId', getLogsByTask);

export default router;
