import googleHandler from '../_lib/auth_routes/google.js';
import loginHandler from '../_lib/auth_routes/login.js';
import logoutHandler from '../_lib/auth_routes/logout.js';
import meHandler from '../_lib/auth_routes/me.js';
import registerHandler from '../_lib/auth_routes/register.js';
import { sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'google':
      return await googleHandler(req, res);
    case 'login':
      return await loginHandler(req, res);
    case 'logout':
      return await logoutHandler(req, res);
    case 'me':
      return await meHandler(req, res);
    case 'register':
      return await registerHandler(req, res);
    default:
      return sendError(res, 404, 'Auth route not found');
  }
}
