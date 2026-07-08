import * as depositService from '../services/depositService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const myDepositsController = asyncHandler(async (req, res) => {
  const memberId = req.user.member_id || req.user.memberId;
  if (!memberId) return res.status(400).json({ message: 'Member ID not found in user session' });
  const result = await depositService.listMyDepositNotifications(req.saccoId, memberId);
  res.json(result);
});

export const notifyDepositController = asyncHandler(async (req, res) => {
  const memberId = req.user.member_id || req.user.memberId;
  if (!memberId) return res.status(400).json({ message: 'Member ID not found in user session' });
  const result = await depositService.notifyDeposit(req.saccoId, memberId, req.validated.body);
  res.status(201).json(result);
});

export const listDepositsController = asyncHandler(async (req, res) => {
  const result = await depositService.listDepositNotifications(req.saccoId, req.query.status);
  res.json(result);
});

export const reviewDepositController = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
  }
  const result = await depositService.reviewDeposit(req.saccoId, req.params.id, action, req.user.id);
  res.json(result);
});
