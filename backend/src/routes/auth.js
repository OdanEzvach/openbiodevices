const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { users } = require('../utils/store');

const JWT_SECRET = process.env.JWT_SECRET || 'mi-secreto-super-seguro-cambiar-en-produccion';

// Registro
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña requeridos' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        if (users.has(email)) {
            return res.status(409).json({ error: 'El email ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = {
            id: Date.now().toString(),
            email,
            passwordHash,
            plan: 'free',
            createdAt: new Date().toISOString()
        };
        users.set(email, user);

        const token = jwt.sign(
            { userId: user.id, email: user.email, plan: user.plan },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Usuario registrado con éxito',
            token,
            user: { id: user.id, email: user.email, plan: user.plan }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña requeridos' });
        }

        const user = users.get(email);
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // ✅ GENERAR NUEVO TOKEN CON EL PLAN ACTUAL (puede ser 'premium' si pagó)
        const token = jwt.sign(
            { userId: user.id, email: user.email, plan: user.plan },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: { id: user.id, email: user.email, plan: user.plan }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;