const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { requireAuth } = require('../middleware/auth');
const { users } = require('../utils/store');

// 1. Crear sesión de checkout (embedded)
router.post('/create-checkout-session', requireAuth, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const userId = req.user.userId;
        const priceId = process.env.STRIPE_PRICE_ID;

        const session = await stripe.checkout.sessions.create({
            ui_mode: 'embedded',
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            mode: 'subscription',
            return_url: `${process.env.FRONTEND_URL}/return.html?session_id={CHECKOUT_SESSION_ID}`,
            client_reference_id: userId,
            customer_email: userEmail,
            metadata: {
                userId: userId,
                email: userEmail
            }
        });

        res.json({ clientSecret: session.client_secret });
    } catch (error) {
        console.error('Error al crear sesión:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Obtener estado de la sesión (para la página de retorno)
router.get('/session-status', async (req, res) => {
    const sessionId = req.query.session_id;
    if (!sessionId) {
        return res.status(400).json({ error: 'Falta session_id' });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        res.json({
            status: session.status,
            customer_email: session.customer_details?.email,
            payment_status: session.payment_status
        });
    } catch (error) {
        console.error('Error al obtener estado de sesión:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Webhook (requiere raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Error al verificar webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const userId = session.metadata.userId;
            const userEmail = session.metadata.email;

            console.log(`✅ Pago confirmado para usuario: ${userId} (${userEmail})`);
            for (const [email, user] of users) {
                if (email === userEmail || user.id === userId) {
                    user.plan = 'premium';
                    console.log(`✅ Usuario ${email} actualizado a premium vía Stripe`);
                    break;
                }
            }
            break;
        default:
            console.log(`Evento no manejado: ${event.type}`);
    }

    res.json({ received: true });
});

module.exports = router;