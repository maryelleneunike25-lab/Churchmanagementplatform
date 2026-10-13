import sql from '../db.js';
import { requireUser } from '../guard.js';
import { sendJson, sendError, getBody } from '../http.js';
import { logActivity } from '../audit.js';

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  // POST: Record activity log (from client actions)
  if (req.method === 'POST') {
    const { action, target, detail } = getBody(req);
    if (!action || !target) {
      return sendError(res, 400, 'Action and target are required');
    }

    await logActivity({
      userId: user.id,
      action,
      target,
      detail: typeof detail === 'string' ? { message: detail } : detail,
    });

    return sendJson(res, 200, { success: true });
  }

  // GET: View activity logs (Super Admin only!)
  if (req.method === 'GET') {
    if (user.role !== 'super_admin') {
      return sendError(res, 403, 'Hanya Super Admin yang dapat melihat log aktivitas.');
    }

    try {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
      const offset = (page - 1) * limit;

      const actionFilter = req.query.action ? String(req.query.action).toUpperCase() : null;
      const targetFilter = req.query.target ? String(req.query.target) : null;
      const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;

      // Base query with optional filters
      const logs = await sql`
        SELECT 
          l.id,
          l.user_id,
          l.action,
          l.target,
          l.detail,
          l.at,
          u.name AS user_name,
          u.email AS user_email,
          u.role AS user_role
        FROM audit_log l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE 
          (${actionFilter}::text IS NULL OR l.action = ${actionFilter})
          AND (${targetFilter}::text IS NULL OR l.target ILIKE ${'%' + targetFilter + '%'})
          AND (
            ${search}::text IS NULL OR 
            u.name ILIKE ${search} OR 
            u.email ILIKE ${search} OR 
            l.action ILIKE ${search} OR 
            l.target ILIKE ${search} OR
            l.detail::text ILIKE ${search}
          )
        ORDER BY l.at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT count(*)::int AS total
        FROM audit_log l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE 
          (${actionFilter}::text IS NULL OR l.action = ${actionFilter})
          AND (${targetFilter}::text IS NULL OR l.target ILIKE ${'%' + targetFilter + '%'})
          AND (
            ${search}::text IS NULL OR 
            u.name ILIKE ${search} OR 
            u.email ILIKE ${search} OR 
            l.action ILIKE ${search} OR 
            l.target ILIKE ${search} OR
            l.detail::text ILIKE ${search}
          )
      `;

      // Get some top actions for quick filters
      const actionsSummary = await sql`
        SELECT action, count(*)::int as count 
        FROM audit_log 
        GROUP BY action 
        ORDER BY count DESC 
        LIMIT 10
      `;

      return sendJson(res, 200, {
        success: true,
        logs,
        total: countResult[0]?.total || 0,
        page,
        limit,
        actionsSummary,
      });
    } catch (err) {
      console.warn('Fetch activity logs error:', err?.message);
      return sendJson(res, 200, {
        success: true,
        logs: [],
        total: 0,
        page: 1,
        limit: 50,
        actionsSummary: [],
        quotaExceeded: true
      });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return sendError(res, 405, 'Method not allowed');
}
