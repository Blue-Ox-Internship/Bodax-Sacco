import { Router } from 'express';
import * as controller from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', controller.getNotifications);
router.patch('/mark-all-read', controller.markAllAsRead);
router.patch('/:id/read', controller.markAsRead);

export default router;
