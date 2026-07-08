import { Router } from 'express';
import * as saccoController from '../controllers/saccoController.js';

const router = Router();

router.get('/', saccoController.listSaccos);
router.post('/', saccoController.createSacco);
router.patch('/:id/status', saccoController.updateSaccoStatus);
router.post('/:id/users', saccoController.createSaccoUser);

export default router;
