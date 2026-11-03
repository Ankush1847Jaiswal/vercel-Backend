const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { requireSectionAuth, requireAdmin } = require('../middleware/auth');
const { getDb } = require('../database');

const router = express.Router();

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || './private_uploads');

// Multer storage - files go to private_uploads, NOT public
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const albumDir = path.join(UPLOADS_DIR, 'photos');
    if (!fs.existsSync(albumDir)) fs.mkdirSync(albumDir, { recursive: true });
    cb(null, albumDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files are allowed.'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// GET all albums (requires section auth)
router.get('/albums', requireSectionAuth('photos'), async (req, res) => {
  await getDb().read();
  res.json(getDb().data.albums || []);
});

// GET photos (requires section auth)
router.get('/', requireSectionAuth('photos'), async (req, res) => {
  await getDb().read();
  const { albumId } = req.query;
  let photos = getDb().data.photos || [];
  if (albumId && albumId !== 'all') {
    photos = photos.filter(p => p.album_id === albumId);
  }
  // Don't expose file paths, return IDs for serving
  const safePhotos = photos.map(p => ({
    id: p.id,
    album_id: p.album_id,
    caption: p.caption,
    date: p.date,
    created_at: p.created_at,
  }));
  res.json(safePhotos);
});

// GET a specific photo file (requires section auth - image served by backend)
router.get('/file/:photoId', requireSectionAuth('photos'), async (req, res) => {
  await getDb().read();
  const photo = getDb().data.photos.find(p => p.id === req.params.photoId);
  if (!photo) return res.status(404).json({ error: 'Photo not found.' });

  const filePath = path.join(UPLOADS_DIR, 'photos', photo.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found.' });

  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.sendFile(filePath);
});

// Upload photos (admin only)
router.post('/upload', requireAdmin, upload.array('photos', 20), async (req, res) => {
  try {
    await getDb().read();
    const { albumId = 'default', caption = '', date = '' } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const newPhotos = req.files.map(file => ({
      id: uuidv4(),
      album_id: albumId,
      filename: file.filename,
      caption: caption || '',
      date: date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    }));

    getDb().data.photos.push(...newPhotos);
    await getDb().write();

    res.json({ success: true, photos: newPhotos.map(p => ({ id: p.id, caption: p.caption, date: p.date })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed.' });
  }
});

// Create album (admin only)
router.post('/albums', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const { name, description = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'Album name required.' });

    const album = { id: uuidv4(), name, description, created_at: new Date().toISOString() };
    getDb().data.albums.push(album);
    await getDb().write();
    res.json({ success: true, album });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Delete photo (admin only)
router.delete('/:photoId', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const idx = getDb().data.photos.findIndex(p => p.id === req.params.photoId);
    if (idx === -1) return res.status(404).json({ error: 'Photo not found.' });

    const photo = getDb().data.photos[idx];
    const filePath = path.join(UPLOADS_DIR, 'photos', photo.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    getDb().data.photos.splice(idx, 1);
    await getDb().write();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update photo caption/date (admin only)
router.put('/:photoId', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const photo = getDb().data.photos.find(p => p.id === req.params.photoId);
    if (!photo) return res.status(404).json({ error: 'Photo not found.' });

    const { caption, date, album_id } = req.body;
    if (caption !== undefined) photo.caption = caption;
    if (date !== undefined) photo.date = date;
    if (album_id !== undefined) photo.album_id = album_id;

    await getDb().write();
    res.json({ success: true, photo: { id: photo.id, caption: photo.caption, date: photo.date } });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

