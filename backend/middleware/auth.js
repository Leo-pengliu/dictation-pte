// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'your-secret-key'; // 生产用环境变量

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '访问拒绝' });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: '无效令牌' });
  }
};

module.exports = { auth };