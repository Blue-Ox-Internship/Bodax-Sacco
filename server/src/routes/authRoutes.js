import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { changePasswordController, loginController, meController, signupController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { changePasswordSchema, loginSchema, signupSchema } from '../validators/schemas.js';

const router = Router();

// Strict rate limit for authentication endpoints: 5 attempts per 15 minutes
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

router.post('/login', authRateLimit, validate(loginSchema), loginController);
router.post('/signup', authRateLimit, validate(signupSchema), signupController);


router.get('/me', authenticate, meController);
router.patch('/password', authenticate, validate(changePasswordSchema), changePasswordController);

export default router;
