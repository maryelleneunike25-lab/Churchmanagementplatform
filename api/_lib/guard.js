import sql from './db.js';
import { verifySessionToken } from './session.js';
import { sendError } from './http.js';

export async function requireUser(req, res, options = {}) {
  const tokenPayload = verifySessionToken(req);
  if (!tokenPayload) {
    sendError(res, 401, 'Unauthorized');
    return null;
  }

  try {
    const users = await sql`
      SELECT id, email, name, role, status, permissions
      FROM users
      WHERE id = ${tokenPayload.userId}
    `;

    if (users.length === 0) {
      sendError(res, 401, 'User not found');
      return null;
    }

    const user = users[0];

    if (user.status !== 'approved') {
      sendError(res, 403, 'Account is not approved yet.');
      return null;
    }

    if (options.role && user.role !== options.role) {
      sendError(res, 403, `Requires ${options.role} role.`);
      return null;
    }

    if (options.permission) {
      if (user.role !== 'super_admin' && !user.permissions?.[options.permission]) {
        sendError(res, 403, `Missing permission: ${options.permission}`);
        return null;
      }
    }

    return user;
  } catch (error) {
    console.error('requireUser error:', error);
    sendError(res, 500, 'Internal server error validating session');
    return null;
  }
}
