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
