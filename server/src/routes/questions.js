import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import Question from '../models/Question.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function parseCsv(buffer) {
  const text = buffer.toString('utf-8');
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records.map((r) => {
    const ansRaw = (r.answer ?? r.Answer ?? r.correct ?? '')
      .toString()
      .trim()
      .toUpperCase();
    const ptsRaw = (r.points ?? r.Points ?? r.score ?? r.Score ?? '1')
      .toString()
      .trim();
    const ptsNum = Number(ptsRaw);
    return {
      question: r.question ?? r.Question ?? r.Q ?? '',
      A: r.A ?? r.optionA ?? r.a ?? '',
      B: r.B ?? r.optionB ?? r.b ?? '',
      C: r.C ?? r.optionC ?? r.c ?? '',
      D: r.D ?? r.optionD ?? r.d ?? '',
      answer: ansRaw,
      points: Number.isFinite(ptsNum) ? ptsNum : 1,
    };
  });
}

router.post('/upload', upload.fields([
  { name: 'level1', maxCount: 1 },
  { name: 'level2', maxCount: 1 },
  { name: 'level3', maxCount: 1 },
  { name: 'low', maxCount: 1 },
  { name: 'medium', maxCount: 1 },
  { name: 'high', maxCount: 1 },
]), async (req, res) => {
  try {
    const round = Number(req.query.round);
    if (![1, 2, 3, 4].includes(round)) {
      return res.status(400).json({ error: 'Invalid round. Must be 1-4.' });
    }

    const files = req.files || {};
    const hasNumeric = files.level1?.[0] && files.level2?.[0] && files.level3?.[0];
    const hasNamed = files.low?.[0] && files.medium?.[0] && files.high?.[0];

    const results = { inserted: 0, levels: {} };

    let mapping;
    if (hasNumeric) {
      mapping = [];
      if (files.level1?.[0]) mapping.push({ label: 'level1', level: 1 });
      if (files.level2?.[0]) mapping.push({ label: 'level2', level: 2 });
      if (files.level3?.[0]) mapping.push({ label: 'level3', level: 3 });
    } else if (hasNamed) {
      mapping = [];
      if (files.low?.[0]) mapping.push({ label: 'low', level: 1 });
      if (files.medium?.[0]) mapping.push({ label: 'medium', level: 2 });
      if (files.high?.[0]) mapping.push({ label: 'high', level: 3 });
    } else {
      mapping = [];
      if (files.level1?.[0]) mapping.push({ label: 'level1', level: 1 });
      if (files.level2?.[0]) mapping.push({ label: 'level2', level: 2 });
      if (files.level3?.[0]) mapping.push({ label: 'level3', level: 3 });
      if (files.low?.[0]) mapping.push({ label: 'low', level: 1 });
      if (files.medium?.[0]) mapping.push({ label: 'medium', level: 2 });
      if (files.high?.[0]) mapping.push({ label: 'high', level: 3 });
    }

    if (!mapping.length) {
      return res.status(400).json({ error: 'At least one CSV file required: low/medium/high or level1/level2/level3.' });
    }

    for (const m of mapping) {
      const file = files[m.label][0];
      const rows = parseCsv(file.buffer);

      const docs = [];
      for (const row of rows) {
        const { question, A, B, C, D, answer, points } = row;
        if (!question || !A || !B || !C || !D || !['A', 'B', 'C', 'D'].includes(answer)) {
          continue;
        }
        const numericPoints = Number(points);
        docs.push({
          round,
          level: m.level,
          question,
          options: { A, B, C, D },
          answer,
          points: Number.isFinite(numericPoints) ? numericPoints : 1,
        });
      }

      if (docs.length) {
        const inserted = await Question.insertMany(docs, { ordered: false });
        results.levels[m.level] = inserted.length;
        results.inserted += inserted.length;
      } else {
        results.levels[m.level] = 0;
      }
    }

    return res.status(201).json({ message: 'Questions uploaded', ...results });
  } catch (err) {
    console.error('Upload questions error:', err);
    const safeMessage = err && err.message ? err.message : 'Server error';
    return res.status(500).json({ error: safeMessage });
  }
});

router.get('/', async (req, res) => {
  try {
    const items = await Question.find().sort({ round: 1, level: 1, createdAt: -1 }).limit(5000);
    res.json(items);
  } catch (err) {
    console.error('List questions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:round/:level', async (req, res) => {
  try {
    const round = Number(req.params.round);
    const level = Number(req.params.level);
    if (![1, 2, 3, 4].includes(round) || ![1, 2, 3].includes(level)) {
      return res.status(400).json({ error: 'Invalid round/level' });
    }
    const items = await Question.find({ round, level }).sort({ createdAt: -1 }).limit(2000);
    res.json(items);
  } catch (err) {
    console.error('List questions by round/level error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
