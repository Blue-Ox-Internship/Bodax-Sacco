import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import authRoutes from './authRoutes.js';
import loanRoutes from './loanRoutes.js';
import memberRoutes from './memberRoutes.js';
import reportRoutes from './reportRoutes.js';
import savingsRoutes from './savingsRoutes.js';
import withdrawalRoutes from './withdrawalRoutes.js';
import saccoRoutes from './saccoRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import { superAdminAuth } from '../middleware/superAdminAuth.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/members', authenticate, memberRoutes);
router.use('/savings', authenticate, savingsRoutes);
router.use('/loans', authenticate, loanRoutes);
router.use('/withdrawals', authenticate, withdrawalRoutes);
router.use('/reports', authenticate, reportRoutes);
router.use('/notifications', authenticate, notificationRoutes);
router.use('/admin/saccos', superAdminAuth, saccoRoutes);

export default router;
