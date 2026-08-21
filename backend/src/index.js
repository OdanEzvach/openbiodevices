require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar rutas
const convertRoutes = require('./routes/convert');
const authRoutes = require('./routes/auth');
// const paymentRoutes = require('./routes/payment'); // <-- ELIMINAR
const userRoutes = require('./routes/user');
const usageRoutes = require('./routes/usage');
const paypalRoutes = require('./routes/paypal');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use((req, res, next) => {
    if (req.path === '/api/payment/webhook') {
        return next();
    }
    express.json({ limit: '50mb' })(req, res, next);
});

// ============================================================
// RUTAS
// ============================================================
app.use('/api', convertRoutes);
app.use('/api/auth', authRoutes);
// app.use('/api/payment', paymentRoutes); // <-- ELIMINAR
app.use('/api/user', userRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/paypal', paypalRoutes);

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