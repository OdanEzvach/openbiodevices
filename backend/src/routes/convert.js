const express = require('express');
const router = express.Router();
const { convertUrlToPdf } = require('../services/pdfGenerator');
const { validateUrl } = require('../utils/validators');
const { usageStore, getUsageKey, incrementUsage } = require('../utils/store');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mi-secreto-super-seguro-cambiar-en-produccion';

// ---- MIDDLEWARE DE AUTENTICACIÓN OPCIONAL ----
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded && decoded.userId) {
                req.user = decoded;
            }
        } catch (e) {
            // Token inválido, ignorar
        }
    }
    next();
}

// ---- MIDDLEWARE DE LÍMITE ----
function usageLimiter(req, res, next) {
    const user = req.user;
    const identifier = user ? user.userId : (req.ip || req.connection.remoteAddress);
    const key = getUsageKey(identifier);

    // Límites según plan (desde el token JWT)
    let limit = 5; // anónimo
    if (user) {
        if (user.plan === 'premium') limit = 100;
        else if (user.plan === 'free') limit = 10;
    }

    const used = usageStore.get(key) || 0;
    const remaining = Math.max(0, limit - used);

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (used >= limit) {
        if (!user) {
            return res.status(429).json({
                error: 'Límite de uso diario alcanzado (5 conversiones). Regístrate para obtener más.',
                register_url: '/register'
            });
        } else {
            return res.status(429).json({
                error: `Has alcanzado el límite de tu plan (${limit} conversiones/día). Actualiza tu plan.`,
                upgrade_url: '/pricing'
            });
        }
    }

    req.usageKey = key;
    next();
}

// ---- RUTA DE CONVERSIÓN ----
router.post('/convert',
    optionalAuth,
    usageLimiter,
    async (req, res, next) => {
        try {
            const { url, mode = 'pdf' } = req.body;

            if (!url) {
                return res.status(400).json({ error: 'La URL es requerida' });
            }

            const validatedUrl = validateUrl(url);
            if (!validatedUrl) {
                return res.status(400).json({ error: 'URL inválida' });
            }

            const result = await convertUrlToPdf(validatedUrl, { mode });

            const { buffer, contentType, isScreenshot } = result;

            // ---- INCREMENTAR USO ANTES DE ENVIAR LA RESPUESTA ----
            if (req.usageKey) {
                const current = usageStore.get(req.usageKey) || 0;
                usageStore.set(req.usageKey, current + 1);
                console.log(`📈 Uso incrementado: ${req.usageKey} → ${current + 1}`);
            }

            if (isScreenshot) {
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Content-Disposition', 'attachment; filename="captura.png"');
            } else {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="documento.pdf"');
            }
            res.setHeader('Content-Length', buffer.length);
            res.send(buffer);

        } catch (error) {
            console.error('❌ Error en conversión:', error);
            if (error.type === 'CLOUDFLARE_BLOCK') {
                return res.status(403).json({
                    error: 'El sitio está protegido por Cloudflare y no permite acceso automatizado. Prueba con otra URL.',
                    type: 'cloudflare'
                });
            }
            next(error);
        }
    }
);

module.exports = router; // <-- Exportar SOLO el router (ya no exportamos usageStore)