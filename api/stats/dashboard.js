import sql from '../_lib/db.js';
import { requireUser } from '../_lib/guard.js';
import { sendJson, sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!(await requireUser(req, res))) return;

  if (req.method === 'GET') {
    const totalJemaat = await sql`SELECT count(*) as c FROM jemaat WHERE status = 'active'`;
    
    // Monthly new registrations (UTC+7 approximation)
    const newRegistrations = await sql`
      SELECT count(*) as c FROM jemaat 
      WHERE created_at >= date_trunc('month', (now() AT TIME ZONE 'Asia/Jakarta'))
    `;

    // Attendance trends (last 4 weeks)
    const trends = await sql`
      SELECT s.date, count(p.jemaat_id) as count
      FROM attendance_sessions s
      LEFT JOIN attendance_present p ON s.id = p.session_id
      GROUP BY s.date
      ORDER BY s.date DESC
      LIMIT 4
    `;

    // Komisi counts
    const komisiCounts = await sql`
      SELECT k.name, count(km.id) as count
      FROM komisi k
      LEFT JOIN komisi_members km ON k.id = km.komisi_id
      GROUP BY k.name
    `;

    return sendJson(res, 200, {
      totalCongregation: parseInt(totalJemaat[0].c),
      newRegistrations: parseInt(newRegistrations[0].c),
      attendanceTrends: trends.map(t => ({ week: t.date, count: parseInt(t.count) })).reverse(),
      komisiDemographics: komisiCounts.map(k => ({ name: k.name, value: parseInt(k.count) }))
    });
  }

  res.setHeader('Allow', 'GET');
  return sendError(res, 405, 'Method not allowed');
}
