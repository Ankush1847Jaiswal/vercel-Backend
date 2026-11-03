require('dotenv').config({ path: process.env.ENV_FILE || '.env' });
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');
const { validateSecrets } = require('./config');
const authRoutes = require('./routes/auth');
const privateAuthRoutes = require('./routes/privateAuth');
const photosRoutes = require('./routes/photos');
const lettersRoutes = require('./routes/letters');
const diaryRoutes = require('./routes/diary');
const momentsRoutes = require('./routes/moments');
const upscRoutes = require('./routes/upsc');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || './private_uploads');
const dataDir = path.resolve('./data');
const sessionsDir = path.resolve(process.env.SESSIONS_DIR || './sessions');
[uploadsDir, dataDir, sessionsDir].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({
  store: new FileStore({ path: sessionsDir, ttl: 86400, retries: 0 }),
  secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' },
  name: 'upsc.sid',
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 200), standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests, please try again later.' } }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10), standardHeaders: true, legacyHeaders: false, message: { error: 'Too many authentication attempts. Please wait 15 minutes.' } });
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/private-auth', authLimiter, privateAuthRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/letters', lettersRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/moments', momentsRoutes);
app.use('/api/upsc', upscRoutes);
app.use('/api/admin', adminRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err.stack || err);
  res.status(err.status || 500).json({ error: err.status === 413 ? 'Upload is too large.' : 'Internal server error' });
});

async function start() {
  validateSecrets();
  await initDatabase();
  app.listen(PORT, () => console.log(`UPSC Notes server running on http://localhost:${PORT}`));
}
start().catch((error) => { console.error(error.message); process.exit(1); });
module.exports = app;

