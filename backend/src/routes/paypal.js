const express = require('express');
const router = express.Router();
const axios = require('axios');
const { users } = require('../utils/store');
const { requireAuth } = require('../middleware/auth');

// Credenciales de PayPal desde variables de entorno
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_API_BASE = 'https://api-m.paypal.com'; // Para producción
// const PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com'; // Para pruebas (sandbox)

// Obtener token de acceso de PayPal
async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  try {
    const response = await axios.post(
      `${PAYPAL_API_BASE}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Error obteniendo token de PayPal:', error.response?.data || error.message);
    throw new Error('No se pudo autenticar con PayPal');
  }
}

// Verificar el estado de una suscripción en PayPal
async function verifySubscription(subscriptionID) {
  const token = await getPayPalAccessToken();
  try {
    const response = await axios.get(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionID}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error verificando suscripción:', error.response?.data || error.message);
    throw new Error('No se pudo verificar la suscripción');
  }
}

// Endpoint que llamará el frontend cuando el usuario complete la suscripción
router.post('/subscription-activated', requireAuth, async (req, res) => {
  try {
    const { subscriptionID } = req.body;
    if (!subscriptionID) {
      return res.status(400).json({ error: 'Falta el ID de la suscripción' });
    }

    // Obtener el usuario autenticado
    const userEmail = req.user.email;
    const user = users.get(userEmail);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar la suscripción con PayPal
    const subscriptionData = await verifySubscription(subscriptionID);
    const status = subscriptionData.status;

    // Si la suscripción está activa (ACTIVE, APPROVAL_PENDING, etc.), actualizar a premium
    if (status === 'ACTIVE' || status === 'APPROVAL_PENDING') {
      user.plan = 'premium';
      console.log(`✅ Usuario ${userEmail} actualizado a premium vía PayPal`);
      return res.json({ 
        message: 'Suscripción activada correctamente', 
        plan: 'premium',
        subscriptionID: subscriptionID
      });
    } else {
      return res.status(400).json({ 
        error: `La suscripción no está activa. Estado actual: ${status}`
      });
    }

  } catch (error) {
    console.error('Error en /subscription-activated:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

module.exports = router;