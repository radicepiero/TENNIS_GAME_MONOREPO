const express = require('express');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv/config');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : (origin, callback) => {
      if (!origin) return callback(null, true);
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
      return callback(null, isLocalhost);
    };

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'un segreto generato a caso';

const DB_HOST = String(process.env.DB_CONNESSIONE || '').trim();
const DB_NAME = String(process.env.DATABASE || '').trim();
const DB_USER = String(process.env.DB_USER || '').trim();
const DB_PSSW = String(process.env.DB_PSSW || '');

console.log('apartments-api db config', {
  host: DB_HOST,
  database: DB_NAME,
  user: DB_USER,
  passwordType: typeof DB_PSSW,
  passwordLen: DB_PSSW.length,
});

if (!DB_HOST || !DB_NAME || !DB_USER) {
  console.error(
    'Missing DB configuration. Required env vars: DB_CONNESSIONE, DATABASE, DB_USER, DB_PSSW (optional if your Postgres allows passwordless).',
  );
}

const pool = new Pool({
  host: DB_HOST,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PSSW,
  port: 5432,
});

async function ensureAdminSeed() {
  const nickname = String(process.env.APARTMENTS_ADMIN_NICKNAME || '').trim();
  const password = String(process.env.APARTMENTS_ADMIN_PASSWORD || '');
  if (!nickname || !password) return;

  const existing = await pool.query('SELECT uuid FROM apartments_users WHERE nickname=$1', [nickname]);
  if (existing.rowCount && existing.rowCount > 0) return;

  const password_hash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO apartments_users (uuid, nickname, password_hash, role) VALUES ($1, $2, $3, $4)',
    [uuidv4(), nickname, password_hash, 'admin'],
  );
}

const extractJwtFromRequest = (req) => {
  const auth = String(req.headers.authorization || '');
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m && m[1]) return m[1].trim();
  return null;
};

const requireAuth = (req, res, next) => {
  const token = extractJwtFromRequest(req);
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
    if (err) return res.status(401).json({ success: false, message: 'Unauthorized' });
    req.jwt = decodedToken;
    next();
  });
};

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'apartments-api' });
});

app.post('/api/auth/login', (req, res) => {
  const { nickname, password } = req.body || {};

  if (!nickname || !password) {
    return res.status(400).json({ success: false, message: 'Missing credentials' });
  }

  return pool
    .query('SELECT uuid, nickname, password_hash, role FROM apartments_users WHERE nickname=$1', [nickname])
    .then(async (result) => {
      if (!result.rowCount) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const u = result.rows[0];
      const ok = await bcrypt.compare(String(password), String(u.password_hash));
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = jwt.sign({ uuid: u.uuid, nickname: u.nickname, role: u.role }, JWT_SECRET, {
        expiresIn: '7d',
      });
      return res.json({ success: true, token, user: { nickname: u.nickname, role: u.role } });
    })
    .catch(() => res.status(500).json({ success: false, message: 'Server error' }));
});

app.get('/api/me', requireAuth, (req, res) => {
  return res.json({ success: true, user: req.jwt });
});

const PORT = process.env.PORT || 9100;

ensureAdminSeed()
  .then(() => {
    http.createServer(app).listen(PORT, '0.0.0.0', () => {
      console.log(`apartments API listening on ${PORT}`);
    });
  })
  .catch((e) => {
    console.error('Failed to start apartments API', e);
    process.exit(1);
  });
