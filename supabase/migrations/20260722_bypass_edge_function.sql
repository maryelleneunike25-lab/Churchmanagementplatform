-- Paste ALL of this in Supabase SQL Editor, lalu klik Run:
-- https://supabase.com/dashboard/project/nnzqvhkhreesgcjallof/sql/new

-- 1. Anon bisa submit pendaftaran (form jemaat)
DO $$ BEGIN
  CREATE POLICY "anon_insert_registrations" ON kv_store_561004a0
    FOR INSERT TO anon WITH CHECK (key LIKE 'registration:%');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Admin (authenticated) bisa baca, update, hapus pendaftaran
DO $$ BEGIN
  CREATE POLICY "auth_select_registrations" ON kv_store_561004a0
    FOR SELECT TO authenticated USING (key LIKE 'registration:%');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_update_registrations" ON kv_store_561004a0
    FOR UPDATE TO authenticated USING (key LIKE 'registration:%');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "auth_delete_registrations" ON kv_store_561004a0
    FOR DELETE TO authenticated USING (key LIKE 'registration:%');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Admin bisa baca profil user (untuk login)
DO $$ BEGIN
  CREATE POLICY "auth_read_user_profiles" ON kv_store_561004a0
    FOR SELECT TO authenticated USING (key LIKE 'user:%');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Function untuk signup (anon bisa buat profil pending)
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_id TEXT, p_email TEXT, p_name TEXT,
  p_role TEXT DEFAULT 'admin', p_church_branch_id TEXT DEFAULT ''
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO kv_store_561004a0 (key, value) VALUES (
    'user:' || p_id,
    jsonb_build_object('id', p_id, 'email', p_email, 'name', p_name,
      'role', p_role, 'status', 'pending', 'churchBranchId', p_church_branch_id,
      'permissions', '{}'::jsonb, 'createdAt', now()::text, 'updatedAt', now()::text)
  ) ON CONFLICT (key) DO NOTHING;
  RETURN json_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.create_user_profile TO anon, authenticated;
