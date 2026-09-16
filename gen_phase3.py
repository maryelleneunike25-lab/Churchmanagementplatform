import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

# kv proxy endpoints
write_file('api/kv/[key].js', '''
import sql from '../../_lib/db.js';
import { requireUser } from '../../_lib/guard.js';
import { sendJson, sendError, getBody } from '../../_lib/http.js';

export default async function handler(req, res) {
  if (!(await requireUser(req, res))) return;

  const { key } = req.query;
  if (!key) return sendError(res, 400, 'Key required');

  if (req.method === 'GET') {
    const records = await sql`SELECT value FROM app_kv WHERE key = ${key}`;
    return sendJson(res, 200, records.length > 0 ? records[0].value : null);
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const value = getBody(req);
    await sql`
      INSERT INTO app_kv (key, value) VALUES (${key}, ${value}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = ${value}::jsonb, updated_at = now()
    `;
    return sendJson(res, 200, { success: true });
  }
  
  if (req.method === 'DELETE') {
    await sql`DELETE FROM app_kv WHERE key = ${key}`;
    return sendJson(res, 200, { success: true });
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE');
  return sendError(res, 405, 'Method not allowed');
}
''')

# komsel endpoint
write_file('api/komsel.js', '''
import sql from '../_lib/db.js';
import { requireUser } from '../_lib/guard.js';
import { sendJson, sendError, getBody } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!(await requireUser(req, res))) return;

  if (req.method === 'GET') {
    const komsels = await sql`
      SELECT k.*, j.name as leader_name 
      FROM komsel k 
      LEFT JOIN jemaat j ON k.leader_jemaat_id = j.id
      ORDER BY k.display_name ASC
    `;
    return sendJson(res, 200, komsels);
  }

  if (req.method === 'POST') {
    const data = getBody(req);
    const { display_name, name_key, day, time, location, leader_jemaat_id } = data;
    
    if (data.id) {
      await sql`
        UPDATE komsel 
        SET display_name = ${display_name}, name_key = ${name_key}, day = ${day}, time = ${time}, location = ${location}, leader_jemaat_id = ${leader_jemaat_id || null}, updated_at = now()
        WHERE id = ${data.id}
      `;
      // two-way linking: if leader changes, update jemaat
      if (leader_jemaat_id) {
         await sql`UPDATE jemaat SET komsel_id = ${data.id} WHERE id = ${leader_jemaat_id}`;
      }
      return sendJson(res, 200, { success: true });
    } else {
      const inserted = await sql`
        INSERT INTO komsel (display_name, name_key, day, time, location, leader_jemaat_id)
        VALUES (${display_name}, ${name_key}, ${day}, ${time}, ${location}, ${leader_jemaat_id || null})
        RETURNING id
      `;
      if (leader_jemaat_id) {
         await sql`UPDATE jemaat SET komsel_id = ${inserted[0].id} WHERE id = ${leader_jemaat_id}`;
      }
      return sendJson(res, 200, inserted[0]);
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return sendError(res, 405, 'Method not allowed');
}
''')

# komisi endpoint
write_file('api/komisi.js', '''
import sql from '../_lib/db.js';
import { requireUser } from '../_lib/guard.js';
import { sendJson, sendError, getBody } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!(await requireUser(req, res))) return;

  if (req.method === 'GET') {
    const { id } = req.query;
    if (id) {
      const members = await sql`
        SELECT km.id, km.role, km.manual_name, km.manual_phone, km.manual_birth_date, j.name, j.phones, j.birth_date
        FROM komisi_members km
        LEFT JOIN jemaat j ON km.jemaat_id = j.id
        WHERE km.komisi_id = ${id}
      `;
      return sendJson(res, 200, members);
    }
    const komisis = await sql`SELECT * FROM komisi`;
    return sendJson(res, 200, komisis);
  }

  res.setHeader('Allow', 'GET');
  return sendError(res, 405, 'Method not allowed');
}
''')

# dashboard endpoint
write_file('api/stats/dashboard.js', '''
import sql from '../../_lib/db.js';
import { requireUser } from '../../_lib/guard.js';
import { sendJson, sendError } from '../../_lib/http.js';

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
''')

print("Generated Phase 3 API endpoints.")
