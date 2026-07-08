import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(currentDir, 'migration_002_sacco_code.sql');

try {
  const sql = await readFile(migrationPath, 'utf8');
  await pool.query(sql);
  console.log('Migration 002 applied successfully');
} catch (error) {
  console.error('Migration 002 failed:', error);
} finally {
  await pool.end();
}
