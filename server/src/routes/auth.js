import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/register', async (req, res) => {
  try {
    let { registrationId, password, confirmPassword } = req.body || {};

    registrationId = (registrationId ?? '').toString().trim();
    password = (password ?? '').toString();
    confirmPassword = (confirmPassword ?? '').toString();

    if (!registrationId || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Relaxed minimum to unblock immediate registrations
    if (password.length < 1) {
      return res.status(400).json({ error: 'Password must not be empty.' });
    }

    const existing = await User.findOne({ registrationId });
    if (existing) {
      return res.status(200).json({ message: 'Already registered', userId: existing._id });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ registrationId, passwordHash });

    return res.status(201).json({ message: 'Registered successfully', userId: user._id });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/leaderboard', async (_req, res) => {
  try {
    const users = await User.find(
      {},
      { registrationId: 1, score: 1, correct: 1, wrong: 1, createdAt: 1 }
    )
      .sort({ score: -1, correct: -1, createdAt: 1 })
      .lean();

    const rows = users.map((u) => ({
      registrationId: u.registrationId,
      score: Number(u.score || 0),
      correct: Number(u.correct || 0),
      wrong: Number(u.wrong || 0),
    }));

    return res.json(rows);
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/leaderboard/update', async (req, res) => {
  try {
    let { registrationId, score, correct, wrong } = req.body || {};

    registrationId = (registrationId ?? '').toString().trim();
    if (!registrationId) {
      return res.status(400).json({ error: 'registrationId is required' });
    }

    const update = {};
    if (score !== undefined) update.score = Number(score) || 0;
    if (correct !== undefined) update.correct = Number(correct) || 0;
    if (wrong !== undefined) update.wrong = Number(wrong) || 0;

    const user = await User.findOneAndUpdate(
      { registrationId },
      { $set: update },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      message: 'Scores updated',
      registrationId: user.registrationId,
      score: user.score ?? 0,
      correct: user.correct ?? 0,
      wrong: user.wrong ?? 0,
    });
  } catch (err) {
    console.error('Leaderboard update error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users/count', async (_req, res) => {
  try {
    const count = await User.countDocuments();
    return res.json({ count });
  } catch (err) {
    console.error('Users count error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', async (_req, res) => {
  try {
    const users = await User.find({}, { registrationId: 1, createdAt: 1, passwordHash: 1 })
      .sort({ createdAt: -1 })
      .lean();
    return res.json(users);
  } catch (err) {
    console.error('Users list error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
 
// CSV Upload format:
// Headers accepted (case-insensitive): registrationId, password
// POST /api/users/upload  (multipart/form-data)
// field name: 'file' (or 'users')
router.post('/users/upload', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'users', maxCount: 1 },
]), async (req, res) => {
  try {
    const file = req.files?.file?.[0] || req.files?.users?.[0];
    if (!file) {
      return res.status(400).json({ error: 'CSV file is required (field name: file or users).' });
    }

    const text = file.buffer.toString('utf-8');
    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true });
    let inserted = 0; let skippedExisting = 0; let invalid = 0;

    for (const r of records) {
      const registrationId = (r.registrationId ?? r.RegistrationId ?? r.registrationid ?? '').toString().trim();
      const password = (r.password ?? r.Password ?? r.pass ?? '').toString();
      if (!registrationId || !password) { invalid++; continue; }

      const existing = await User.findOne({ registrationId }).lean();
      if (existing) { skippedExisting++; continue; }

      const passwordHash = await bcrypt.hash(password, 10);
      await User.create({ registrationId, passwordHash });
      inserted++;
    }

    return res.status(201).json({ message: 'Users upload processed', inserted, skippedExisting, invalid, totalRows: records.length });
  } catch (err) {
    console.error('Users CSV upload error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});
