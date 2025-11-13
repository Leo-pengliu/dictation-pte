// backend/migrations/add-missing-columns.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/sentences.db');

const columnsToAdd = [
  { name: 'status', type: 'TEXT', default: '未练习' },
  { name: 'isNew', type: 'INTEGER', default: 1 },
  { name: 'difficulty', type: 'TEXT', default: '中等' },
  { name: 'isFavorite', type: 'INTEGER', default: 0 },
];

db.serialize(() => {
  db.all("PRAGMA table_info(sentences)", (err, columns) => {
    if (err) {
      console.error('获取表结构失败:', err);
      return db.close();
    }

    const existingColumns = columns.map(col => col.name);

    columnsToAdd.forEach(col => {
      if (!existingColumns.includes(col.name)) {
        const sql = `ALTER TABLE sentences ADD COLUMN ${col.name} ${col.type} DEFAULT '${col.default}'`;
        console.log(`添加列: ${col.name}`);
        db.run(sql, (err) => {
          if (err) console.error(`添加 ${col.name} 失败:`, err);
          else console.log(`✓ ${col.name} 添加成功`);
        });
      } else {
        console.log(`列 ${col.name} 已存在，跳过`);
      }
    });
  });
});

db.close(() => console.log('迁移完成'));