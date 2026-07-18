import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { changePasswordController, loginController, meController, forgotPasswordController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { changePasswordSchema, loginSchema } from '../validators/schemas.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ua = req.headers['user-agent'] || '';
    return ua.includes('Mozilla') || ua.includes('Chrome') || ua.includes('Safari') || ua.includes('Firefox');
  }
});

router.post('/login', validate(loginSchema), loginController);
router.post('/forgot-password', forgotPasswordController);

router.get('/me', authenticate, meController);
router.patch('/password', authenticate, validate(changePasswordSchema), changePasswordController);

export default router;
