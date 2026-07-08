import { Router } from 'express';
import { listDepositsController, myDepositsController, notifyDepositController, reviewDepositController } from '../controllers/depositController.js';
import { authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { depositNotificationSchema } from '../validators/schemas.js';

const router = Router();

router.post('/', authorize('MEMBER'), validate(depositNotificationSchema), notifyDepositController);
router.get('/my', authorize('MEMBER'), myDepositsController);
router.get('/', authorize('TREASURER', 'CHAIRMAN'), listDepositsController);
router.patch('/:id/review', authorize('TREASURER'), reviewDepositController);

export default router;
