const express = require('express');
const router = express.Router();
const { users } = require('../utils/store');
const { requireAuth } = require('../middleware/auth');

router.get('/me', requireAuth, (req, res) => {
  try {
    const user = users.get(req.user.email);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({
      id: user.id,
      email: user.email,
      plan: user.plan || 'free'
    });
  } catch (error) {
    console.error('Error en /user/me:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;