// backend/routes/speaking.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/speaking/random - 分页获取
router.get('/random', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 1;
  const offset = (page - 1) * limit;

  db.get(`SELECT COUNT(*) as total FROM sentences`, (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });

    const total = countRow?.total || 0;

    db.all(
      `SELECT id, original, audioPath FROM sentences ORDER BY id LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          data: rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1
          }
        });
      }
    );
  });
});

// POST /api/speaking/compare - 前端传文字评分
router.post('/compare', (req, res) => {
  const { originalText, userText } = req.body;

  if (!originalText || !userText) {
    return res.status(400).json({ error: '缺少文本' });
  }

  const score = calculateScore(originalText, userText);
  res.json(score);
});

function calculateScore(original, user) {
  const norm = s => s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  const o = norm(original);
  const u = norm(user);

  let correct = 0;
  for (let i = 0; i < Math.min(o.length, u.length); i++) {
    if (o[i] === u[i]) correct++;
  }

  const accuracy = Math.round((correct / o.length) * 100);
  const fluency = u.length > 0 ? Math.round((o.length / u.length) * 100) : 0;
  const score = Math.round((accuracy + fluency) / 2);

  let feedback = '';
  if (score >= 90) feedback = 'Excellent! Your pronunciation is perfect.';
  else if (score >= 70) feedback = 'Good job! Keep practicing.';
  else if (score >= 50) feedback = 'Not bad, but work on clarity.';
  else feedback = 'Try again! Speak slowly and clearly.';

  return { score, accuracy, fluency, feedback };
}

module.exports = router;