import pg from 'pg';
import { AppError } from '../utils/AppError.js';
import { env } from './env.js';

const { Pool } = pg;

function shouldUseSsl(databaseUrl) {
  if (!databaseUrl) return false;
  if (databaseUrl.includes('sslmode=disable')) return false;
  if (databaseUrl.includes('sslmode=require')) return true;

  try {
    const host = new URL(databaseUrl).hostname;
    return !['localhost', '127.0.0.1', '::1'].includes(host);
  } catch {
    return false;
  }
}

function normalizeConnectionString(databaseUrl) {
  if (!databaseUrl) return databaseUrl;

  try {
    const url = new URL(databaseUrl);
    url.searchParams.delete('sslmode');
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

function isDbConnectivityError(error) {
  const message = error?.message?.toString() || '';
  return (
    error?.code === 'ECONNREFUSED' ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('ETIMEDOUT') ||
    message.includes('connect timeout') ||
    message.includes('No connection could be made')
  );
}

export const pool = new Pool({
  connectionString: normalizeConnectionString(env.databaseUrl),
  ssl: shouldUseSsl(env.databaseUrl) ? { rejectUnauthorized: false } : undefined,
});

export function handleDatabaseError(error) {
  if (error instanceof AppError) return error;
  
  const detail = error?.detail || error?.message || 'Unknown database error';
  const msgStr = error?.message || '';

  if (isDbConnectivityError(error)) {
    return new AppError(
      'Database unavailable. Please verify your database connection settings and try again.',
      503,
      { detail },
    );
  }
  if (error?.code === '23505') {
    let message = 'A record with these details already exists.';
    if (detail.includes('member_number') || msgStr.includes('member_number')) {
      message = 'This Member number is already registered.';
    } else if (detail.includes('phone_number') || msgStr.includes('phone_number')) {
      message = 'This Phone number is already registered.';
    } else if (detail.includes('email') || msgStr.includes('email')) {
      message = 'This Email is already registered.';
    } else if (detail.includes('number_plate') || msgStr.includes('number_plate')) {
      message = 'This Number plate is already registered.';
    }
    return new AppError(message, 400, { detail });
  }
  return new AppError(`Database query failed: ${detail}`, 500, { detail });
}

export async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (env.nodeEnv === 'development' && Date.now() - start > 300) {
      console.warn(`Slow query (${Date.now() - start}ms): ${text}`);
    }
    return result;
  } catch (error) {
    throw handleDatabaseError(error);
  }
}

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw handleDatabaseError(error);
  } finally {
    client.release();
  }
}

