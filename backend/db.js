// backend/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

/**
 * 1. 确保 data 目录存在
 */
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory:', dataDir);
}

/**
 * 2. 使用绝对路径打开数据库
 */
const dbPath = path.join(dataDir, 'sentences.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open SQLite database:', err.message);
    process.exit(1);
  } else {
    console.log('SQLite connected:', dbPath);
  }
});

/**
 * 3. 安全建表 + 智能迁移（关键修复）
 */
db.serialize(() => {
  // Step 1: 创建基础表（只在不存在时）
  db.run(`
    CREATE TABLE IF NOT EXISTS sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original TEXT NOT NULL,
      translation TEXT NOT NULL,
      audioPath TEXT NOT NULL,
      explanation TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, () => {
    console.log('基础表已就绪');
  });

  // Step 2: 智能添加字段（只添加不存在的）
  const requiredColumns = [
    { name: 'status', type: 'TEXT', default: "'未练习'" },
    { name: 'isNew', type: 'INTEGER', default: '1' },
    { name: 'difficulty', type: 'TEXT', default: "'中等'" },
    { name: 'isFavorite', type: 'INTEGER', default: '0' },
  ];

  db.all("PRAGMA table_info(sentences)", (err, columns) => {
    if (err) {
      console.error('获取表结构失败:', err);
      return;
    }

    const existing = columns.map(col => col.name);

    requiredColumns.forEach(col => {
      if (!existing.includes(col.name)) {
        const sql = `ALTER TABLE sentences ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}`;
        db.run(sql, (err) => {
          if (err) {
            console.error(`添加 ${col.name} 失败:`, err.message);
          } else {
            console.log(`添加字段: ${col.name}`);
          }
        });
      } else {
        console.log(`字段 ${col.name} 已存在，跳过`);
      }
    });
  });
});

/**
 * 4. 优雅关闭
 */
process.on('SIGINT', () => db.close(() => process.exit(0)));
process.on('SIGTERM', () => db.close(() => process.exit(0)));

module.exports = db;