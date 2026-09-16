import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Sessions will fail.');
}

const COOKIE_NAME = 'gjt_session';

export function issueSessionToken(res, userId, role) {
  const token = jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: '7d' });
  const isProd = process.env.NODE_ENV === 'production';
  // Use httpOnly, Secure (in prod), SameSite=Lax
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${isProd ? '; Secure' : ''}`
  );
}

export function verifySessionToken(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map((c) => {
      const parts = c.split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );

  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return {
      userId: payload.sub,
      role: payload.role
    };
  } catch (err) {
    return null;
  }
}

export function clearSession(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
}
