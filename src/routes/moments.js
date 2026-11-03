const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { requireSectionAuth, requireAdmin } = require('../middleware/auth');
const { getDb } = require('../database');

const router = express.Router();
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || './private_uploads');

// Multer for moment photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'moments');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// GET moments timeline (section auth)
router.get('/', requireSectionAuth('moments'), async (req, res) => {
  await getDb().read();
  const moments = (getDb().data.moments || []).sort((a, b) => new Date(a.date) - new Date(b.date));
  const safe = moments.map(m => ({
    id: m.id, title: m.title, description: m.description, date: m.date,
    caption: m.caption, type: m.type, hasPhoto: !!m.photo_filename, created_at: m.created_at,
  }));
  res.json(safe);
});

// GET moment photo file (section auth)
router.get('/photo/:momentId', requireSectionAuth('moments'), async (req, res) => {
  await getDb().read();
  const moment = getDb().data.moments.find(m => m.id === req.params.momentId);
  if (!moment || !moment.photo_filename) return res.status(404).json({ error: 'Photo not found.' });

  const filePath = path.join(UPLOADS_DIR, 'moments', moment.photo_filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found.' });
  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.sendFile(filePath);
});

// GET anniversary config (section auth)
router.get('/anniversary', requireSectionAuth('moments'), async (req, res) => {
  await getDb().read();
  res.json(getDb().data.anniversary || {});
});

// Admin: Create moment
router.post('/', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    await getDb().read();
    const { title, description, date, caption, type = 'general' } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Title and date required.' });

    const moment = {
      id: uuidv4(),
      title, description: description || '', date, caption: caption || '',
      type,
      photo_filename: req.file ? req.file.filename : null,
      created_at: new Date().toISOString(),
    };
    getDb().data.moments.push(moment);
    await getDb().write();
    res.json({ success: true, moment: { ...moment, photo_filename: undefined, hasPhoto: !!moment.photo_filename } });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Admin: Update moment
router.put('/:id', requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    await getDb().read();
    const moment = getDb().data.moments.find(m => m.id === req.params.id);
    if (!moment) return res.status(404).json({ error: 'Moment not found.' });

    const { title, description, date, caption, type } = req.body;
    if (title !== undefined) moment.title = title;
    if (description !== undefined) moment.description = description;
    if (date !== undefined) moment.date = date;
    if (caption !== undefined) moment.caption = caption;
    if (type !== undefined) moment.type = type;
    if (req.file) moment.photo_filename = req.file.filename;

    await getDb().write();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Admin: Configure anniversary
router.put('/anniversary/config', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const { day, month, year, message, configured } = req.body;
    const anniversary = getDb().data.anniversary;
    if (day !== undefined) anniversary.day = parseInt(day);
    if (month !== undefined) anniversary.month = parseInt(month);
    if (year !== undefined) anniversary.year = parseInt(year);
    if (message !== undefined) anniversary.message = message;
    if (configured !== undefined) anniversary.configured = !!configured;
    await getDb().write();
    res.json({ success: true, anniversary: getDb().data.anniversary });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Admin: Delete moment
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const idx = getDb().data.moments.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Moment not found.' });

    const moment = getDb().data.moments[idx];
    if (moment.photo_filename) {
      const fp = path.join(UPLOADS_DIR, 'moments', moment.photo_filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    getDb().data.moments.splice(idx, 1);
    await getDb().write();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

