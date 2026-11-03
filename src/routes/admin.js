const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAdmin } = require('../middleware/auth');
const { getDb } = require('../database');

const router = express.Router();

// Admin: Get overview stats
router.get('/stats', requireAdmin, async (req, res) => {
  await getDb().read();
  const db = getDb().data;
  res.json({
    photos: (db.photos || []).length,
    albums: (db.albums || []).length,
    letters: (db.letters || []).length,
    publishedLetters: (db.letters || []).filter(l => l.published).length,
    diaryEntries: (db.diary_entries || []).length,
    moments: (db.moments || []).length,
    privateSections: (db.private_sections || []).length,
    anniversary: db.anniversary,
  });
});

// Admin: Manage private sections
router.get('/sections', requireAdmin, async (req, res) => {
  await getDb().read();
  res.json(getDb().data.private_sections || []);
});

// Admin: Add new private section
router.post('/sections', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const { name, description, icon = 'lock' } = req.body;
    if (!name) return res.status(400).json({ error: 'Section name required.' });

    const section = {
      id: uuidv4(),
      name, description: description || '', icon, enabled: true,
      order: (getDb().data.private_sections || []).length + 1,
    };
    getDb().data.private_sections.push(section);
    await getDb().write();
    res.json({ success: true, section });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Admin: Update section
router.put('/sections/:id', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const section = getDb().data.private_sections.find(s => s.id === req.params.id);
    if (!section) return res.status(404).json({ error: 'Section not found.' });

    const { name, description, icon, enabled, order } = req.body;
    if (name !== undefined) section.name = name;
    if (description !== undefined) section.description = description;
    if (icon !== undefined) section.icon = icon;
    if (enabled !== undefined) section.enabled = !!enabled;
    if (order !== undefined) section.order = parseInt(order);

    await getDb().write();
    res.json({ success: true, section });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Admin: Manage UPSC announcements
router.post('/announcements', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const { title, content, category, pinned = false } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required.' });

    const item = {
      id: uuidv4(), title, content, category: category || 'general',
      date: new Date().toISOString().split('T')[0], pinned: !!pinned,
    };
    getDb().data.upsc_content.announcements.push(item);
    await getDb().write();
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Admin: Get all content for management
router.get('/content', requireAdmin, async (req, res) => {
  await getDb().read();
  res.json(getDb().data.upsc_content || {});
});

module.exports = router;
