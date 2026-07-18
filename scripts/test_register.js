import http from 'node:http';
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(currentDir, '../.env') });

const API_BASE = `http://localhost:${process.env.PORT || 4000}`;

async function apiPost(path, body, token) {
  return new Promise((res, rej) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const req = http.request(`${API_BASE}${path}`, {
      method: 'POST',
      headers
    }, (r) => {
      let raw = '';
      r.on('data', c => raw += c);
      r.on('end', () => res({ status: r.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', rej);
    req.write(data);
    req.end();
  });
}

async function run() {
  try {
    // 1. Login as treasurer
    const loginRes = await apiPost('/api/auth/login', {
      sacco_code: 'BODAX',
      identifier: 'treasurer@bodax.test',
      password: 'password123'
    });
    
    if (loginRes.status !== 200) {
      console.error("Login failed:", loginRes.body);
      return;
    }
    
    const token = loginRes.body.token;
    console.log("Logged in successfully. Token obtained.");

    // 2. Register member with a base64 photo
    // Generate a dummy base64 string representing a small photo
    const base64Photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const memberPayload = {
      member_number: 'TEST-003',
      full_name: 'Test Member Empty Password',
      phone_number: '0772000003',
      number_plate: 'UAB 123E',
      national_id: 'CM99999999XZ',
      stage: 'Mbarara Central Stage',
      next_of_kin: 'Kin Person',
      password: '',
      photo: base64Photo
    };

    console.log("Sending member registration payload...");
    const regRes = await apiPost('/api/members', memberPayload, token);
    console.log("Registration status:", regRes.status);
    console.log("Registration response body:", regRes.body);

  } catch (err) {
    console.error("Error during test:", err);
  }
}

run();
