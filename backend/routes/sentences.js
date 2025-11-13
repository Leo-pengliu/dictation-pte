// routes/sentences.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});
const upload = multer({ storage });

// POST: 上传句子 + 查重
router.post('/', upload.single('audio'), (req, res) => {
  const { original, translation, explanation } = req.body;
  const audioPath = `/uploads/${req.file.filename}`;

  if (!original || !translation || !req.file) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  // 1. 查询是否已存在相同 original
  db.get(`SELECT id FROM sentences WHERE original = ?`, [original], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (row) {
      // 2. 已存在 → 删除刚上传的音频 + 返回提示
      const filePath = path.join(uploadDir, req.file.filename);
      fs.unlink(filePath, () => {}); // 异步删除
      return res.status(409).json({ error: '该句子已存在，请添加其他句子' });
    }

    // 3. 不存在 → 插入新记录
    const stmt = db.prepare(`
      INSERT INTO sentences (original, translation, audioPath, explanation)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(original, translation, audioPath, explanation || null, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: '上传成功' });
    });
    stmt.finalize();
  });
});

// GET: 分页获取句子
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 1;
  const offset = (page - 1) * limit;

  // GET /
  db.get(`SELECT COUNT(*) as total FROM sentences`, (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });

    const total = countRow?.total || 0; // ← 防 undefined

    db.all(
      `SELECT * FROM sentences ORDER BY id LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          data: rows,
          pagination: {
            page,
            limit,
            total: total,  // ← 必传！
            totalPages: Math.ceil(total / limit) || 1
          }
        });
      }
    );
  });
});

// PATCH /api/sentences/:id - 更新字段（收藏、状态等）
router.patch('/:id', (req, res) => {
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
      res.json({ message: '更新成功' });
    }
  );
});

// GET /filter - 筛选 + 分页
// routes/sentences.js → GET /filter
// routes/sentences.js → GET /filter
router.get('/filter', (req, res) => {
  const {
    search = '',
    status = '',
    isNew = '',
    difficulty = '',
    isFavorite = '',
    page = 1,
    limit = 20
  } = req.query;

  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (search) {
    where.push(`original LIKE ?`);
    params.push(`%${search}%`);
  }
  if (status) {
    where.push(`COALESCE(status, '未练习') = ?`);
    params.push(status);
  }
  if (isNew !== '') {
    where.push(`COALESCE(isNew, 1) = ?`);
    params.push(isNew);
  }
  if (difficulty) {
    where.push(`COALESCE(difficulty, '中等') = ?`);
    params.push(difficulty);
  }
  if (isFavorite !== '') {
    where.push(`COALESCE(isFavorite, 0) = ?`);
    params.push(Number(isFavorite));
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  // 修复：传 params
  db.get(`SELECT COUNT(*) as total FROM sentences ${whereClause}`, params, (err, count) => {
    if (err) {
      console.error('Count error:', err);
      return res.status(500).json({ error: err.message });
    }

    const total = count?.total || 0;

    db.all(
      `SELECT 
        id, 
        original, 
        audioPath,
        COALESCE(status, '未练习') as status,
        COALESCE(isNew, 1) as isNew,
        COALESCE(difficulty, '中等') as difficulty,
        COALESCE(isFavorite, 0) as isFavorite
       FROM sentences ${whereClause} 
       ORDER BY id DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset],
      (err, rows) => {
        if (err) {
          console.error('Query error:', err);
          return res.status(500).json({ error: err.message });
        }

        res.json({
          data: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            totalPages: Math.ceil(total / limit) || 1
          }
        });
      }
    );
  });
});

// GET /:id - 获取单个句子
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: '无效 ID' });

  db.get('SELECT * FROM sentences WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '未找到' });
    res.json({ data: row }); // ← 包含 audioPath
  });
});

module.exports = router;