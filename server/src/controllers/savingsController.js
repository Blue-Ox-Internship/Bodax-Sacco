import * as savingsService from '../services/savingsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const recordSaving = asyncHandler(async (req, res) => {
  res.status(201).json(await savingsService.recordSaving(req.saccoId, req.validated.body, req.user.id));
});

export const memberSavingsSummary = asyncHandler(async (req, res) => {
  res.json(await savingsService.memberSavingsSummary(req.saccoId, req.params.id));
});

export const memberStatement = asyncHandler(async (req, res) => {
  const memberId = req.user.role_code === 'MEMBER' ? req.user.member_id : req.validated.query.member_id;
  res.json(await savingsService.statement(req.saccoId, memberId, req.validated.query.from, req.validated.query.to));
});

export const submitDepositNotification = asyncHandler(async (req, res) => {
  const { amount, transaction_id, notes } = req.body;
  const result = await savingsService.submitDepositNotification(req.saccoId, req.user.member_id, amount, transaction_id, notes);
  res.status(201).json(result);
});

export const listDepositNotifications = asyncHandler(async (req, res) => {
  const result = await savingsService.listDepositNotifications(req.saccoId, req.query.status || 'pending');
  res.json(result);
});

export const reviewDepositNotification = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
  const result = await savingsService.reviewDepositNotification(req.saccoId, req.params.id, action, req.user.id);
  res.json(result);
});
