import re

with open('supabase/functions/server/index.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix dashboard stats logic
stats_replace = '''
  // ===== DASHBOARD STATS =====
  app.get("/make-server-561004a0/stats/dashboard", requireAuth, async (c) => {
    try {
      const newMembers = await kv.getByPrefix("congregation:member:") || [];
      const legacyMembers = await kv.getByPrefix("member:") || [];
      const membersMap = new Map();
      [...legacyMembers, ...newMembers].forEach(m => membersMap.set(m.id, m));
      const members = Array.from(membersMap.values());

      const allKomsels = await kv.getByPrefix("komsel:");
      const komsels = (allKomsels || []).filter((item: any) => item && item.id && item.id.startsWith("komsel_"));
      const pendingApprovals = await kv.getByPrefix("pending_approval:");
  
      // Use UTC+7 for Indonesia context
      const now = new Date();
      const localDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      const today = localDate.toISOString().split('T')[0];
      
      const todaySessions = await kv.getByPrefix(`attendance_session:sess_${today}`);
      let todayAttendance = new Set();
      if (todaySessions && todaySessions.length > 0) {
        todaySessions.forEach((s: any) => {
          if (Array.isArray(s.presentIds)) {
            s.presentIds.forEach((id: string) => todayAttendance.add(id));
          }
        });
      }
  
      return c.json({
        success: true,
        stats: {
          totalMembers: members.length,
          totalKomsel: komsels.filter((k: any) => k.status === 'active').length,
          pendingApprovals: pendingApprovals.length,
          todayAttendance: todayAttendance.size
        }
      });
    } catch (error: any) {
      console.log("Dashboard stats error:", error);
      return c.json({ error: "Failed to load stats: " + error.message }, 500);
    }
  });
'''

code = re.sub(r'// ===== DASHBOARD STATS =====\n.*?app\.get\("/make-server-561004a0/stats/dashboard", requireAuth, async \(c\) => \{.*?\n  \}\);\n', stats_replace.strip() + '\n', code, flags=re.DOTALL)

with open('supabase/functions/server/index.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("done")
