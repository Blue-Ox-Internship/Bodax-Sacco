import { query } from '../config/db.js';

export async function getNotifications(saccoId, userId) {
  const { rows } = await query(
    `SELECT * FROM notifications 
     WHERE sacco_id = $1 AND user_id = $2 
     ORDER BY created_at DESC 
     LIMIT 50`,
    [saccoId, userId]
  );
  return rows;
}

export async function markAsRead(saccoId, userId, notificationId) {
  const { rows } = await query(
    `UPDATE notifications 
     SET is_read = true, updated_at = NOW() 
     WHERE sacco_id = $1 AND user_id = $2 AND id = $3 
     RETURNING *`,
    [saccoId, userId, notificationId]
  );
  return rows[0];
}

export async function markAllAsRead(saccoId, userId) {
  await query(
    `UPDATE notifications 
     SET is_read = true, updated_at = NOW() 
     WHERE sacco_id = $1 AND user_id = $2 AND is_read = false`,
    [saccoId, userId]
  );
  return { message: 'All notifications marked as read' };
}

export async function createNotification(saccoId, userId, title, message, type = 'info', data = {}) {
  const { rows } = await query(
    `INSERT INTO notifications (sacco_id, user_id, title, message, type, data) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING *`,
    [saccoId, userId, title, message, type, data]
  );
  return rows[0];
}
