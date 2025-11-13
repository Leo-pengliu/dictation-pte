-- backend/data/fix-schema.sql
ALTER TABLE sentences ADD COLUMN status TEXT DEFAULT '未练习';
ALTER TABLE sentences ADD COLUMN difficulty TEXT DEFAULT '中等';
ALTER TABLE sentences ADD COLUMN isFavorite INTEGER DEFAULT 0;
ALTER TABLE sentences ADD COLUMN isNew INTEGER DEFAULT 1;