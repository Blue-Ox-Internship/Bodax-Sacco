import * as reportService from '../services/reportService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const treasurerDashboard = asyncHandler(async (req, res) => {
  res.json(await reportService.treasurerDashboard(req.saccoId));
});

export const chairmanDashboard = asyncHandler(async (req, res) => {
  res.json(await reportService.chairmanDashboard(req.saccoId));
});

export const memberDashboard = asyncHandler(async (req, res) => {
  // Fixed: use memberId (camelCase) instead of member_id (snake_case)
  const memberId = req.user.memberId || req.user.member_id;
  
  if (!memberId) {
    return res.status(400).json({ message: 'Member ID not found in user session' });
  }
  
  res.json(await reportService.memberDashboard(req.saccoId, memberId));
});

export const analytics = asyncHandler(async (req, res) => {
  const [topSavers, defaulters, trend, income, expenditure] = await Promise.all([
    reportService.topSavers(req.saccoId),
    reportService.defaulters(req.saccoId),
    reportService.collectionTrend(req.saccoId),
    reportService.incomeSummary(req.saccoId),
    reportService.expenditureSummary(req.saccoId),
  ]);

  res.json({ topSavers, defaulters, trend, income, expenditure });
});

export const overdueLoans = asyncHandler(async (req, res) => {
  res.json(await reportService.overdueLoans(req.saccoId));
});