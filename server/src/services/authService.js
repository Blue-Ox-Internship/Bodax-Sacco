import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { createNotification } from './notificationService.js';
import * as memberService from './memberService.js';

const userSelect = `
  SELECT u.id, u.sacco_id, u.email, u.password_hash, u.is_active, r.code AS role_code, r.name AS role_name,
         m.id AS member_id, m.full_name, m.member_number, m.phone_number, m.number_plate
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN members m ON m.user_id = u.id
`;

export async function getUserById(id) {
  const { rows } = await query(`${userSelect} WHERE u.id = $1`, [id]);
  return rows[0];
}

export async function login(saccoCode, identifier, password) {
  // Normalize identifier
  let value = identifier.trim().toLowerCase();
  
  // Strip all spaces for number plate matching (e.g. "UBC 123A" -> "ubc123a")
  const strippedValue = value.replace(/\s+/g, '');
  
  // Very basic phone normalization (replace leading 0 with +256)
  let phoneValue = value;
  if (phoneValue.startsWith('0')) {
    phoneValue = '+256' + phoneValue.slice(1);
  }
  phoneValue = phoneValue.replace(/\s+/g, '');

  const { rows } = await query(
    `${userSelect}
     JOIN saccos s ON s.id = u.sacco_id
     WHERE s.code = $1 AND (lower(u.email) = $2
        OR m.phone_number = $3
        OR lower(replace(m.number_plate, ' ', '')) = $4)`,
    [saccoCode.trim().toUpperCase(), value, phoneValue, strippedValue],
  );
  const user = rows[0];

  if (!user || !user.is_active) {
    throw new AppError('Invalid login details', 401);
  }

  const valid = user.password_hash.startsWith('$2')
    ? await bcrypt.compare(password, user.password_hash)
    : false;

  if (!valid) throw new AppError('Invalid login details', 401);

  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  const token = jwt.sign(
    { sub: user.id, role: user.role_code, memberId: user.member_id, saccoId: user.sacco_id },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );

  if (user.role_code === 'TREASURER') {
    // Notify Chairman
    const { rows: chairmen } = await query(
      `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.sacco_id = $1 AND r.code = 'CHAIRMAN'`,
      [user.sacco_id]
    );
    if (chairmen.length > 0) {
      await createNotification(
        user.sacco_id, 
        chairmen[0].id, 
        'Treasurer Logged In', 
        `The treasurer (${user.email}) has just logged into the system.`,
        'security'
      );
    }
  }

  delete user.password_hash;
  return { token, user };
}

export async function requestPasswordReset(saccoCode, identifier) {
  let value = identifier.trim().toLowerCase();
  const strippedValue = value.replace(/\s+/g, '');
  let phoneValue = value;
  if (phoneValue.startsWith('0')) {
    phoneValue = '+256' + phoneValue.slice(1);
  }
  phoneValue = phoneValue.replace(/\s+/g, '');

  const { rows } = await query(
    `${userSelect}
     JOIN saccos s ON s.id = u.sacco_id
     WHERE s.code = $1 AND (lower(u.email) = $2
        OR m.phone_number = $3
        OR lower(replace(m.number_plate, ' ', '')) = $4)`,
    [saccoCode.trim().toUpperCase(), value, phoneValue, strippedValue],
  );
  const user = rows[0];

  if (!user || !user.member_id) {
    throw new AppError('Member not found. Please contact the Treasurer.', 404);
  }

  // Insert reset request
  await query(
    `INSERT INTO password_reset_requests (sacco_id, member_id, status)
     VALUES ($1, $2, 'pending')`,
    [user.sacco_id, user.member_id]
  );
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await getUserById(userId);
  if (!user) throw new AppError('User not found', 404);

  const valid = user.password_hash.startsWith('$2')
    ? await bcrypt.compare(currentPassword, user.password_hash)
    : false;

  if (!valid) throw new AppError('Current password is incorrect', 400);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [userId, passwordHash]);
}
