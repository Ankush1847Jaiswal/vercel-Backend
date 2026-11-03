const bcrypt = require('bcryptjs');
const PRIVATE_CHALLENGES = [
  { id: 'q1', question: 'I ask her 33' },
  { id: 'q2', question: 'I ask her 18' },
  { id: 'q3', question: 'Keyword 1' },
  { id: 'q4', question: 'Keyword 2' },
  { id: 'q5', question: 'Lab number' },
].map((question, index) => ({ ...question, hash: process.env[`CHALLENGE_${index + 1}_HASH`] }));
const normalizeAnswer = (answer) => String(answer ?? '').trim().toLowerCase();
const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
};
const isSectionAuthenticated = (req, id) => !!req.session?.privateAuth?.[id];
const isAdmin = (req) => !!req.session?.isAdmin;
const requireSectionAuth = (id) => (req, res, next) => {
  if (!isSectionAuthenticated(req, id)) return res.status(401).json({ error: 'Authentication required for this section.' });
  res.set('Cache-Control', 'private, no-store');
  return next();
};
const requireAdmin = (req, res, next) => isAdmin(req) ? next() : res.status(401).json({ error: 'Admin authentication required.' });
module.exports = { PRIVATE_CHALLENGES, normalizeAnswer, shuffle, isSectionAuthenticated, requireSectionAuth, isAdmin, requireAdmin };
