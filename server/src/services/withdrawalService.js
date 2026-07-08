import { query, transaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

async function memberSavingsBalance(saccoId, memberId, runner = query) {
  const { rows } = await runner(
    `SELECT GREATEST(
       COALESCE((
         SELECT SUM(amount) FROM savings_transactions
         WHERE sacco_id = $1 AND member_id = $2 AND confirmed = true
       ), 0) - COALESCE((
         SELECT SUM(amount) FROM withdrawals
         WHERE sacco_id = $1 AND member_id = $2
       ), 0),
       0
     ) AS balance`,
    [saccoId, memberId],
  );
  return Number(rows[0]?.balance || 0);
}

export async function createWithdrawalRequest(saccoId, payload) {
  const balance = await memberSavingsBalance(saccoId, payload.member_id);
  if (Number(payload.amount) > balance) {
    throw new AppError(`Withdrawal amount exceeds available savings balance (${balance.toLocaleString()} UGX)`, 400);
  }

  const { rows } = await query(
    `INSERT INTO withdrawal_requests (sacco_id, member_id, amount, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [saccoId, payload.member_id, payload.amount, payload.reason || null],
  );
  return rows[0];
}

export async function listWithdrawalRequests({ saccoId, status, memberId } = {}) {
  const params = [saccoId];
  const filters = ['wr.sacco_id = $1'];
  if (status) {
    params.push(status);
    filters.push(`wr.status = $${params.length}`);
  }
  if (memberId) {
    params.push(memberId);
    filters.push(`wr.member_id = $${params.length}`);
  }
  const where = `WHERE ${filters.join(' AND ')}`;

  const { rows } = await query(
    `SELECT wr.*, m.full_name, m.member_number,
            GREATEST(
              COALESCE((
                SELECT SUM(s.amount) FROM savings_transactions s
                WHERE s.sacco_id = wr.sacco_id AND s.member_id = wr.member_id AND s.confirmed = true
              ), 0) - COALESCE((
                SELECT SUM(w.amount) FROM withdrawals w
                WHERE w.sacco_id = wr.sacco_id AND w.member_id = wr.member_id
              ), 0),
              0
            ) AS available_savings
     FROM withdrawal_requests wr
     JOIN members m ON m.id = wr.member_id
     ${where}
     ORDER BY wr.requested_at DESC`,
    params,
  );
  return rows;
}

export async function reviewWithdrawalRequest(saccoId, id, action, reviewedBy) {
  return transaction(async (client) => {
    const found = await client.query('SELECT * FROM withdrawal_requests WHERE sacco_id = $1 AND id = $2 FOR UPDATE', [saccoId, id]);
    const request = found.rows[0];
    if (!request) throw new AppError('Withdrawal request not found', 404);
    if (request.status !== 'pending') throw new AppError('Request has already been reviewed', 409);

    const status = action === 'approve' ? 'approved' : 'rejected';
    if (status === 'approved') {
      const balance = await memberSavingsBalance(saccoId, request.member_id, client.query.bind(client));
      if (Number(request.amount) > balance) {
        throw new AppError(`Withdrawal amount exceeds available savings balance (${balance.toLocaleString()} UGX)`, 400);
      }
    }

    const reviewed = await client.query(
      `UPDATE withdrawal_requests
       SET status = $3, reviewed_by = $4, reviewed_at = NOW(), updated_at = NOW()
       WHERE sacco_id = $1 AND id = $2
       RETURNING *`,
      [saccoId, id, status, reviewedBy],
    );

    let withdrawal = null;
    if (status === 'approved') {
      const created = await client.query(
        `INSERT INTO withdrawals (sacco_id, request_id, member_id, recorded_by, amount, notes)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [saccoId, id, request.member_id, reviewedBy, request.amount, request.reason],
      );
      withdrawal = created.rows[0];
    }

    return { request: reviewed.rows[0], withdrawal };
  });
}