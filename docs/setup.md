# Bodax SACCO – Deployment Setup Guide

This document lists every required environment variable for deploying the Bodax SACCO system to **Render** (backend API) and **Vercel** (frontend client).

---

## Backend – Render (Node.js API)

Set the following **Environment Variables** in the Render dashboard under your web service → **Environment**.

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string (with `?sslmode=require` for Render Postgres) | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | ✅ Yes | Secret key for signing JWT tokens. Use a long random string (min 32 chars). | `your-super-secret-key-here-32chars+` |
| `JWT_EXPIRES_IN` | ❌ Optional | JWT token expiry duration. Defaults to `8h`. | `8h` |
| `NODE_ENV` | ✅ Yes | Set to `production` on Render. | `production` |
| `PORT` | ❌ Optional | Port the API listens on. Render sets this automatically. | `4000` |
| `CLIENT_URL` | ✅ Yes | URL of the deployed frontend (for CORS). | `https://bodax-sacco.vercel.app` |

### Render Service Settings
- **Build Command**: `npm install`
- **Start Command**: `node src/server.js`
- **Root Directory**: `server`
- **Runtime**: `Node`

### First-time Database Setup
After the service is running, apply the database schema by running the following in the Render **Shell**:
```bash
node src/db/applySchema.js
```

---

## Frontend – Vercel (React Client)

Set the following **Environment Variables** in the Vercel project dashboard under **Settings → Environment Variables**.

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_BASE_URL` | ✅ Yes | Base URL of the deployed Render API. | `https://bodax-api.onrender.com/api` |

### Vercel Project Settings
- **Framework Preset**: `Vite`
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

---

## Local Development

Copy the `.env.example` file (if present) to `.env` in the `server/` directory, then fill in the values:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/bodax
JWT_SECRET=local-dev-secret-change-this
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

The client does **not** require a `.env` file locally; the API base URL is configured in `client/src/api/client.js`.

---

## Security Checklist Before Going Live

- [ ] `JWT_SECRET` is a long, random, unique string (never committed to Git)
- [ ] `NODE_ENV=production` is set on Render
- [ ] `CLIENT_URL` points to the exact Vercel deployment URL (no trailing slash)
- [ ] Render Postgres uses `sslmode=require` in the `DATABASE_URL`
- [ ] The schema has been applied via `node src/db/applySchema.js`
- [ ] Default test user passwords (`password123`) have been changed for all seed accounts
