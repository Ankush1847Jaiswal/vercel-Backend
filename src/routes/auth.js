const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    await getDb().read();
    const admin = getDb().data.admin;

    if (!admin || admin.username !== username) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error.' });
      req.session.isAdmin = true;
      req.session.adminUsername = username;
      req.session.save((saveError) => {
        if (saveError) return res.status(500).json({ error: 'Session error.' });
        res.json({ success: true, message: 'Admin logged in successfully.' });
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Admin logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout error.' });
    res.clearCookie('upsc.sid');
    res.json({ success: true, message: 'Logged out.' });
  });
});

// Admin status check
router.get('/status', (req, res) => {
  res.json({
    isAdmin: !!(req.session && req.session.isAdmin),
    username: req.session?.adminUsername || null,
  });
});

// Change admin password
router.put('/change-password', requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    await getDb().read();
    const admin = getDb().data.admin;
    const valid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    getDb().data.admin.password_hash = newHash;
    await getDb().write();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

