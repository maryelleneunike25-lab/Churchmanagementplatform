import allowlistHandler from '../_lib/admin_routes/allowlist.js';
import pendingHandler from '../_lib/admin_routes/pending.js';
import usersHandler from '../_lib/admin_routes/users/[id].js';
import usersListHandler from '../_lib/admin_routes/users_list.js';
import { sendError } from '../_lib/http.js';

// Reached via the rewrites in vercel.json:
//   /api/admin/:route      -> /api/admin?route=:route
//   /api/admin/:route/:id  -> /api/admin?route=:route&id=:id
export default async function handler(req, res) {
  const { route, id } = req.query || {};

  switch (route) {
    case 'allowlist':
      return await allowlistHandler(req, res);
    case 'pending':
      return await pendingHandler(req, res);
    case 'users':
      if (id) return await usersHandler(req, res);
      return await usersListHandler(req, res);
    default:
      return sendError(res, 404, 'Admin route not found');
  }
}
