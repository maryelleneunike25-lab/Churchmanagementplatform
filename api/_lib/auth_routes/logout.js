import { clearSession } from '../session.js';
import { sendJson, requireMethod } from '../http.js';

export default function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  clearSession(res);
  return sendJson(res, 200, { success: true });
}
