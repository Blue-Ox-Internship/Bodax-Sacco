import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { getUserById } from '../services/authService.js';

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await getUserById(payload.sub);

    if (!user || !user.is_active) {
      throw new AppError('Invalid or inactive user', 401);
    }

    req.user = user;
    req.saccoId = user.sacco_id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Your session has expired. Please log in again.', 401));
    } else {
      next(error);
    }
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role_code)) {
      next(new AppError('You are not allowed to perform this action', 403));
      return;
    }
    next();
  };
}
