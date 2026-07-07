import * as memberService from '../services/memberService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listMembers = asyncHandler(async (req, res) => {
  res.json(await memberService.listMembers({ saccoId: req.saccoId, ...req.query }));
});

export const getMember = asyncHandler(async (req, res) => {
  res.json(await memberService.getMember(req.saccoId, req.params.id));
});

export const createMember = asyncHandler(async (req, res) => {
  res.status(201).json(await memberService.createMember(req.saccoId, req.validated.body));
});

export const updateMember = asyncHandler(async (req, res) => {
  res.json(await memberService.updateMember(req.saccoId, req.validated.params.id, req.validated.body));
});

export const setMemberCredentials = asyncHandler(async (req, res) => {
  const result = await memberService.setMemberCredentials(req.saccoId, req.params.id, req.validated.body.password);
  res.json(result);
});

export const listPasswordResetRequests = asyncHandler(async (req, res) => {
  const requests = await memberService.listPasswordResetRequests(req.saccoId);
  res.json(requests);
});

export const reviewPasswordResetRequest = asyncHandler(async (req, res) => {
  const { action, password } = req.body;
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
  const result = await memberService.reviewPasswordResetRequest(req.saccoId, req.params.id, action, req.user.id, password);
  res.json(result);
});
