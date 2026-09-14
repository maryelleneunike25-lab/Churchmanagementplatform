import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from '../../lib/supabaseClient';

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
    viewPelayan?: boolean;
    editPelayan?: boolean;
    viewPengumuman?: boolean;
    editPengumuman?: boolean;
    viewGaleri?: boolean;
    editGaleri?: boolean;
    viewPendaftaran?: boolean;
    viewReports?: boolean;
    komisiLeaderOf?: string[];
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
    if (!raw || typeof raw !== 'string' || raw.trim()[0] !== '{') {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    if (Date.now() - (parsed.savedAt || 0) > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function clearLocalSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// Load user profile from kv_store using the authenticated Supabase client.
// Works as long as "auth_read_user_profiles" RLS policy exists (SQL migration).
async function loadUserProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('kv_store_561004a0')
      .select('value')
      .eq('key', `user:${userId}`)
      .single();
    if (error || !data?.value) return null;
    return data.value as User;
  } catch {
    return null;
  }
}

// Fallback: try the edge function GET /auth/session (works since GET is not blocked)
async function loadUserViaEdgeFunction(token: string): Promise<User | null> {
  try {
    const res = await fetch(`${API_URL}/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    if (!text?.trim().startsWith('{')) return null;
    const result = JSON.parse(text);
    return result.success && result.user ? result.user : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  // Validate token and load user profile — tries kv_store first, falls back to edge function GET
  const hydrateUser = useCallback(async (token: string): Promise<boolean> => {
    try {
      // First try direct kv_store read (requires auth_read_user_profiles RLS policy)
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      if (authUser) {
        const profile = await loadUserProfile(authUser.id);
        if (profile) {
          setUser(profile);
          setAccessToken(token);
          saveLocalSession(token, profile);
          return true;
        }
      }

      // Fallback: edge function GET (always works for GET requests)
      const profile = await loadUserViaEdgeFunction(token);
      if (profile) {
        setUser(profile);
        setAccessToken(token);
        saveLocalSession(token, profile);
        return true;
      }
    } catch {}
    return false;
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const ok = await hydrateUser(session.access_token);
        if (ok) return;
      }

      const local = loadLocalSession();
      if (local?.token) {
        const ok = await hydrateUser(local.token);
        if (ok) return;
      }

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
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('gjt_') && k !== SESSION_KEY) localStorage.removeItem(k);
        if (k.includes('supabase') || k.includes('sb-')) {
          try { JSON.parse(localStorage.getItem(k) || '{}'); } catch { localStorage.removeItem(k); }
        }
      });
    } catch {}

    checkServerHealth();
    checkSession();

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

  // ── Sign in: direct Supabase auth (bypasses broken edge function POST) ────────
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password')) {
          return { success: false, error: 'Email atau password salah.' };
        }
        return { success: false, error: error.message };
      }

      if (!data.session) {
        return { success: false, error: 'Login gagal, coba lagi.' };
      }

      const token = data.session.access_token;
      const refreshToken = data.session.refresh_token;

      // Load user profile from kv_store (needs auth_read_user_profiles RLS policy)
      // or fall back to edge function GET
      let profile: User | null = await loadUserProfile(data.user.id);
      if (!profile) {
        profile = await loadUserViaEdgeFunction(token);
      }

      if (!profile) {
        await supabase.auth.signOut();
        return { success: false, error: 'Profil pengguna tidak ditemukan. Hubungi Super Admin.' };
      }

      if (profile.status === 'pending') {
        await supabase.auth.signOut();
        return { success: false, error: 'Akun kamu masih menunggu persetujuan Super Admin.', status: 'pending' };
      }
      if (profile.status === 'rejected') {
        await supabase.auth.signOut();
        return { success: false, error: 'Akun kamu ditolak oleh Super Admin.', status: 'rejected' };
      }
      if (profile.status === 'suspended') {
        await supabase.auth.signOut();
        return { success: false, error: 'Akun kamu disuspend. Hubungi Super Admin.', status: 'suspended' };
      }

      await supabase.auth.setSession({ access_token: token, refresh_token: refreshToken });
      setAccessToken(token);
      setUser(profile);
      saveLocalSession(token, profile);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Terjadi kesalahan. Coba lagi.' };
    }
  };

  // ── Sign up: direct Supabase auth + SECURITY DEFINER RPC for profile ─────────
  const signUp = async (data: { email: string; password: string; name: string; role?: string; churchBranchId?: string }) => {
    try {
      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { name: data.name } },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('already registered')) {
          return { success: false, error: 'Email sudah terdaftar. Coba login atau gunakan email lain.' };
        }
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Pendaftaran gagal. Coba lagi.' };
      }

      // Create pending profile via SECURITY DEFINER function (bypasses RLS)
      const { error: rpcError } = await supabase.rpc('create_user_profile', {
        p_id: authData.user.id,
        p_email: data.email,
        p_name: data.name,
        p_role: data.role || 'admin',
        p_church_branch_id: data.churchBranchId || '',
      });

      if (rpcError) {
        console.error('Profile creation error:', rpcError);
        // Don't block the user — profile might be created later
      }

      return {
        success: true,
        message: 'Pendaftaran berhasil! Akun kamu menunggu persetujuan Super Admin.',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Terjadi kesalahan. Coba lagi.' };
    }
  };

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
