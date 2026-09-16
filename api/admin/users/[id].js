import sql from '../../../_lib/db.js';
import { requireUser } from '../../../_lib/guard.js';
import { sendJson, sendError, getBody, requireMethod } from '../../../_lib/http.js';

export default async function handler(req, res) {
  const admin = await requireUser(req, res, { role: 'super_admin' });
  if (!admin) return;

  const { id } = req.query;
  if (!id) return sendError(res, 400, 'User ID required');

  if (req.method === 'POST') {
    const { action } = getBody(req);
    let newStatus = '';
    
    if (action === 'approve') newStatus = 'approved';
    else if (action === 'reject') newStatus = 'rejected';
    else if (action === 'suspend') newStatus = 'suspended';
    else return sendError(res, 400, 'Invalid action');

    await sql`
      UPDATE users 
      SET status = ${newStatus}, approved_by = ${newStatus === 'approved' ? admin.id : null}, approved_at = ${newStatus === 'approved' ? sql`now()` : null}
      WHERE id = ${id}
    `;
    return sendJson(res, 200, { success: true });
  }

  if (req.method === 'PUT') {
    const { permissions } = getBody(req);
    await sql`UPDATE users SET permissions = ${permissions}::jsonb WHERE id = ${id}`;
    return sendJson(res, 200, { success: true });
  }

  res.setHeader('Allow', 'POST, PUT');
  return sendError(res, 405, 'Method not allowed');
}
