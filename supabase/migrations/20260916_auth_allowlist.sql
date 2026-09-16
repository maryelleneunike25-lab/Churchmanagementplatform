-- Migration to add allowlist check for Google sign-in
CREATE OR REPLACE FUNCTION public.create_user_profile_allowlisted(
  p_id TEXT, p_email TEXT, p_name TEXT,
  p_role TEXT DEFAULT 'admin', p_church_branch_id TEXT DEFAULT ''
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_allowlist_json JSONB;
  v_is_allowlisted BOOLEAN := FALSE;
  v_status TEXT := 'pending';
BEGIN
  -- Read the allowlist from kv_store_561004a0
  SELECT value INTO v_allowlist_json
  FROM kv_store_561004a0
  WHERE key = 'config:auth-allowlist';

  -- Check if email exists in the allowlist array (assuming value is an array of emails)
  IF v_allowlist_json IS NOT NULL AND jsonb_typeof(v_allowlist_json) = 'array' THEN
    IF v_allowlist_json ? p_email THEN
      v_is_allowlisted := TRUE;
      v_status := 'approved';
    END IF;
  END IF;

  INSERT INTO kv_store_561004a0 (key, value) VALUES (
    'user:' || p_id,
    jsonb_build_object(
      'id', p_id, 
      'email', p_email, 
      'name', p_name,
      'role', p_role, 
      'status', v_status, 
      'churchBranchId', p_church_branch_id,
      'permissions', '{}'::jsonb, 
      'createdAt', now()::text, 
      'updatedAt', now()::text
    )
  ) ON CONFLICT (key) DO NOTHING;

  RETURN json_build_object('success', true, 'status', v_status);
END; $$;

GRANT EXECUTE ON FUNCTION public.create_user_profile_allowlisted TO anon, authenticated;
