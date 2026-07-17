import { pool } from '../server/src/config/db.js';
import bcrypt from 'bcryptjs';

async function test() {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = 'member@bodax.test'");
    console.log("Member user in DB:", rows[0]);
    if (rows[0]) {
      const match = await bcrypt.compare('password123', rows[0].password_hash);
      console.log("Does bcrypt match 'password123'?", match);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

test();
