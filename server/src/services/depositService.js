import { query, transaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { createNotification } from './notificationService.js';

export async function notifyDeposit(saccoId, memberId, payload) {
  const { rows } = await query(
    `INSERT INTO deposit_notifications (sacco_id, member_id, amount, transaction_id, notes, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [saccoId, memberId, payload.amount, payload.transaction_id || null, payload.notes || null]
  );
  
  const notification = rows[0];

  // Notify Treasurers
  const { rows: treasurers } = await query(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.sacco_id = $1 AND r.code = 'TREASURER'`,
    [saccoId]
  );
  
  const memberResult = await query('SELECT full_name, member_number FROM members WHERE id = $1', [memberId]);
  const member = memberResult.rows[0];

  for (const t of treasurers) {
    await createNotification(
      saccoId,
      t.id,
      'New Deposit Notification',
      `Member ${member.full_name} (${member.member_number}) has submitted a deposit notification for ${payload.amount} UGX.`,
      'deposit'
    );
  }

  return notification;
}

export async function listDepositNotifications(saccoId, status) {
  let sql = `
    SELECT dn.*, m.full_name, m.member_number, m.phone_number 
    FROM deposit_notifications dn
    JOIN members m ON m.id = dn.member_id
    WHERE dn.sacco_id = $1
  `;
  const params = [saccoId];
  
  if (status) {
    params.push(status);
    sql += ` AND dn.status = $2`;
  }
  
  sql += ` ORDER BY dn.created_at DESC`;
  
  const { rows } = await query(sql, params);
  return rows;
}

export async function reviewDeposit(saccoId, notificationId, action, reviewedBy) {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM deposit_notifications WHERE id = $1 AND sacco_id = $2 FOR UPDATE`,
      [notificationId, saccoId]
    );
    const notification = rows[0];
    
    if (!notification) throw new AppError('Deposit notification not found', 404);
    if (notification.status !== 'pending') throw new AppError('Notification already reviewed', 400);

    const status = action === 'approve' ? 'approved' : 'rejected';

    await client.query(
      `UPDATE deposit_notifications 
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW() 
       WHERE id = $3`,
      [status, reviewedBy, notificationId]
    );

    if (status === 'approved') {
      // Record the actual savings transaction
      await client.query(
        `INSERT INTO savings_transactions (sacco_id, member_id, recorded_by, amount, transaction_date, notes, confirmed)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, true)`,
        [saccoId, notification.member_id, reviewedBy, notification.amount, `From external deposit: ${notification.transaction_id || 'N/A'}`]
      );
    }
    
    // Notify the member
    const userResult = await client.query('SELECT user_id FROM members WHERE id = $1', [notification.member_id]);
    if (userResult.rows[0]?.user_id) {
      await createNotification(
        saccoId,
        userResult.rows[0].user_id,
        `Deposit ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        `Your deposit notification of ${notification.amount} UGX has been ${status}.`,
        'deposit'
      );
    }

    return { status, message: `Deposit ${status} successfully` };
  });
}
