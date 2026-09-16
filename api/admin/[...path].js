import allowlistHandler from '../_lib/admin_routes/allowlist.js';
import pendingHandler from '../_lib/admin_routes/pending.js';
import usersHandler from '../_lib/admin_routes/users/[id].js';
import { sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  const { path } = req.query; // path is an array: e.g. ['allowlist'], ['pending'], ['users', '123']

  if (!path || !path.length) {
    return sendError(res, 404, 'Admin route not found');
  }

  const route = path[0];

  switch (route) {
    case 'allowlist':
      return await allowlistHandler(req, res);
    case 'pending':
      return await pendingHandler(req, res);
    case 'users':
      // The users handler expects the ID as part of the req.query, or we can just inject it
      if (path.length > 1) {
        req.query.id = path[1];
        return await usersHandler(req, res);
      }
      return sendError(res, 404, 'User ID missing');
    default:
      return sendError(res, 404, 'Admin route not found');
  }
}
