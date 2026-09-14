import { createClient } from '@supabase/supabase-js';
import { projectId } from '/utils/supabase/info';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uenF2aGtocmVlc2djamFsbG9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk3MDQwNSwiZXhwIjoyMDk2NTQ2NDA1fQ.taWeno9y9_UFy2fGWo3VKP-arLxpvciYU6Ds0AYyTpE';

export const supabaseAdmin = createClient(
  `https://${projectId}.supabase.co`,
  SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'supabase-admin-561004a0' } }
);
