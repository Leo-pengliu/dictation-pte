// backend/db.js
const { createClient } = require('@libsql/client');

/**
 * 1. 检查环境变量
 */
if (!process.env.TURSO_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('Turso environment variables missing');
  console.error('TURSO_URL:', process.env.TURSO_URL);
  console.error('TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? 'SET' : 'MISSING');
  process.exit(1);
}

/**
 * 2. 创建 Turso 客户端
 */
const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

/**
 * 3. 兼容 SQLite API
 */
const db = {
  get: (sql, params = []) => 
    client.execute({ sql, args: params }).then(r => r.rows[0]),
  
  all: (sql, params = []) => 
    client.execute({ sql, args: params }).then(r => r.rows),
  
  run: (sql, params = []) => 
    client.execute({ sql, args: params }).then(r => ({ 
      changes: r.rowsAffected,
      lastID: r.lastInsertRowid 
    }))
};

/**
 * 4. 初始化表结构
 */
(async () => {
  try {
    // 创建基础表
    await db.run(`
      CREATE TABLE IF NOT EXISTS sentences (
        id INTEGER PRIMARY KEY,
        original TEXT NOT NULL,
        translation TEXT NOT NULL,
        audioPath TEXT NOT NULL,
        explanation TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT '未练习',
        isNew INTEGER DEFAULT 1,
        difficulty TEXT DEFAULT '中等',
        isFavorite INTEGER DEFAULT 0
      )
    `);
    console.log('Turso 数据库已就绪');
  } catch (err) {
    console.error('Turso 初始化失败:', err.message);
    process.exit(1);
  }
})();

module.exports = db;