const express = require('express');
const router = express.Router();
const { createCheckout, verifyWebhookSignature } = require('../services/lemonSqueezy');
const { users } = require('../utils/store');

// ---- Webhook ----
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const signature = req.headers['x-signature'];
    const rawBody = req.body.toString();

    console.log('🔍 Firma recibida:', signature);
    console.log('🔍 Raw body (primeros 200 chars):', rawBody.substring(0, 200));

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error('❌ Firma inválida');
      return res.status(401).json({ error: 'Firma inválida' });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;
    const data = payload.data;

    console.log('📦 Evento recibido:', eventName);

    if (eventName === 'order_created' || eventName === 'subscription_created') {
      const userEmail = data.attributes.user_email;
      const status = data.attributes.status;

      console.log(`📧 Email: ${userEmail}, Status: ${status}`);

      if (status === 'paid' || status === 'active') {
        console.log(`✅ Pago confirmado para: ${userEmail}`);

        let found = false;
        for (const [email, user] of users) {
          if (email === userEmail) {
            user.plan = 'premium';
            console.log(`✅ Usuario ${email} actualizado a premium`);
            found = true;
            break;
          }
        }

        if (!found) {
          console.log(`⚠️ Usuario ${userEmail} no encontrado, creándolo como premium`);
          users.set(userEmail, {
            id: Date.now().toString(),
            email: userEmail,
            passwordHash: 'dummy',
            plan: 'premium',
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Error en webhook:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});

// ---- Checkout ----
router.post('/create-checkout', express.json(), async (req, res) => {
  try {
    const { email, userId } = req.body;

    if (!email || !userId) {
      return res.status(400).json({ error: 'Email y userId requeridos' });
    }

    const checkoutUrl = await createCheckout(email, userId);
    res.json({ url: checkoutUrl });

  } catch (error) {
    console.error('❌ Error en /create-checkout:', error);
    res.status(500).json({ error: 'Error al crear la sesión de pago' });
  }
});

module.exports = router;