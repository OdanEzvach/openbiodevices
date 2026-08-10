const jwt = require('jsonwebtoken');
const { users } = require('../utils/store');

const JWT_SECRET = process.env.JWT_SECRET || 'mi-secreto-super-seguro-cambiar-en-produccion';

function generateToken(userId, email, plan = 'free') {
  return jwt.sign({ userId, email, plan }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Middleware: opcional, si hay token lo valida y añade req.user
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

// Middleware: obligatorio (para rutas protegidas)
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  req.user = decoded;
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  optionalAuth,
  requireAuth,
  JWT_SECRET
};