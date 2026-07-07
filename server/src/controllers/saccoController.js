import * as saccoService from '../services/saccoService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listSaccos = asyncHandler(async (req, res) => {
  res.json(await saccoService.listSaccos());
});

export const createSacco = asyncHandler(async (req, res) => {
  if (!req.body.name) {
    return res.status(400).json({ message: 'SACCO name is required' });
  }
  res.status(201).json(await saccoService.createSacco(req.body.name));
});

export const updateSaccoStatus = asyncHandler(async (req, res) => {
  if (!req.body.status) {
    return res.status(400).json({ message: 'Status is required' });
  }
  res.json(await saccoService.updateSaccoStatus(req.params.id, req.body.status));
});

export const createSaccoUser = asyncHandler(async (req, res) => {
  const { email, password, role_code } = req.body;
  if (!email || !password || !role_code) {
    return res.status(400).json({ message: 'Email, password, and role_code are required' });
  }
  const user = await saccoService.createSaccoUser(req.params.id, email, password, role_code);
  res.status(201).json(user);
});
