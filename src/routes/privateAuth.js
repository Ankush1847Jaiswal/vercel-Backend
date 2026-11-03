const express = require('express');
const bcrypt = require('bcryptjs');
const { PRIVATE_CHALLENGES, normalizeAnswer, shuffle, isSectionAuthenticated } = require('../middleware/auth');
const { getDb } = require('../database');
const router = express.Router();

router.post('/start', async (req, res) => {
  const { sectionId } = req.body;
  if (!sectionId || typeof sectionId !== 'string') return res.status(400).json({ error: 'Section ID required.' });
  await getDb().read();
  const section = (getDb().data.private_sections || []).find((item) => item.id === sectionId && item.enabled);
  if (!section) return res.status(404).json({ error: 'Private section not found.' });
  if (isSectionAuthenticated(req, sectionId)) return res.json({ authenticated: true });

  const order = shuffle(PRIVATE_CHALLENGES).map((q) => q.id);
  req.session.authAttempts ||= {};
  req.session.authAttempts[sectionId] = { order, currentIndex: 0, startedAt: Date.now() };
  const first = PRIVATE_CHALLENGES.find((q) => q.id === order[0]);
  res.set('Cache-Control', 'no-store');
  res.json({ authenticated: false, questionNumber: 1, totalQuestions: PRIVATE_CHALLENGES.length, question: first.question });
});

router.post('/answer', async (req, res) => {
  const { sectionId, answer } = req.body;
  if (!sectionId || answer === undefined || typeof answer !== 'string') return res.status(400).json({ error: 'Section ID and answer are required.' });
  if (isSectionAuthenticated(req, sectionId)) return res.json({ authenticated: true });
  const attempt = req.session.authAttempts?.[sectionId];
  if (!attempt) return res.status(400).json({ error: 'No active authentication attempt. Please start again.' });
  if (Date.now() - attempt.startedAt > 30 * 60 * 1000) {
    delete req.session.authAttempts[sectionId];
    return res.status(400).json({ error: 'Authentication session expired. Please start again.' });
  }
  const challenge = PRIVATE_CHALLENGES.find((item) => item.id === attempt.order[attempt.currentIndex]);
  if (!challenge || !(await bcrypt.compare(normalizeAnswer(answer), challenge.hash))) {
    delete req.session.authAttempts[sectionId];
    return res.status(401).json({ error: 'Incorrect answer. Please start the authentication process again.', resetRequired: true });
  }
  attempt.currentIndex += 1;
  if (attempt.currentIndex === PRIVATE_CHALLENGES.length) {
    req.session.privateAuth ||= {};
    req.session.privateAuth[sectionId] = true;
    delete req.session.authAttempts[sectionId];
    return req.session.save((err) => err ? res.status(500).json({ error: 'Session error.' }) : res.json({ authenticated: true, message: 'Access granted.' }));
  }
  const next = PRIVATE_CHALLENGES.find((item) => item.id === attempt.order[attempt.currentIndex]);
  res.json({ authenticated: false, correct: true, questionNumber: attempt.currentIndex + 1, totalQuestions: PRIVATE_CHALLENGES.length, question: next.question });
});

router.get('/status/:sectionId', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ authenticated: isSectionAuthenticated(req, req.params.sectionId), sectionId: req.params.sectionId });
});
router.post('/lock/:sectionId', (req, res) => {
  if (req.session.privateAuth) delete req.session.privateAuth[req.params.sectionId];
  req.session.save((err) => err ? res.status(500).json({ error: 'Session error.' }) : res.json({ success: true }));
});
router.post('/lock-all', (req, res) => {
  req.session.privateAuth = {};
  req.session.authAttempts = {};
  req.session.save((err) => err ? res.status(500).json({ error: 'Session error.' }) : res.json({ success: true }));
});
module.exports = router;
