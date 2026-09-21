import sql from '../_lib/db.js';
import { requireUser } from '../_lib/guard.js';
import { sendJson, sendError } from '../_lib/http.js';

// The UI (Data Jemaat, Komisi, Komsel) stores its records in app_kv, so the
// dashboard must count from there or it will always show zeros.
const KOMISI_NAMES = {
  'sekolah-minggu': 'Sekolah Minggu',
  teens: 'Teens',
  vessel: 'Vessel',
  wbi: 'WBI',
  kompas: 'Kompas',
  kowari: 'Kowari',
  koemas: 'Koemas',
};

export default async function handler(req, res) {
  if (!(await requireUser(req, res))) return;

  if (req.method === 'GET') {
    const [members, komisiRows, komselRows, pendingUsers] = await Promise.all([
      sql`SELECT key, value FROM app_kv WHERE key LIKE 'congregation:member:%' OR key LIKE 'member:%'`,
      sql`SELECT value FROM app_kv WHERE key LIKE 'komisi:%:member:%'`,
      sql`SELECT count(*) AS c FROM app_kv WHERE key LIKE 'komsel:%'`,
      sql`SELECT count(*) AS c FROM users WHERE status = 'pending'`,
    ]);

    // Same member may exist under both key formats; count each id once.
    const byId = new Map();
    for (const r of members) {
      if (!r.value?.name) continue;
      byId.set(r.value.id || r.key, r.value);
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    let newRegistrations = 0;
    for (const m of byId.values()) {
      const created = new Date(m.createdAt || m.created_at || 0);
      if (created >= monthStart) newRegistrations++;
    }

    // Count distinct people per komisi (a person can only be in a komisi once).
    const perKomisi = new Map();
    for (const r of komisiRows) {
      const { komisiId, jemaatId, id } = r.value || {};
      if (!komisiId) continue;
      if (!perKomisi.has(komisiId)) perKomisi.set(komisiId, new Set());
      perKomisi.get(komisiId).add(jemaatId || id);
    }

    return sendJson(res, 200, {
      success: true,
      stats: {
        totalMembers: byId.size,
        newRegistrations,
        totalKomsel: parseInt(komselRows[0]?.c || 0),
        pendingApprovals: parseInt(pendingUsers[0]?.c || 0),
        todayAttendance: 0,
        attendanceTrends: [],
        komisiDemographics: [...perKomisi.entries()].map(([id, set]) => ({
          name: KOMISI_NAMES[id] || id,
          value: set.size,
        })),
      },
    });
  }

  res.setHeader('Allow', 'GET');
  return sendError(res, 405, 'Method not allowed');
}
