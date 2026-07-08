import bcrypt from 'bcryptjs';
import { transaction } from '../config/db.js';
import { query } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { createNotification } from './notificationService.js';

function memberLoginEmail(phoneNumber) {
  const compactPhone = phoneNumber.replace(/\s+/g, '');
  return `${compactPhone}@members.bodax.local`;
}

export async function listMembers({ saccoId, search = '', page = 1, limit = 20 }) {
  const offset = (Number(page) - 1) * Number(limit);
  const term = `%${search}%`;
  const { rows } = await query(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM members
     WHERE sacco_id = $1
       AND ($2 = '%%'
        OR full_name ILIKE $2
        OR phone_number ILIKE $2
        OR member_number ILIKE $2)
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [saccoId, term, limit, offset],
  );

  return {
    data: rows.map(({ total_count, ...member }) => member),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(rows[0]?.total_count || 0),
    },
  };
}

export async function getMember(saccoId, id) {
  const { rows } = await query('SELECT * FROM members WHERE sacco_id = $1 AND id = $2', [saccoId, id]);
  if (!rows[0]) throw new AppError('Member not found', 404);
  return rows[0];
}

export async function createMember(saccoId, payload) {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO members
        (sacco_id, member_number, full_name, phone_number, number_plate, national_id, stage, next_of_kin, next_of_kin_phone, registration_date, status, photo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10, CURRENT_DATE),COALESCE($11, 'active'),$12)
       RETURNING *`,
      [
        saccoId,
        payload.member_number,
        payload.full_name,
        payload.phone_number,
        payload.number_plate || null,
        payload.national_id || null,
        payload.stage,
        payload.next_of_kin || null,
        payload.next_of_kin_phone || null,
        payload.registration_date || null,
        payload.status || 'active',
        payload.photo || null,
      ],
    );

    const member = rows[0];
    if (payload.password) {
      const user = await setMemberCredentials(saccoId, member.id, payload.password, client, payload.email);
      return { ...member, user_id: user.id };
    }

    return member;
  });
}

export async function updateMember(saccoId, id, payload) {
  await getMember(saccoId, id);
  const { rows } = await query(
    `UPDATE members
     SET full_name = COALESCE($3, full_name),
         phone_number = COALESCE($4, phone_number),
         number_plate = COALESCE($5, number_plate),
         national_id = COALESCE($6, national_id),
         stage = COALESCE($7, stage),
         next_of_kin = COALESCE($8, next_of_kin),
         next_of_kin_phone = COALESCE($9, next_of_kin_phone),
         status = COALESCE($10, status),
         photo = COALESCE($11, photo),
         updated_at = NOW()
     WHERE sacco_id = $1 AND id = $2
     RETURNING *`,
    [
      saccoId,
      id,
      payload.full_name,
      payload.phone_number,
      payload.number_plate,
      payload.national_id,
      payload.stage,
      payload.next_of_kin,
      payload.next_of_kin_phone,
      payload.status,
      payload.photo,
    ],
  );
  return rows[0];
}

export async function setMemberCredentials(saccoId, memberId, password, db = query, email) {
  const runner = typeof db === 'function' ? { query: db } : db;
  const memberResult = await runner.query('SELECT * FROM members WHERE sacco_id = $1 AND id = $2', [saccoId, memberId]);
  const member = memberResult.rows[0];
  if (!member) throw new AppError('Member not found', 404);

  const roleResult = await runner.query('SELECT id FROM roles WHERE sacco_id = $1 AND code = $2', [saccoId, 'MEMBER']);
  const role = roleResult.rows[0];
  if (!role) throw new AppError('Member role is not configured', 500);

  const passwordHash = await bcrypt.hash(password, 12);

  if (member.user_id) {
    const updated = await runner.query(
      `UPDATE users
       SET password_hash = $2, is_active = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, is_active`,
      [member.user_id, passwordHash],
    );
    return updated.rows[0];
  }

  const userEmail = email?.trim() || memberLoginEmail(member.phone_number);
  const created = await runner.query(
    `INSERT INTO users (sacco_id, role_id, email, password_hash, is_active)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING id, email, is_active`,
    [saccoId, role.id, userEmail, passwordHash],
  );

  await runner.query('UPDATE members SET user_id = $2, updated_at = NOW() WHERE sacco_id = $3 AND id = $1', [
    memberId,
    created.rows[0].id,
    saccoId,
  ]);

  return created.rows[0];
}

export async function listPasswordResetRequests(saccoId) {
  const { rows } = await query(
    `SELECT pr.*, m.full_name, m.phone_number, m.member_number, m.number_plate 
     FROM password_reset_requests pr
     JOIN members m ON m.id = pr.member_id
     WHERE pr.sacco_id = $1 AND pr.status = 'pending'
     ORDER BY pr.created_at DESC`,
    [saccoId]
  );
  return rows;
}

export async function reviewPasswordResetRequest(saccoId, requestId, action, reviewedBy, newPassword) {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM password_reset_requests WHERE id = $1 AND sacco_id = $2 AND status = 'pending' FOR UPDATE`,
      [requestId, saccoId]
    );
    const request = rows[0];
    if (!request) throw new AppError('Password reset request not found or already processed', 404);

    const status = action === 'approve' ? 'approved' : 'rejected';

    await client.query(
      `UPDATE password_reset_requests
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [status, reviewedBy, requestId]
    );

    if (status === 'approved') {
      if (!newPassword) throw new AppError('New password is required to approve the request', 400);
      await setMemberCredentials(saccoId, request.member_id, newPassword, client);
    }

    // Notify the member that their request was processed
    const { rows: memberRows } = await client.query(
      'SELECT user_id, full_name FROM members WHERE id = $1',
      [request.member_id]
    );
    if (memberRows[0]?.user_id) {
      await createNotification(
        saccoId,
        memberRows[0].user_id,
        status === 'approved' ? 'Password Reset Approved' : 'Password Reset Rejected',
        status === 'approved'
          ? 'Your password reset request has been approved. You can now log in with your new password.'
          : 'Your password reset request was rejected. Please contact the Treasurer if you believe this is an error.',
        'password_reset',
        {},
        client
      );
    }

    return { status, message: `Request ${status}` };
  });
}
