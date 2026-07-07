import { query, transaction } from '../config/db.js';
import { weekStart, monthStart, yearStart } from '../utils/dates.js';

export async function recordSaving(saccoId, payload, recordedBy) {
  const confirmed = payload.confirmed !== false;
  const { rows } = await query(
    `INSERT INTO savings_transactions (sacco_id, member_id, recorded_by, amount, transaction_date, notes, confirmed)
     VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7)
     RETURNING *`,
    [saccoId, payload.member_id, recordedBy, payload.amount, payload.transaction_date || null, payload.notes || null, confirmed],
  );

  return rows[0];
}

export async function memberSavingsSummary(saccoId, memberId) {
  const today = new Date();
  const { rows } = await query(
    `SELECT
       COALESCE(SUM(amount), 0) AS total_savings,
       COALESCE(SUM(amount) FILTER (WHERE transaction_date >= $3), 0) AS week_savings,
       COALESCE(SUM(amount) FILTER (WHERE transaction_date >= $4), 0) AS month_savings,
       COALESCE(SUM(amount) FILTER (WHERE transaction_date >= $5), 0) AS year_savings
     FROM savings_transactions
     WHERE sacco_id = $1 AND member_id = $2 AND confirmed = true`,
    [saccoId, memberId, weekStart(today), monthStart(today), yearStart(today)],
  );
  return rows[0];
}

export async function memberRecentSavings(saccoId, memberId, limit = 8) {
  const { rows } = await query(
    `SELECT id, amount, transaction_date, notes, created_at
     FROM savings_transactions
     WHERE sacco_id = $1 AND member_id = $2 AND confirmed = true
     ORDER BY transaction_date DESC, created_at DESC
     LIMIT $3`,
    [saccoId, memberId, limit],
  );
  return rows;
}

export async function collectionTotals(saccoId, from, to) {
  const { rows } = await query(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS count
     FROM savings_transactions
     WHERE sacco_id = $1 AND transaction_date BETWEEN $2 AND $3 AND confirmed = true`,
    [saccoId, from, to],
  );
  return rows[0];
}

export async function statement(saccoId, memberId, from, to) {
  const { rows } = await query(
    `SELECT 'saving' AS type, amount, transaction_date AS date, notes
     FROM savings_transactions WHERE sacco_id = $1 AND member_id = $2 AND confirmed = true AND transaction_date BETWEEN $3 AND $4
     UNION ALL
     SELECT 'loan repayment' AS type, amount, payment_date AS date, notes
     FROM loan_repayments WHERE sacco_id = $1 AND member_id = $2 AND payment_date BETWEEN $3 AND $4
     UNION ALL
     SELECT 'withdrawal' AS type, amount * -1 AS amount, withdrawal_date AS date, notes
     FROM withdrawals WHERE sacco_id = $1 AND member_id = $2 AND withdrawal_date BETWEEN $3 AND $4
     ORDER BY date DESC`,
    [saccoId, memberId, from, to],
  );
  return rows;
}

export async function submitDepositNotification(saccoId, memberId, amount, transactionId, notes) {
  const { rows } = await query(
    `INSERT INTO deposit_notifications (sacco_id, member_id, amount, transaction_id, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [saccoId, memberId, amount, transactionId || null, notes || null]
  );
  return rows[0];
}

export async function listDepositNotifications(saccoId, status = 'pending') {
  const { rows } = await query(
    `SELECT dn.*, m.full_name, m.phone_number, m.member_number, m.number_plate
     FROM deposit_notifications dn
     JOIN members m ON m.id = dn.member_id
     WHERE dn.sacco_id = $1 AND dn.status = $2
     ORDER BY dn.created_at DESC`,
    [saccoId, status]
  );
  return rows;
}

export async function reviewDepositNotification(saccoId, id, action, reviewedBy) {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM deposit_notifications WHERE sacco_id = $1 AND id = $2 AND status = 'pending' FOR UPDATE`,
      [saccoId, id]
    );
    const notification = rows[0];
    if (!notification) throw new AppError('Notification not found or already processed', 404);

    const status = action === 'approve' ? 'approved' : 'rejected';

    await client.query(
      `UPDATE deposit_notifications
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [status, reviewedBy, id]
    );

    if (status === 'approved') {
      await client.query(
        `INSERT INTO savings_transactions (sacco_id, member_id, recorded_by, amount, transaction_date, notes, confirmed)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, true)`,
        [saccoId, notification.member_id, reviewedBy, notification.amount, `Approved Deposit Notif: ${notification.transaction_id || ''}`]
      );
    }
    return { status, message: `Deposit ${status}` };
  });
}
