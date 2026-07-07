import { changePassword, login, requestPasswordReset } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const loginController = asyncHandler(async (req, res) => {
  const identifier = req.validated.body.identifier || req.validated.body.email;
  const result = await login(identifier, req.validated.body.password);
  res.json(result);
});

export const forgotPasswordController = asyncHandler(async (req, res) => {
  const identifier = req.body.identifier;
  if (!identifier) return res.status(400).json({ message: 'Identifier is required' });
  await requestPasswordReset(identifier);
  res.json({ message: 'Password reset request submitted successfully' });
});

export const meController = asyncHandler(async (req, res) => {
  const { password_hash, ...user } = req.user;
  res.json({ user });
});

export const changePasswordController = asyncHandler(async (req, res) => {
  await changePassword(req.user.id, req.validated.body.current_password, req.validated.body.new_password);
  res.json({ message: 'Password updated successfully' });
});
