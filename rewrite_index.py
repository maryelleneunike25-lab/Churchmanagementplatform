import re

with open('supabase/functions/server/index.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update `/stats/dashboard`
code = re.sub(
    r'const members = await kv\.getByPrefix\("member:"\);',
    r'''const newMembers = await kv.getByPrefix("congregation:member:") || [];
    const legacyMembers = await kv.getByPrefix("member:") || [];
    const membersMap = new Map();
    [...legacyMembers, ...newMembers].forEach(m => membersMap.set(m.id, m));
    const members = Array.from(membersMap.values());''',
    code
)

code = re.sub(
    r'const komsels = await kv\.getByPrefix\("komsel:"\);',
    r'''const allKomsels = await kv.getByPrefix("komsel:");
    const komsels = (allKomsels || []).filter(item => item && item.id && item.id.startsWith("komsel_"));''',
    code
)

code = re.sub(
    r'const todayAttendance = await kv\.get\(`attendance:date:\$\{today\}`\) \|\| \[\];',
    r'''const todaySessions = await kv.getByPrefix(`attendance_session:sess_${today}`);
    let todayAttendance = [];
    if (todaySessions && todaySessions.length > 0) {
      todayAttendance = todaySessions.flatMap(s => s.presentIds || []);
    }''',
    code
)

# 2. Update `/congregation/members` GET
code = re.sub(
    r'app\.get\("/make-server-561004a0/congregation/members", requireAuth, async \(c\) => \{\s*try \{\s*const members = await kv\.getByPrefix\("member:"\);',
    r'''app.get("/make-server-561004a0/congregation/members", requireAuth, async (c) => {
  try {
    const newMembers = await kv.getByPrefix("congregation:member:") || [];
    const legacyMembers = await kv.getByPrefix("member:") || [];
    const membersMap = new Map();
    [...legacyMembers, ...newMembers].forEach(m => membersMap.set(m.id, m));
    const members = Array.from(membersMap.values());''',
    code
)

# 3. Update `/congregation/members` POST
# Find POST endpoint and replace the KV save and komsel logic
post_regex = re.compile(r'app\.post\("/make-server-561004a0/congregation/members", requireAuth, async \(c\) => \{.*?(?=return c\.json)', re.DOTALL)
def replace_post(match):
    original = match.group(0)
    # We strip out the komsel.members logic and use congregation:member:
    new_code = '''app.post("/make-server-561004a0/congregation/members", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const memberId = data.id || `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const member = {
      ...data,
      id: memberId,
      joinDate: data.joinDate || new Date().toISOString(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId
    };

    await kv.set(`congregation:member:${memberId}`, member);

    // Audit log
    await kv.set(`audit:${Date.now()}:member_create`, {
      action: "member_created",
      memberId,
      userId,
      timestamp: new Date().toISOString()
    });
    '''
    return new_code
code = post_regex.sub(replace_post, code)

# 4. Update `/congregation/members/:id` PUT
put_regex = re.compile(r'app\.put\("/make-server-561004a0/congregation/members/:id", requireAuth, async \(c\) => \{.*?(?=return c\.json)', re.DOTALL)
def replace_put(match):
    new_code = '''app.put("/make-server-561004a0/congregation/members/:id", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const memberId = c.req.param("id");
    const data = await c.req.json();

    let existingMember = await kv.get(`congregation:member:${memberId}`);
    if (!existingMember) existingMember = await kv.get(`member:${memberId}`);
    
    if (!existingMember) {
      return c.json({ error: "Member not found" }, 404);
    }

    const updatedMember = {
      ...existingMember,
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    await kv.set(`congregation:member:${memberId}`, updatedMember);

    // Audit log
    await kv.set(`audit:${Date.now()}:member_update`, {
      action: "member_updated",
      memberId,
      userId,
      timestamp: new Date().toISOString()
    });
    '''
    return new_code
code = put_regex.sub(replace_put, code)

# 5. Update `/congregation/members/:id` DELETE
delete_regex = re.compile(r'app\.delete\("/make-server-561004a0/congregation/members/:id", requireAuth, async \(c\) => \{.*?(?=return c\.json)', re.DOTALL)
def replace_delete(match):
    new_code = '''app.delete("/make-server-561004a0/congregation/members/:id", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const memberId = c.req.param("id");

    await kv.del(`congregation:member:${memberId}`);
    await kv.del(`member:${memberId}`);

    // Audit log
    await kv.set(`audit:${Date.now()}:member_delete`, {
      action: "member_deleted",
      memberId,
      userId,
      timestamp: new Date().toISOString()
    });
    '''
    return new_code
code = delete_regex.sub(replace_delete, code)

# 6. Update `/komsel/list`
list_komsel_regex = re.compile(r'app\.get\("/make-server-561004a0/komsel/list", requireAuth, async \(c\) => \{.*?(?=return c\.json)', re.DOTALL)
def replace_list_komsel(match):
    return '''app.get("/make-server-561004a0/komsel/list", requireAuth, async (c) => {
  try {
    const allKomsels = await kv.getByPrefix("komsel:");
    const komsels = allKomsels.filter((item: any) => item.id && item.id.startsWith('komsel_'));

    // Get all members to compute membership dynamically
    const newMembers = await kv.getByPrefix("congregation:member:") || [];
    const legacyMembers = await kv.getByPrefix("member:") || [];
    const membersMap = new Map();
    [...legacyMembers, ...newMembers].forEach(m => membersMap.set(m.id, m));
    const allMembers = Array.from(membersMap.values());

    for (const komsel of komsels) {
      const komselMembers = allMembers.filter(m => m.komselId === komsel.id);
      komsel.memberCount = komselMembers.length;
      
      const memberDetails = komselMembers.map(m => ({
        id: m.id,
        name: m.name,
        phone: m.phone,
        address: m.address
      }));
      
      komsel.memberDetails = memberDetails;
    }
    '''
code = list_komsel_regex.sub(replace_list_komsel, code)


# 7. Update `/komsel/create`
create_komsel_regex = re.compile(r'app\.post\("/make-server-561004a0/komsel/create", requireAuth, async \(c\) => \{.*?(?=return c\.json)', re.DOTALL)
def replace_create_komsel(match):
    return '''app.post("/make-server-561004a0/komsel/create", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    if (!data.name || !data.pksName) {
      return c.json({ error: "Name and pksName are required" }, 400);
    }

    const komselId = `komsel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const komsel = {
      id: komselId,
      name: data.name,
      pksName: data.pksName, // Normalizer should run on frontend before saving
      status: data.status || "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId,
      leaderId: data.leaderId || null
    };

    await kv.set(`komsel:${komselId}`, komsel);

    // Audit log
    await kv.set(`audit:${Date.now()}:komsel_create`, {
      action: "komsel_created",
      komselId,
      userId,
      timestamp: new Date().toISOString()
    });
    '''
code = create_komsel_regex.sub(replace_create_komsel, code)


# 8. Update `/komsel/:id` PUT
put_komsel_regex = re.compile(r'app\.put\("/make-server-561004a0/komsel/:id", requireAuth, async \(c\) => \{.*?(?=return c\.json)', re.DOTALL)
def replace_put_komsel(match):
    return '''app.put("/make-server-561004a0/komsel/:id", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const komselId = c.req.param("id");
    const data = await c.req.json();

    const existingKomsel = await kv.get(`komsel:${komselId}`);
    if (!existingKomsel) {
      return c.json({ error: "Komsel not found" }, 404);
    }

    const updatedKomsel = {
      ...existingKomsel,
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    // Note: Do not override dynamically computed memberCount or memberDetails
    await kv.set(`komsel:${komselId}`, updatedKomsel);

    // Audit log
    await kv.set(`audit:${Date.now()}:komsel_update`, {
      action: "komsel_updated",
      komselId,
      userId,
      timestamp: new Date().toISOString()
    });
    '''
code = put_komsel_regex.sub(replace_put_komsel, code)

# 9. Update `/komsel/:id` DELETE
del_komsel_regex = re.compile(r'app\.delete\("/make-server-561004a0/komsel/:id", requireAuth, async \(c\) => \{.*?(?=return c\.json)', re.DOTALL)
def replace_del_komsel(match):
    return '''app.delete("/make-server-561004a0/komsel/:id", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const komselId = c.req.param("id");

    await kv.del(`komsel:${komselId}`);

    // Audit log
    await kv.set(`audit:${Date.now()}:komsel_delete`, {
      action: "komsel_deleted",
      komselId,
      userId,
      timestamp: new Date().toISOString()
    });
    '''
code = del_komsel_regex.sub(replace_del_komsel, code)


with open('supabase/functions/server/index.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done")
