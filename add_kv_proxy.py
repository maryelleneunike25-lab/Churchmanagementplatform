import re

with open('supabase/functions/server/index.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

kv_proxy = '''
// ===== GENERIC KV PROXY (For UI Migrations) =====

app.post("/make-server-561004a0/kv/read", requireAuth, async (c) => {
  try {
    const { key, prefix, exact } = await c.req.json();
    if (prefix) {
      const data = await kv.getByPrefix(prefix);
      return c.json({ success: true, data });
    } else if (key) {
      const data = await kv.get(key);
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
    await kv.set(key, value);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-561004a0/kv/delete", requireAuth, async (c) => {
  try {
    const { key } = await c.req.json();
    if (!key) return c.json({ error: "Missing key" }, 400);
    await kv.del(key);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Health check endpoint (no auth required)
'''

code = code.replace('// Health check endpoint (no auth required)', kv_proxy)

with open('supabase/functions/server/index.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Added KV Proxy")
