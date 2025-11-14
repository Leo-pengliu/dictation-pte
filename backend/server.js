// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sentenceRoutes = require('./routes/sentences');
const adminRoutes = require('./routes/admin');
const speakingRoutes = require('./routes/speaking');

const app = express();
const PORT = process.env.PORT || 5001;

// ==================== 1. 确保目录存在 ====================
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(dataDir))   fs.mkdirSync(dataDir,   { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ==================== 2. CORS ====================
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// ==================== 3. 关键：静态文件必须在路由之前！===================
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(uploadsDir, req.path);
  console.log(`[Audio] ${req.method} ${req.url} -> ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[404] File not found: ${filePath}`);
    return res.status(404).send('File not found');
  }
  next();
}, express.static(uploadsDir));

// ==================== 4. 中间件 ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== 5. 路由（放在静态文件之后）===================
app.use('/api/sentences', sentenceRoutes);
app.use('/api/speaking', speakingRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('<h1>Dictation Practice API</h1><p><a href="/health">/health</a></p>');
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Audio files: http://localhost:${PORT}/uploads/filename.mp3`);
});