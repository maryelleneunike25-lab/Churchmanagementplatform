import sql from '../db.js';
import { requireUser } from '../guard.js';
import { sendJson, sendError, getBody } from '../http.js';

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  // POST: Heartbeat ping from any authenticated admin/user
  if (req.method === 'POST') {
    const { path } = getBody(req);
    const userAgent = req.headers['user-agent'] || null;

    try {
      await sql`
        UPDATE users
        SET 
          last_seen_at = now(),
          last_active_path = ${path ? String(path).slice(0, 255) : null},
          user_agent = ${userAgent ? String(userAgent).slice(0, 255) : null}
        WHERE id = ${user.id}
      `;
      return sendJson(res, 200, { success: true, timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('Heartbeat update error:', err);
      return sendError(res, 500, 'Failed to update heartbeat');
    }
  }

  // GET: Get list of active/online admins (Super Admin only!)
  if (req.method === 'GET') {
    if (user.role !== 'super_admin') {
      return sendError(res, 403, 'Hanya Super Admin yang dapat melihat status admin online.');
    }

    try {
      // Find all admins and super_admins
      const admins = await sql`
        SELECT 
          id,
          name,
          email,
          role,
          status,
          last_seen_at,
          last_active_path,
          user_agent,
          created_at,
          CASE 
            WHEN last_seen_at IS NOT NULL AND last_seen_at >= (now() - interval '3 minutes') THEN 'online'
            WHEN last_seen_at IS NOT NULL AND last_seen_at >= (now() - interval '15 minutes') THEN 'idle'
            ELSE 'offline'
          END AS presence_status,
          CASE 
            WHEN last_seen_at IS NOT NULL THEN EXTRACT(EPOCH FROM (now() - last_seen_at))::int
            ELSE NULL 
          END AS seconds_ago
        FROM users
        WHERE role IN ('admin', 'super_admin')
        ORDER BY 
          CASE 
            WHEN last_seen_at IS NOT NULL AND last_seen_at >= (now() - interval '3 minutes') THEN 1
            WHEN last_seen_at IS NOT NULL AND last_seen_at >= (now() - interval '15 minutes') THEN 2
            ELSE 3
          END ASC,
          last_seen_at DESC NULLS LAST,
          name ASC
      `;

      const onlineCount = admins.filter(a => a.presence_status === 'online').length;
      const idleCount = admins.filter(a => a.presence_status === 'idle').length;
      const totalAdminCount = admins.length;

      return sendJson(res, 200, {
        success: true,
        admins,
        stats: {
          online: onlineCount,
          idle: idleCount,
          total: totalAdminCount,
        }
      });
    } catch (err) {
      console.warn('Get presence error:', err?.message);
      return sendJson(res, 200, {
        success: true,
        admins: [],
        stats: { online: 0, idle: 0, total: 0 },
        quotaExceeded: true
      });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return sendError(res, 405, 'Method not allowed');
}
