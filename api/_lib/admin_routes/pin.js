import sql from '../db.js';
import { requireUser } from '../guard.js';
import { sendJson, sendError, getBody } from '../http.js';

const PIN_KEY = 'system:admin_portal_pin';
const DEFAULT_PIN = '123456';

export default async function handler(req, res) {
  const admin = await requireUser(req, res, { role: 'super_admin' });
  if (!admin) return;

  if (req.method === 'GET') {
    const records = await sql`SELECT value FROM app_kv WHERE key = ${PIN_KEY}`;
    const data = records.length > 0 ? records[0].value : {
      pin: DEFAULT_PIN,
      enabled: true,
      updatedAt: null,
      updatedBy: null
    };
    return sendJson(res, 200, { success: true, data });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const { pin, enabled } = getBody(req);
    const newPin = typeof pin === 'string' ? pin.trim() : (pin !== undefined ? String(pin).trim() : null);

    if (newPin !== null && newPin.length < 4) {
      return sendError(res, 400, 'PIN minimal harus terdiri dari 4 digit/karakter');
    }

    // Get current record to preserve pin if only toggling enabled
    const existing = await sql`SELECT value FROM app_kv WHERE key = ${PIN_KEY}`;
    const current = existing.length > 0 ? existing[0].value : { pin: DEFAULT_PIN, enabled: true };

    const payload = {
      pin: newPin || current.pin || DEFAULT_PIN,
      enabled: enabled !== undefined ? Boolean(enabled) : (current.enabled !== false),
      updatedAt: new Date().toISOString(),
      updatedBy: admin.name || admin.email
    };

    await sql`
      INSERT INTO app_kv (key, value)
      VALUES (${PIN_KEY}, ${payload}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = ${payload}::jsonb, updated_at = now()
    `;

    try {
      const { logActivity } = await import('../audit.js');
      await logActivity({
        userId: admin.id,
        action: 'UPDATE',
        target: 'Keamanan (PIN)',
        detail: { message: `Super Admin ${admin.name} mengubah pengaturan Portal PIN`, enabled: payload.enabled },
      });
    } catch {}

    return sendJson(res, 200, { success: true, data: payload });
  }


  res.setHeader('Allow', 'GET, POST, PUT');
  return sendError(res, 405, 'Method not allowed');
}
