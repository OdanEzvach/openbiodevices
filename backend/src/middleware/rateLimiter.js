const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: process.env.RATE_LIMIT || 100,
  message: {
    error: 'Demasiadas peticiones. Por favor, espera un momento.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = limiter;