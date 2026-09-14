-- RLS policies for registration form (public submit) and admin read
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nnzqvhkhreesgcjallof/sql/new

-- 1. Allow anonymous users to INSERT registration records
CREATE POLICY "anon_insert_registrations"
  ON public.kv_store_561004a0
  FOR INSERT
  TO anon
  WITH CHECK (key LIKE 'registration:%');

-- 2. Allow authenticated (admin) users to read registration records
CREATE POLICY "auth_select_registrations"
  ON public.kv_store_561004a0
  FOR SELECT
  TO authenticated
  USING (key LIKE 'registration:%');

-- 3. Allow authenticated users to update registration status
CREATE POLICY "auth_update_registrations"
  ON public.kv_store_561004a0
  FOR UPDATE
  TO authenticated
  USING (key LIKE 'registration:%');

-- 4. Allow authenticated users to delete registrations
CREATE POLICY "auth_delete_registrations"
  ON public.kv_store_561004a0
  FOR DELETE
  TO authenticated
  USING (key LIKE 'registration:%');
