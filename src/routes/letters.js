const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireSectionAuth, requireAdmin } = require('../middleware/auth');
const { getDb } = require('../database');

const router = express.Router();

// GET published letters (requires section auth)
router.get('/', requireSectionAuth('letters'), async (req, res) => {
  await getDb().read();
  const letters = (getDb().data.letters || [])
    .filter(l => l.published)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(letters);
});

// GET a specific letter (requires section auth)
router.get('/:id', requireSectionAuth('letters'), async (req, res) => {
  await getDb().read();
  const letter = getDb().data.letters.find(l => l.id === req.params.id && l.published);
  if (!letter) return res.status(404).json({ error: 'Letter not found.' });
  res.json(letter);
});

// Admin: GET all letters (including drafts)
router.get('/admin/all', requireAdmin, async (req, res) => {
  await getDb().read();
  const letters = (getDb().data.letters || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(letters);
});

// Admin: Create letter
router.post('/', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const { title, content, date, published = false } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required.' });

    const letter = {
      id: uuidv4(),
      title,
      content,
      date: date || new Date().toISOString().split('T')[0],
      published: !!published,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    getDb().data.letters.push(letter);
    await getDb().write();
    res.json({ success: true, letter });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Admin: Update letter
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const letter = getDb().data.letters.find(l => l.id === req.params.id);
    if (!letter) return res.status(404).json({ error: 'Letter not found.' });

    const { title, content, date, published } = req.body;
    if (title !== undefined) letter.title = title;
    if (content !== undefined) letter.content = content;
    if (date !== undefined) letter.date = date;
    if (published !== undefined) letter.published = !!published;
    letter.updated_at = new Date().toISOString();

    await getDb().write();
    res.json({ success: true, letter });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Admin: Delete letter
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const idx = getDb().data.letters.findIndex(l => l.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Letter not found.' });
    getDb().data.letters.splice(idx, 1);
    await getDb().write();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

