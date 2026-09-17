import sql from '../../db.js';
import { requireUser } from '../../guard.js';
import { sendJson, sendError, getBody, requireMethod } from '../../http.js';

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

    if (newStatus === 'approved') {
      await sql`
        UPDATE users 
        SET status = ${newStatus}, approved_by = ${admin.id}, approved_at = NOW()
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE users 
        SET status = ${newStatus}, approved_by = null, approved_at = null
        WHERE id = ${id}
      `;
    }
    return sendJson(res, 200, { success: true });
  }

  if (req.method === 'PUT') {
    const body = getBody(req);
    const { role, permissions } = body;
    
    if (role && permissions) {
      await sql`UPDATE users SET role = ${role}, permissions = ${permissions}::jsonb WHERE id = ${id}`;
    } else if (role) {
      await sql`UPDATE users SET role = ${role} WHERE id = ${id}`;
    } else if (permissions) {
      await sql`UPDATE users SET permissions = ${permissions}::jsonb WHERE id = ${id}`;
    }
    
    return sendJson(res, 200, { success: true });
  }

  res.setHeader('Allow', 'POST, PUT');
  return sendError(res, 405, 'Method not allowed');
}
