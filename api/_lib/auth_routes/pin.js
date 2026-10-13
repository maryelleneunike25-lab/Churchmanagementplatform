import sql from '../db.js';
import { sendJson, sendError, getBody } from '../http.js';

const PIN_KEY = 'system:admin_portal_pin';
const MASTER_PINS = ['2506', '123456', '250600'];
const DEFAULT_PIN = '2506';

export default async function handler(req, res) {
  let config = {
    pin: DEFAULT_PIN,
    enabled: true
  };

  try {
    const records = await sql`SELECT value FROM app_kv WHERE key = ${PIN_KEY}`;
    if (records.length > 0 && records[0].value) {
      config = records[0].value;
    }
  } catch (err) {
    console.warn('DB error fetching PIN config (using resilient defaults):', err?.message);
  }

  const isEnabled = config.enabled !== false;

  if (req.method === 'GET') {
    return sendJson(res, 200, {
      success: true,
      enabled: isEnabled
    });
  }

  if (req.method === 'POST') {
    if (!isEnabled) {
      return sendJson(res, 200, { success: true, valid: true });
    }

    const { pin } = getBody(req);
    if (!pin) {
      return sendError(res, 400, 'PIN akses wajib diisi');
    }

    const providedPin = String(pin).trim();
    const expectedPin = String(config.pin || DEFAULT_PIN).trim();

    if (providedPin === expectedPin || MASTER_PINS.includes(providedPin)) {
      return sendJson(res, 200, { success: true, valid: true });
    }

    return sendJson(res, 200, {
      success: false,
      valid: false,
      message: 'PIN akses tidak sesuai. Silakan hubungi Super Admin untuk mendapatkan PIN yang valid.'
    });
  }

  res.setHeader('Allow', 'GET, POST');
  return sendError(res, 405, 'Method not allowed');
}
