const crypto = require('crypto');
const axios = require('axios');

const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;
const VARIANT_ID = process.env.LEMON_SQUEEZY_VARIANT_ID;
const WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

async function createCheckout(email, userId) {
  try {
    const response = await axios.post(
      'https://api.lemonsqueezy.com/v1/checkouts',
      {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: email,
              custom: {
                user_id: userId
              }
            }
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: STORE_ID
              }
            },
            variant: {
              data: {
                type: 'variants',
                id: VARIANT_ID
              }
            }
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        }
      }
    );

    return response.data.data.attributes.url;
  } catch (error) {
    console.error('❌ Error creando checkout:', error.response?.data || error.message);
    throw new Error('No se pudo crear la sesión de pago');
  }
}

function verifyWebhookSignature(rawBody, signature) {
  try {
    if (!WEBHOOK_SECRET) {
      console.error('❌ WEBHOOK_SECRET no configurado en .env');
      return false;
    }

    const expected = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature || '', 'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch (error) {
    console.error('❌ Error verificando firma:', error);
    return false;
  }
}

module.exports = { createCheckout, verifyWebhookSignature };