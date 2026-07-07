import * as loanService from '../services/loanService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const issueLoan = asyncHandler(async (req, res) => {
  res.status(201).json(await loanService.issueLoan(req.saccoId, req.validated.body, req.user.id));
});

export const recordRepayment = asyncHandler(async (req, res) => {
  res.status(201).json(await loanService.recordRepayment(req.saccoId, req.validated.body, req.user.id));
});

export const listLoans = asyncHandler(async (req, res) => {
  const memberId = req.user.role_code === 'MEMBER' ? req.user.member_id : req.query.member_id;
  res.json(await loanService.listLoans({ saccoId: req.saccoId, memberId, status: req.query.status }));
});

export const checkEligibility = asyncHandler(async (req, res) => {
  const memberId = req.user.role_code === 'MEMBER' ? req.user.member_id : req.query.member_id;
  const requestedAmount = req.query.amount ? Number(req.query.amount) : null;
  res.json(await loanService.checkLoanEligibility(req.saccoId, memberId, requestedAmount));
});

export const createLoanRequest = asyncHandler(async (req, res) => {
  const payload =
    req.user.role_code === 'MEMBER'
      ? { ...req.validated.body, member_id: req.user.member_id }
      : req.validated.body;
  res.status(201).json(await loanService.createLoanRequest(req.saccoId, payload));
});

export const listLoanRequests = asyncHandler(async (req, res) => {
  const memberId = req.user.role_code === 'MEMBER' ? req.user.member_id : req.query.member_id;
  res.json(await loanService.listLoanRequests({ saccoId: req.saccoId, status: req.query.status, memberId }));
});

export const reviewLoanRequest = asyncHandler(async (req, res) => {
  res.json(
    await loanService.reviewLoanRequest(
      req.saccoId,
      req.validated.params.id,
      req.validated.body.action,
      req.user.id,
      req.validated.body.notes,
    ),
  );
});
