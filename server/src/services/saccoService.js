import { query, transaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import bcrypt from 'bcryptjs';

export async function listSaccos() {
  const { rows } = await query('SELECT id, name, status, created_at FROM saccos ORDER BY created_at DESC');
  return rows;
}

export async function createSacco(name) {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO saccos (name) VALUES ($1) RETURNING *`,
      [name]
    );
    const sacco = rows[0];

    // Seed default roles for the new SACCO
    await client.query(
      `INSERT INTO roles (sacco_id, code, name) VALUES 
       ($1, 'MEMBER', 'Member'),
       ($1, 'TREASURER', 'Treasurer'),
       ($1, 'CHAIRMAN', 'Chairman')`,
      [sacco.id]
    );

    return sacco;
  });
}

export async function updateSaccoStatus(id, status) {
  if (!['active', 'suspended'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }
  const { rows } = await query(
    `UPDATE saccos SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, status]
  );
  if (rows.length === 0) {
    throw new AppError('SACCO not found', 404);
  }
  return rows[0];
}

export async function createSaccoUser(saccoId, email, password, roleCode) {
  return transaction(async (client) => {
    const saccoQuery = await client.query('SELECT * FROM saccos WHERE id = $1', [saccoId]);
    if (saccoQuery.rows.length === 0) {
      throw new AppError('SACCO not found', 404);
    }

    const roleQuery = await client.query('SELECT id FROM roles WHERE sacco_id = $1 AND code = $2', [saccoId, roleCode]);
    if (roleQuery.rows.length === 0) {
      throw new AppError('Role not found for this SACCO', 404);
    }
    const roleId = roleQuery.rows[0].id;

    const existingUser = await client.query('SELECT id FROM users WHERE sacco_id = $1 AND email = $2', [saccoId, email]);
    if (existingUser.rows.length > 0) {
      throw new AppError('User with this email already exists in the SACCO', 409);
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await client.query(
      `INSERT INTO users (sacco_id, role_id, email, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, sacco_id, email, role_id, is_active, created_at`,
      [saccoId, roleId, email, hash]
    );
    return rows[0];
  });
}
