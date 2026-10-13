import sql from './db.js';

/**
 * Log an administrative or system activity to the audit_log table.
 * @param {Object} params
 * @param {string} params.userId - UUID of user who performed the action
 * @param {string} params.action - e.g. 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'SAVE_ATTENDANCE'
 * @param {string} params.target - e.g. 'Absensi', 'Data Jemaat', 'User Management', 'Keuangan', etc.
 * @param {Object|string} [params.detail] - Details/description of what happened
 */
export async function logActivity({ userId, action, target, detail }) {
  try {
    if (!action || !target) return;
    const detailJson = detail !== undefined ? (typeof detail === 'object' ? JSON.stringify(detail) : JSON.stringify({ message: detail })) : '{}';
    await sql`
      INSERT INTO audit_log (user_id, action, target, detail, at)
      VALUES (${userId || null}, ${String(action).toUpperCase()}, ${String(target)}, ${detailJson}::jsonb, now())
    `;
  } catch (err) {
    console.error('Failed to write audit_log:', err);
  }
}
