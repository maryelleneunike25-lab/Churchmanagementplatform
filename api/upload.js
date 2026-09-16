import { put } from '@vercel/blob';
import { requireUser } from './_lib/guard.js';
import { sendJson, sendError } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Method Not Allowed');
  }

  const user = await requireUser(req, res);
  if (!user) return; // guard handles response

  const { filename, path = 'uploads' } = req.query;
  
  if (!filename) {
    return sendError(res, 400, 'filename is required');
  }

  try {
    const blob = await put(`${path}/${Date.now()}-${filename}`, req.body, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return sendJson(res, 200, {
      success: true,
      url: blob.url
    });
  } catch (error) {
    console.error('Upload error:', error);
    return sendError(res, 500, 'Failed to upload file');
  }
}
