export function sendJson(res, statusCode, data) {
  res.status(statusCode).json(data);
}

export function sendError(res, statusCode, message) {
  res.status(statusCode).json({ success: false, error: message });
}

export function getBody(req) {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  return {};
}

export function requireMethod(req, res, method) {
  if (req.method !== method && !(Array.isArray(method) && method.includes(req.method))) {
    res.setHeader('Allow', Array.isArray(method) ? method.join(', ') : method);
    sendError(res, 405, `Method ${req.method} Not Allowed`);
    return false;
  }
  return true;
}
