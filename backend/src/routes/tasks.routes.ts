import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
} from '../controllers/tasks.controller';

const router = Router();

router.use(authMiddleware);
router.get('/', getTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/toggle', toggleTask);

export default router;
