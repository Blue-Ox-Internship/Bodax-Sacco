import { env } from '../config/env.js';

export function superAdminAuth(req, res, next) {
  const secret = req.headers['x-super-admin-secret'];
  
  if (!secret) {
    return res.status(401).json({ message: 'Super Admin secret is missing' });
  }
  
  if (secret !== env.superAdminSecret) {
    return res.status(403).json({ message: 'Invalid Super Admin secret' });
  }
  
  next();
}
