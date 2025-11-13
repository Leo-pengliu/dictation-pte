// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== 'admin' || password !== '123456') {
    return res.status(401).json({ error: '无效凭证' });
  }

  const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });
  res.json({ token });
});

// POST /api/admin/upload-audio - 音频上传
router.post('/upload-audio', auth, upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未上传文件' });
  }
  res.json({ audioPath: `/uploads/${req.file.filename}` });
});

// GET /api/admin/sentences
router.get('/sentences', auth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  db.get('SELECT COUNT(*) as total FROM sentences', (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all(
      `SELECT * FROM sentences ORDER BY id DESC LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          data: rows,
          pagination: {
            page,
            limit,
            total: countRow.total,
            totalPages: Math.ceil(countRow.total / limit)
          }
        });
      }
    );
  });
});

// POST /api/admin/sentences
router.post('/sentences', auth, (req, res) => {
  const {
    original,
    translation = '',
    audioPath = '',
    explanation = '',
    status = '未练习',
    isNew = 1,
    difficulty = '中等',
    isFavorite = 0
  } = req.body;

  const sql = `
    INSERT INTO sentences 
    (original, translation, audioPath, explanation, status, isNew, difficulty, isFavorite) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [original, translation, audioPath, explanation, status, isNew, difficulty, isFavorite], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: '新增成功' });
  });
});

// PATCH /api/admin/sentences/:id - 修复：用 patch
router.patch('/sentences/:id', auth, (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const fields = Object.keys(updates);
  if (!fields.length) return res.status(400).json({ error: '无更新字段' });

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f]);

  db.run(
    `UPDATE sentences SET ${setClause} WHERE id = ?`,
    [...values, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: '未找到记录' });
      res.json({ message: '修改成功' });
    }
  );
});

// DELETE /api/admin/sentences/:id
router.delete('/sentences/:id', auth, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM sentences WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: '未找到记录' });
    res.json({ message: '删除成功' });
  });
});

module.exports = router;