require('dotenv').config();
// FORZAR RE-DESPLIEGUE - 2026-08-26
const express = require('express');
const cors = require('cors');

const convertRoutes = require('./routes/convert');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const usageRoutes = require('./routes/usage');
const stripeRoutes = require('./routes/stripe'); // 👈 Asegúrate de que esta línea exista

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Excluir webhook de Stripe del middleware JSON
app.use((req, res, next) => {
    if (req.path === '/api/stripe/webhook') {
        return next();
    }
    express.json({ limit: '50mb' })(req, res, next);
});

app.use('/api', convertRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/stripe', stripeRoutes); // 👈 Asegúrate de que esta línea exista

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
    console.error('❌ Error no manejado:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`🚀 API de PDF corriendo en http://localhost:${PORT}`);
});