import { api } from './api';

export interface AuditLogItem {
  id: string | number;
  user_id: string;
  action: string;
  target: string;
  detail: any;
  at: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
}

export interface OnlineAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  last_seen_at: string | null;
  last_active_path: string | null;
  user_agent: string | null;
  presence_status: 'online' | 'idle' | 'offline';
  seconds_ago: number | null;
}

/**
 * Log an activity to the backend audit log.
 * Fire-and-forget so UI interactions remain fast.
 */
export async function trackActivity(action: string, target: string, detail?: string | Record<string, any>): Promise<void> {
  try {
    await api.post('/api/admin/activity', {
      action,
      target,
      detail: typeof detail === 'string' ? { message: detail } : (detail || {}),
    });
  } catch (err) {
    // Non-blocking
    console.debug('Activity tracking ignored error:', err);
  }
}

/**
 * Send heartbeat ping for presence tracking.
 */
export async function sendHeartbeat(path?: string): Promise<void> {
  try {
    const currentPath = path || (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '');
    await api.post('/api/admin/presence', { path: currentPath });
  } catch (err) {
    console.debug('Heartbeat ping error:', err);
  }
}

/**
 * Fetch activity logs (Super Admin only).
 */
export async function fetchActivityLogs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  target?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.action) query.set('action', params.action);
  if (params?.target) query.set('target', params.target);

  const res = await api.get(`/api/admin/activity?${query.toString()}`);
  return res;
}

/**
 * Fetch online/active admins list (Super Admin only).
 */
export async function fetchAdminPresence() {
  const res = await api.get('/api/admin/presence');
  return res;
}
