import re

with open('supabase/functions/server/index.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

kv_proxy = '''
// ===== GENERIC KV PROXY (For UI Migrations) =====

app.post("/make-server-561004a0/kv/read", requireAuth, async (c) => {
  try {
    const { key, prefix, exact } = await c.req.json();
    const supabase = getSupabaseClient();
    if (prefix) {
      const { data, error } = await supabase.from("kv_store_561004a0").select("key, value").like("key", prefix + "%");
      if (error) throw error;
      return c.json({ success: true, data: data || [] });
    } else if (key) {
      const { data, error } = await supabase.from("kv_store_561004a0").select("key, value").eq("key", key).maybeSingle();
      if (error) throw error;
      return c.json({ success: true, data });
    }
    return c.json({ error: "Missing key or prefix" }, 400);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-561004a0/kv/write", requireAuth, async (c) => {
  try {
    const { key, value } = await c.req.json();
    if (!key || value === undefined) return c.json({ error: "Missing key or value" }, 400);
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("kv_store_561004a0").upsert({ key, value });
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-561004a0/kv/delete", requireAuth, async (c) => {
  try {
    const { key } = await c.req.json();
    if (!key) return c.json({ error: "Missing key" }, 400);
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("kv_store_561004a0").delete().eq("key", key);
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Health check endpoint (no auth required)
'''

# Find the existing proxy block and replace it
# Since it starts with // ===== GENERIC KV PROXY and ends before // Health check
proxy_regex = re.compile(r'// ===== GENERIC KV PROXY.*?// Health check endpoint \(no auth required\)', re.DOTALL)
code = proxy_regex.sub(kv_proxy.strip(), code)

with open('supabase/functions/server/index.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated KV Proxy")
