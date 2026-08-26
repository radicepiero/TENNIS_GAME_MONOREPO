const express = require('express');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
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
  const { nickname, password, role } = req.body || {};

  if (!nickname || !password) {
    return res.status(400).json({ success: false, message: 'Missing credentials' });
  }

  const safeRole = role === 'admin' || role === 'visitor' ? role : 'member';

  const token = jwt.sign({ nickname, role: safeRole }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ success: true, token, user: { nickname, role: safeRole } });
});

app.get('/api/me', requireAuth, (req, res) => {
  return res.json({ success: true, user: req.jwt });
});

const PORT = process.env.PORT || 9100;
http.createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log(`apartments API listening on ${PORT}`);
});
