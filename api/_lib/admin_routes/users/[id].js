import bcrypt from 'bcryptjs';
import sql from '../../db.js';
import { requireUser } from '../../guard.js';
import { sendJson, sendError, getBody } from '../../http.js';

const ROLES = ['admin', 'super_admin'];
const STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

async function countOtherActiveSuperAdmins(excludeId) {
  const rows = await sql`
    SELECT count(*)::int AS c FROM users
    WHERE role = 'super_admin' AND status = 'approved' AND id <> ${excludeId}
  `;
  return rows[0].c;
}

export default async function handler(req, res) {
  const admin = await requireUser(req, res, { role: 'super_admin' });
  if (!admin) return;

  const { id } = req.query;
  if (!id) return sendError(res, 400, 'User ID required');

  const targets = await sql`SELECT id, email, role, status FROM users WHERE id = ${id}`;
  if (targets.length === 0) return sendError(res, 404, 'User not found');
  const target = targets[0];

  // Approve / reject / suspend (used by Pending Approvals)
  if (req.method === 'POST') {
    const { action } = getBody(req);
    let newStatus = '';

    if (action === 'approve') newStatus = 'approved';
    else if (action === 'reject') newStatus = 'rejected';
    else if (action === 'suspend') newStatus = 'suspended';
    else return sendError(res, 400, 'Invalid action');

    if (newStatus !== 'approved' && target.id === admin.id) {
      return sendError(res, 400, 'Tidak bisa menonaktifkan akun sendiri');
    }

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

  // Modify name / email / role / status / permissions / password (each field optional)
  if (req.method === 'PUT') {
    const { name, email, role, status, permissions, password } = getBody(req);

    if (role !== undefined && !ROLES.includes(role)) return sendError(res, 400, 'Role tidak valid');
    if (status !== undefined && !STATUSES.includes(status)) return sendError(res, 400, 'Status tidak valid');
    if (name !== undefined && !String(name).trim()) return sendError(res, 400, 'Nama tidak boleh kosong');
    if (password !== undefined && password !== '' && String(password).length < 6) {
      return sendError(res, 400, 'Password minimal 6 karakter');
    }

    const losingSuperAdmin =
      target.role === 'super_admin' &&
      ((role !== undefined && role !== 'super_admin') || (status !== undefined && status !== 'approved'));
    if (losingSuperAdmin) {
      if (target.id === admin.id) return sendError(res, 400, 'Tidak bisa menurunkan atau menonaktifkan akun sendiri');
      if ((await countOtherActiveSuperAdmins(id)) === 0) {
        return sendError(res, 400, 'Harus ada minimal satu Super Admin aktif');
      }
    }

    let newEmail = null;
    if (email !== undefined) {
      newEmail = String(email).trim().toLowerCase();
      if (!newEmail.includes('@')) return sendError(res, 400, 'Email tidak valid');
      const dup = await sql`SELECT id FROM users WHERE email = ${newEmail} AND id <> ${id}`;
      if (dup.length > 0) return sendError(res, 400, 'Email sudah dipakai pengguna lain');
    }

    const hash = password ? await bcrypt.hash(String(password), 10) : null;

    try {
      await sql`
        UPDATE users SET
          name = COALESCE(${name !== undefined ? String(name).trim() : null}, name),
          email = COALESCE(${newEmail}, email),
          role = COALESCE(${role ?? null}, role),
          status = COALESCE(${status ?? null}, status),
          permissions = COALESCE(${permissions !== undefined ? JSON.stringify(permissions) : null}::jsonb, permissions),
          password_hash = COALESCE(${hash}, password_hash)
        WHERE id = ${id}
      `;
      if (status === 'approved' && target.status !== 'approved') {
        await sql`UPDATE users SET approved_by = ${admin.id}, approved_at = NOW() WHERE id = ${id}`;
      }
    } catch (err) {
      console.error('update user error:', err);
      return sendError(res, 500, 'Gagal menyimpan perubahan');
    }
    return sendJson(res, 200, { success: true });
  }

  // Remove
  if (req.method === 'DELETE') {
    if (target.id === admin.id) return sendError(res, 400, 'Tidak bisa menghapus akun sendiri');
    if (target.role === 'super_admin' && target.status === 'approved' && (await countOtherActiveSuperAdmins(id)) === 0) {
      return sendError(res, 400, 'Harus ada minimal satu Super Admin aktif');
    }
    await sql`DELETE FROM users WHERE id = ${id}`;
    return sendJson(res, 200, { success: true });
  }

  res.setHeader('Allow', 'POST, PUT, DELETE');
  return sendError(res, 405, 'Method not allowed');
}
