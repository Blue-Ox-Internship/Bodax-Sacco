import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { createNotification } from './notificationService.js';
import * as memberService from './memberService.js';

const userSelect = `
  SELECT u.id, u.sacco_id, u.email, u.password_hash, u.is_active, r.code AS role_code, r.name AS role_name,
         m.id AS member_id, m.full_name, m.member_number, m.phone_number, m.number_plate, m.photo
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN members m ON m.user_id = u.id
`;

export async function getUserById(id) {
  const { rows } = await query(`${userSelect} WHERE u.id = $1`, [id]);
  return rows[0];
}

export async function login(saccoCode, identifier, password) {
  // Normalize identifier for matching
  const raw = identifier.trim();
  const rawLower = raw.toLowerCase();

  // Build all phone format variants so we match regardless of storage format
  // e.g. user types "0772123456" → also try "+256772123456" and "256772123456"
  // e.g. user types "+256772123456" → also try "0772123456" and "256772123456"
  const digitsOnly = rawLower.replace(/\D/g, '');  // e.g. "256772123456"
  let phone0    = rawLower;   // as-typed, starting with 0
  let phone256  = rawLower;   // +256... format
  let phone_no_plus = rawLower; // 256... without plus

  if (digitsOnly.startsWith('256') && digitsOnly.length >= 12) {
    // User typed +256... or 256...
    phone0        = '0' + digitsOnly.slice(3);          // 0772123456
    phone256      = '+' + digitsOnly;                   // +256772123456
    phone_no_plus = digitsOnly;                         // 256772123456
  } else if (digitsOnly.startsWith('0') && digitsOnly.length >= 10) {
    // User typed 07xx...
    phone0        = digitsOnly;                         // 0772123456
    phone256      = '+256' + digitsOnly.slice(1);       // +256772123456
    phone_no_plus = '256' + digitsOnly.slice(1);        // 256772123456
  }

  // Strip spaces for number plate matching (e.g. "UBC 123A" → "ubc123a")
  const strippedValue = rawLower.replace(/\s+/g, '');

  const { rows } = await query(
    `${userSelect}
     JOIN saccos s ON s.id = u.sacco_id
     WHERE s.code = $1
       AND (
         lower(u.email) = $2
         OR m.phone_number = $3
         OR m.phone_number = $4
         OR m.phone_number = $5
         OR lower(replace(m.number_plate, ' ', '')) = $6
       )`,
    [
      saccoCode.trim().toUpperCase(),
      rawLower,       // $2 email match
      phone0,         // $3 0772... format
      phone256,       // $4 +256772... format
      phone_no_plus,  // $5 256772... format (no plus)
      strippedValue,  // $6 number plate
    ],
  );
  const user = rows[0];

  if (!user || !user.is_active) {
    throw new AppError('Invalid credentials. Check your phone, number plate, and password.', 401);
  }

  const valid = user.password_hash.startsWith('$2')
    ? await bcrypt.compare(password, user.password_hash)
    : false;

  if (!valid) throw new AppError('Invalid credentials. Check your phone, number plate, and password.', 401);

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

  // Notify all active Treasurers in this SACCO
  const { rows: treasurers } = await query(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.sacco_id = $1 AND r.code = 'TREASURER' AND u.is_active = true`,
    [user.sacco_id]
  );
  const memberName = user.full_name || user.phone_number || user.number_plate || 'A member';
  const memberIdentifier = user.phone_number || user.number_plate || '';
  for (const t of treasurers) {
    await createNotification(
      user.sacco_id,
      t.id,
      'Password Reset Requested',
      `${memberName} (${memberIdentifier}) has requested a password reset. Please verify their identity and process the request from the Members panel.`,
      'password_reset'
    );
  }
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
