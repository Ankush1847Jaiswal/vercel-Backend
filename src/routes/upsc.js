const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

// GET public announcements
router.get('/announcements', async (req, res) => {
  await getDb().read();
  const announcements = (getDb().data.upsc_content?.announcements || [])
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date) - new Date(a.date);
    });
  res.json(announcements);
});

// GET current affairs
router.get('/current-affairs', async (req, res) => {
  await getDb().read();
  const { category } = req.query;
  let items = getDb().data.upsc_content?.current_affairs || [];
  if (category) items = items.filter(i => i.category === category);
  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(items);
});

// GET mock questions
router.get('/mock-questions', async (req, res) => {
  await getDb().read();
  const { subject, count = 10 } = req.query;
  let questions = getDb().data.upsc_content?.mock_questions || [];
  if (subject) questions = questions.filter(q => q.subject === subject);

  // Shuffle and limit
  const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, parseInt(count));
  res.json(shuffled);
});

// GET private sections list (no content, just metadata)
router.get('/private-sections', async (req, res) => {
  await getDb().read();
  const sections = (getDb().data.private_sections || [])
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order)
    .map(s => ({ id: s.id, name: s.name, description: s.description, icon: s.icon }));
  res.json(sections);
});

module.exports = router;
