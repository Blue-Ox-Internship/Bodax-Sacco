import * as notificationService from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getNotifications(req.saccoId, req.user.id);
  res.json(notifications);
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.saccoId, req.user.id, req.params.id);
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  res.json(notification);
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.saccoId, req.user.id);
  res.json(result);
});
