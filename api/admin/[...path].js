import allowlistHandler from '../_lib/admin_routes/allowlist.js';
import pendingHandler from '../_lib/admin_routes/pending.js';
import usersHandler from '../_lib/admin_routes/users/[id].js';
import { sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  let pathSegments = [];

  if (req.query && req.query.path) {
    pathSegments = Array.isArray(req.query.path)
      ? [...req.query.path]
      : String(req.query.path).split('/').filter(Boolean);
  } else if (req.url) {
    const urlPath = req.url.split('?')[0];
    pathSegments = urlPath.split('/').filter(Boolean);
  }

  // Strip any leading 'api' or 'admin' segments
  while (pathSegments.length > 0 && (pathSegments[0] === 'api' || pathSegments[0] === 'admin')) {
    pathSegments.shift();
  }

  if (!pathSegments.length) {
    return sendError(res, 404, 'Admin route not found');
  }

  const route = pathSegments[0];

  switch (route) {
    case 'allowlist':
      return await allowlistHandler(req, res);
    case 'pending':
      return await pendingHandler(req, res);
    case 'users':
      if (pathSegments.length > 1) {
        req.query.id = pathSegments[1];
        return await usersHandler(req, res);
      }
      return sendError(res, 404, 'User ID missing');
    default:
      return sendError(res, 404, 'Admin route not found');
  }
}

