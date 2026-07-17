import { pool } from '../server/src/config/db.js';
import bcrypt from 'bcryptjs';

async function reset() {
  try {
    const passwordHash = await bcrypt.hash('password123', 12);
    console.log("Generated hash:", passwordHash);
    
    const emails = ['member@bodax.test', 'treasurer@bodax.test', 'chairman@bodax.test'];
    for (const email of emails) {
      const res = await pool.query(
        "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email",
        [passwordHash, email]
      );
      if (res.rows.length > 0) {
        console.log(`Reset password for ${res.rows[0].email}`);
      } else {
        console.log(`User ${email} not found`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

reset();
