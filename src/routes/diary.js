const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireSectionAuth, requireAdmin } = require('../middleware/auth');
const { getDb } = require('../database');

const router = express.Router();

// GET diary entries (requires section auth)
router.get('/', requireSectionAuth('diary'), async (req, res) => {
  await getDb().read();
  const { search, sort = 'desc' } = req.query;
  let entries = (getDb().data.diary_entries || []).filter(e => !e.draft);

  if (search) {
    const q = search.toLowerCase();
    entries = entries.filter(e =>
      e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q)
    );
  }

  entries.sort((a, b) => {
    const da = new Date(a.date);
    const db2 = new Date(b.date);
    return sort === 'asc' ? da - db2 : db2 - da;
  });

  res.json(entries);
});

// GET single diary entry (requires section auth)
router.get('/:id', requireSectionAuth('diary'), async (req, res) => {
  await getDb().read();
  const entry = getDb().data.diary_entries.find(e => e.id === req.params.id && !e.draft);
  if (!entry) return res.status(404).json({ error: 'Entry not found.' });
  res.json(entry);
});

// Admin: GET all entries including drafts
router.get('/admin/all', requireAdmin, async (req, res) => {
  await getDb().read();
  const entries = (getDb().data.diary_entries || []).sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(entries);
});

// Admin: Create entry
router.post('/', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const { title, content, date, draft = false, mood = '' } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required.' });

    const entry = {
      id: uuidv4(),
      title,
      content,
      date: date || new Date().toISOString().split('T')[0],
      draft: !!draft,
      mood,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    getDb().data.diary_entries.push(entry);
    await getDb().write();
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Admin: Update entry
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const entry = getDb().data.diary_entries.find(e => e.id === req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });

    const { title, content, date, draft, mood } = req.body;
    if (title !== undefined) entry.title = title;
    if (content !== undefined) entry.content = content;
    if (date !== undefined) entry.date = date;
    if (draft !== undefined) entry.draft = !!draft;
    if (mood !== undefined) entry.mood = mood;
    entry.updated_at = new Date().toISOString();

    await getDb().write();
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Admin: Delete entry
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await getDb().read();
    const idx = getDb().data.diary_entries.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Entry not found.' });
    getDb().data.diary_entries.splice(idx, 1);
    await getDb().write();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

