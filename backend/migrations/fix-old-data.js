// backend/migrations/fix-old-data.js
const db = require('../db');

db.serialize(() => {
  db.run(`
    UPDATE sentences 
    SET status = COALESCE(status, '未练习'),
        difficulty = COALESCE(difficulty, '中等'),
        isFavorite = COALESCE(isFavorite, 0),
        isNew = COALESCE(isNew, 1)
    WHERE status IS NULL OR difficulty IS NULL OR isFavorite IS NULL OR isNew IS NULL
  `, () => {
    console.log('旧数据已补齐');
    db.close();
  });
});