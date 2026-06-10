import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  churchBranchId: string;
  permissions?: {
    viewDashboard?: boolean;
    viewJemaat?: boolean;
    editJemaat?: boolean;
    deleteJemaat?: boolean;
    viewAbsensi?: boolean;
    manageAbsensi?: boolean;
    viewKomsel?: boolean;
    editKomsel?: boolean;
    viewKeuangan?: boolean;
    editKeuangan?: boolean;
    viewInventaris?: boolean;
    editInventaris?: boolean;
    viewReports?: boolean;
    viewPengumuman?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  serverStatus: 'unknown' | 'online' | 'offline';
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; status?: string }>;
  signUp: (data: { email: string; password: string; name: string; role?: string; churchBranchId?: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  signOut: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,       // store session in localStorage
      autoRefreshToken: true,     // auto-refresh before expiry
      detectSessionInUrl: false,
    }
  }
);

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-561004a0`;

const SESSION_KEY = 'gjt_cms_session';

function saveLocalSession(token: string, user: User) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user, savedAt: Date.now() }));
  } catch {}
}

function loadLocalSession(): { token: string; user: User } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // expire local cache after 7 days
    if (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearLocalSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  // ── Validate token & fetch user profile from API ─────────────────────────
  const hydrateUser = useCallback(async (token: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success && result.user) {
        setUser(result.user);
        setAccessToken(token);
        saveLocalSession(token, result.user);
        return true;
      }
    } catch {}
    return false;
  }, []);

  // ── Initial session check ─────────────────────────────────────────────────
  const checkSession = useCallback(async () => {
    try {
      // 1. Try Supabase browser session first (survives reload)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const ok = await hydrateUser(session.access_token);
        if (ok) return;
      }

      // 2. Fall back to our localStorage cache
      const local = loadLocalSession();
      if (local?.token) {
        const ok = await hydrateUser(local.token);
        if (ok) return;
      }

      // Nothing worked – user must log in
      setUser(null);
      setAccessToken(null);
      clearLocalSession();
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, [hydrateUser]);

  useEffect(() => {
    checkServerHealth();
    checkSession();

    // Listen for Supabase auth state changes (token refresh, sign-out from another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        await hydrateUser(session.access_token);
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAccessToken(null);
        clearLocalSession();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkServerHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/health`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      setServerStatus(res.ok ? 'online' : 'offline');
    } catch {
      setServerStatus('offline');
    }
  };

  // ── Sign in ───────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    try {
      // Call custom API (handles approval checks, role loading, etc.)
      const res = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (!res.ok) {
        return { success: false, error: result.error || 'Sign in failed', status: result.status };
      }

      // Also sign in via Supabase client so browser session is stored
      const { data: sbData } = await supabase.auth.signInWithPassword({ email, password });
      const token = sbData?.session?.access_token || result.accessToken;

      if (token) {
        setAccessToken(token);
        setUser(result.user);
        saveLocalSession(token, result.user);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // ── Sign up ───────────────────────────────────────────────────────────────
  const signUp = async (data: { email: string; password: string; name: string; role?: string; churchBranchId?: string }) => {
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(data),
      });

      let result;
      try { result = await res.json(); } catch {
        return { success: false, error: 'Server response error. Pastikan Supabase Edge Function sudah di-deploy!' };
      }

      if (!res.ok) {
        return { success: false, error: result?.error || result?.message || `HTTP ${res.status}` };
      }

      return { success: true, message: result.message };
    } catch (error: any) {
      return { success: false, error: `Network error: ${error.message}` };
    }
  };

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAccessToken(null);
    clearLocalSession();
  };

  const refreshSession = async () => { await checkSession(); };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, serverStatus, signIn, signUp, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
