const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { usageStore, getUsageKey } = require('../utils/store');

router.get('/', requireAuth, (req, res) => {
    try {
        const userId = req.user.userId;
        const key = getUsageKey(userId);
        const used = usageStore.get(key) || 0;
        res.json({ used });
    } catch (error) {
        console.error('Error en /usage:', error);
        res.status(500).json({ error: 'Error al obtener el uso' });
    }
});

module.exports = router;