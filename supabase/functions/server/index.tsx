import { Hono } from "npm:hono";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

// Supabase client helper
const getSupabaseClient = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const getSupabaseAnonClient = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

// Enable logger
app.use('*', logger(console.log));

// Manual CORS middleware — replaces hono/cors which has a bug with origin:"*" in Deno edge runtime
app.use("/*", async (c, next) => {
  const origin = c.req.header("Origin") ?? "*";
  c.res.headers.set("Access-Control-Allow-Origin", origin);
  c.res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  c.res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey, x-client-info");
  c.res.headers.set("Access-Control-Max-Age", "600");
  c.res.headers.set("Vary", "Origin");
  // Handle preflight immediately
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: c.res.headers });
  }
  await next();
});

// Middleware to verify auth token
const requireAuth = async (c: any, next: any) => {
  try {
    const token = c.req.header("Authorization")?.split(" ")[1];
    if (!token) {
      return c.json({ error: "Unauthorized: No token provided" }, 401);
    }

    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: "Unauthorized: Invalid token" }, 401);
    }

    c.set("userId", user.id);
    c.set("userEmail", user.email);
    await next();
  } catch (error) {
    console.log("Auth middleware error:", error);
    return c.json({ error: "Authorization error: " + error.message }, 401);
  }
};

// Health check endpoint (no auth required)
app.get("/make-server-561004a0/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// ===== AUTHENTICATION ENDPOINTS =====

// Sign up new user (requires approval for Admin role)
app.post("/make-server-561004a0/auth/signup", async (c) => {
  try {
    const { email, password, name, role, churchBranchId } = await c.req.json();

    console.log("Signup request received:", { email, name, role });

    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    // Check if email is blacklisted (previously deleted admin)
    const blacklisted = await kv.get(`blacklist:email:${email.toLowerCase()}`);
    if (blacklisted) {
      return c.json({
        error: "Email ini tidak dapat digunakan untuk mendaftar. Silakan hubungi Super Admin.",
        code: "EMAIL_BLACKLISTED"
      }, 403);
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment check:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceRoleKey,
      urlValue: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'
    });

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("CRITICAL: Missing environment variables!");
      return c.json({
        error: "Server configuration error: Missing Supabase credentials (SERVICE_ROLE_KEY). The Edge Function must be deployed from Make settings page with environment variables configured.",
        details: {
          supabaseUrl: !!supabaseUrl,
          serviceRoleKey: !!serviceRoleKey
        }
      }, 500);
    }

    console.log("Creating Supabase client with SERVICE_ROLE_KEY...");
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log("Creating user in Supabase Auth...");

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm email since email server hasn't been configured
      email_confirm: true
    });

    if (authError) {
      console.error("Signup auth error:", authError);
      const errorMessage = authError?.message || authError?.error_description || JSON.stringify(authError) || "Authentication error occurred";

      // Check if it's a duplicate email error
      if (errorMessage.includes('already registered') || errorMessage.includes('User already registered') || errorMessage.includes('duplicate')) {
        return c.json({
          error: "Email sudah terdaftar! Silakan gunakan email lain atau login jika Anda sudah punya akun.",
          code: "DUPLICATE_EMAIL"
        }, 400);
      }

      return c.json({ error: "Signup failed: " + errorMessage }, 400);
    }

    if (!authData?.user) {
      console.error("No user data returned from Supabase");
      return c.json({ error: "Signup failed: No user data returned" }, 500);
    }

    console.log("User created successfully:", authData.user.id);

    // Default permissions for new users
    const defaultPermissions = {
      viewDashboard: true,
      viewJemaat: false,
      editJemaat: false,
      deleteJemaat: false,
      viewAbsensi: false,
      manageAbsensi: false,
      viewKomsel: false,
      editKomsel: false,
      viewKeuangan: false,
      editKeuangan: false,
      viewInventaris: false,
      editInventaris: false,
      viewReports: false
    };

    // Store user profile with role and approval status
    const userProfile = {
      id: authData.user.id,
      email,
      name,
      role: role || "admin", // Default to admin
      status: role === "super_admin" ? "approved" : "pending", // Super Admin auto-approved, Admin needs approval
      churchBranchId: churchBranchId || "main",
      permissions: role === "super_admin" ? {
        // Super Admin has all permissions
        viewDashboard: true,
        viewJemaat: true,
        editJemaat: true,
        deleteJemaat: true,
        viewAbsensi: true,
        manageAbsensi: true,
        viewKomsel: true,
        editKomsel: true,
        viewKeuangan: true,
        editKeuangan: true,
        viewInventaris: true,
        editInventaris: true,
        viewReports: true
      } : defaultPermissions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log("Saving user profile:", userProfile);
    await kv.set(`user:${authData.user.id}`, userProfile);

    // Add to pending approvals if Admin
    if (role !== "super_admin") {
      const pendingKey = `pending_approval:${authData.user.id}`;
      const pendingData = {
        userId: authData.user.id,
        email,
        name,
        requestedAt: new Date().toISOString()
      };
      console.log("Adding to pending approvals with key:", pendingKey);
      console.log("Pending approval data:", pendingData);
      await kv.set(pendingKey, pendingData);
      console.log("✅ Pending approval saved successfully!");
    } else {
      console.log("⚠️ User is super_admin, skipping pending approval");
    }

    // Audit log
    await kv.set(`audit:${Date.now()}:signup`, {
      action: "user_signup",
      userId: authData.user.id,
      email,
      role: userProfile.role,
      status: userProfile.status,
      timestamp: new Date().toISOString()
    });

    return c.json({
      success: true,
      user: userProfile,
      message: userProfile.status === "pending"
        ? "Account created. Waiting for Super Admin approval."
        : "Account created successfully."
    });

  } catch (error) {
    console.error("Signup error:", error);
    const errorMessage = error?.message || error?.toString() || "Unknown error occurred";
    return c.json({
      error: "Signup failed: " + errorMessage,
      details: "Check server logs for more information. Make sure Supabase Edge Function is deployed."
    }, 500);
  }
});

// Sign in
app.post("/make-server-561004a0/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const supabase = getSupabaseAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log("Signin error:", error);
      return c.json({ error: "Signin failed: " + error.message }, 401);
    }

    // Get user profile
    const userProfile = await kv.get(`user:${data.user.id}`);

    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    if (userProfile.status === "pending") {
      return c.json({
        error: "Your account is pending approval from Super Admin",
        status: "pending"
      }, 403);
    }

    if (userProfile.status === "rejected") {
      return c.json({
        error: "Your account has been rejected",
        status: "rejected"
      }, 403);
    }

    // Audit log
    await kv.set(`audit:${Date.now()}:signin`, {
      action: "user_signin",
      userId: data.user.id,
      email: data.user.email,
      timestamp: new Date().toISOString()
    });

    return c.json({
      success: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: userProfile
    });

  } catch (error) {
    console.log("Signin error:", error);
    return c.json({ error: "Signin failed: " + error.message }, 500);
  }
});

// Get current session
app.get("/make-server-561004a0/auth/session", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const userProfile = await kv.get(`user:${userId}`);

    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 404);
    }

    return c.json({ success: true, user: userProfile });
  } catch (error) {
    console.log("Session error:", error);
    return c.json({ error: "Session retrieval failed: " + error.message }, 500);
  }
});

// ===== USER MANAGEMENT ENDPOINTS (Super Admin Only) =====

// Get pending approvals
app.get("/make-server-561004a0/admin/pending-approvals", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const userProfile = await kv.get(`user:${userId}`);

    if (userProfile.role !== "super_admin") {
      return c.json({ error: "Access denied: Super Admin only" }, 403);
    }

    const pendingApprovals = await kv.getByPrefix("pending_approval:");
    console.log("Pending approvals count:", pendingApprovals?.length || 0);
    console.log("Pending approvals data:", pendingApprovals);

    return c.json({ success: true, pendingApprovals: pendingApprovals || [] });

  } catch (error) {
    console.log("Get pending approvals error:", error);
    return c.json({ error: "Failed to get pending approvals: " + error.message }, 500);
  }
});

// Approve/Reject user
app.post("/make-server-561004a0/admin/approve-user", requireAuth, async (c) => {
  try {
    const adminId = c.get("userId");
    const adminProfile = await kv.get(`user:${adminId}`);

    if (adminProfile.role !== "super_admin") {
      return c.json({ error: "Access denied: Super Admin only" }, 403);
    }

    const { targetUserId, approved } = await c.req.json();

    if (!targetUserId || approved === undefined) {
      return c.json({ error: "targetUserId and approved status are required" }, 400);
    }

    const userProfile = await kv.get(`user:${targetUserId}`);
    if (!userProfile) {
      return c.json({ error: "User not found" }, 404);
    }

    // Update user status
    userProfile.status = approved ? "approved" : "rejected";
    userProfile.approvedBy = adminId;
    userProfile.approvedAt = new Date().toISOString();
    userProfile.updatedAt = new Date().toISOString();

    await kv.set(`user:${targetUserId}`, userProfile);

    // Remove from pending
    await kv.del(`pending_approval:${targetUserId}`);

    // Audit log
    await kv.set(`audit:${Date.now()}:user_approval`, {
      action: approved ? "user_approved" : "user_rejected",
      adminId,
      targetUserId,
      timestamp: new Date().toISOString()
    });

    return c.json({
      success: true,
      message: approved ? "User approved successfully" : "User rejected",
      user: userProfile
    });

  } catch (error) {
    console.log("Approve user error:", error);
    return c.json({ error: "Approval action failed: " + error.message }, 500);
  }
});

// Get all users
app.get("/make-server-561004a0/admin/users", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const userProfile = await kv.get(`user:${userId}`);

    if (userProfile.role !== "super_admin") {
      return c.json({ error: "Access denied: Super Admin only" }, 403);
    }

    const users = await kv.getByPrefix("user:");
    return c.json({ success: true, users });

  } catch (error) {
    console.log("Get users error:", error);
    return c.json({ error: "Failed to get users: " + error.message }, 500);
  }
});

// Get approved users only
app.get("/make-server-561004a0/admin/approved-users", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const userProfile = await kv.get(`user:${userId}`);

    if (userProfile.role !== "super_admin") {
      return c.json({ error: "Access denied: Super Admin only" }, 403);
    }

    const allUsers = await kv.getByPrefix("user:");
    const approvedUsers = allUsers.filter((u: any) => u.status === "approved");

    return c.json({ success: true, users: approvedUsers });

  } catch (error) {
    console.log("Get approved users error:", error);
    return c.json({ error: "Failed to get approved users: " + error.message }, 500);
  }
});

// Update user permissions
app.put("/make-server-561004a0/admin/users/:targetUserId/permissions", requireAuth, async (c) => {
  try {
    const adminId = c.get("userId");
    const adminProfile = await kv.get(`user:${adminId}`);

    if (adminProfile.role !== "super_admin") {
      return c.json({ error: "Access denied: Super Admin only" }, 403);
    }

    const targetUserId = c.req.param("targetUserId");
    const { permissions } = await c.req.json();

    if (!targetUserId || !permissions) {
      return c.json({ error: "targetUserId and permissions are required" }, 400);
    }

    const userProfile = await kv.get(`user:${targetUserId}`);
    if (!userProfile) {
      return c.json({ error: "User not found" }, 404);
    }

    // Update permissions
    userProfile.permissions = permissions;
    userProfile.updatedAt = new Date().toISOString();
    userProfile.updatedBy = adminId;

    await kv.set(`user:${targetUserId}`, userProfile);

    // Audit log
    await kv.set(`audit:${Date.now()}:permissions_update`, {
      action: "permissions_updated",
      adminId,
      targetUserId,
      permissions,
      timestamp: new Date().toISOString()
    });

    return c.json({ success: true, user: userProfile });

  } catch (error) {
    console.log("Update permissions error:", error);
    return c.json({ error: "Failed to update permissions: " + error.message }, 500);
  }
});

// Suspend/Activate user
app.put("/make-server-561004a0/admin/users/:targetUserId/status", requireAuth, async (c) => {
  try {
    const adminId = c.get("userId");
    const adminProfile = await kv.get(`user:${adminId}`);

    if (adminProfile.role !== "super_admin") {
      return c.json({ error: "Access denied: Super Admin only" }, 403);
    }

    const targetUserId = c.req.param("targetUserId");
    const { status } = await c.req.json();

    if (!targetUserId || !status) {
      return c.json({ error: "targetUserId and status are required" }, 400);
    }

    if (!['approved', 'suspended', 'rejected'].includes(status)) {
      return c.json({ error: "Invalid status. Must be: approved, suspended, or rejected" }, 400);
    }

    const userProfile = await kv.get(`user:${targetUserId}`);
    if (!userProfile) {
      return c.json({ error: "User not found" }, 404);
    }

    // Prevent Super Admin from suspending themselves
    if (targetUserId === adminId) {
      return c.json({ error: "Cannot change your own status" }, 400);
    }

    // Update status
    const oldStatus = userProfile.status;
    userProfile.status = status;
    userProfile.updatedAt = new Date().toISOString();
    userProfile.statusChangedBy = adminId;
    userProfile.statusChangedAt = new Date().toISOString();

    await kv.set(`user:${targetUserId}`, userProfile);

    // Audit log
    await kv.set(`audit:${Date.now()}:status_change`, {
      action: "user_status_changed",
      adminId,
      targetUserId,
      oldStatus,
      newStatus: status,
      timestamp: new Date().toISOString()
    });

    return c.json({
      success: true,
      user: userProfile,
      message: `User ${status === 'suspended' ? 'suspended' : status === 'approved' ? 'activated' : 'rejected'} successfully`
    });

  } catch (error) {
    console.log("Update status error:", error);
    return c.json({ error: "Failed to update status: " + error.message }, 500);
  }
});

// Update user details (email, name, role)
app.put("/make-server-561004a0/admin/users/:targetUserId", requireAuth, async (c) => {
  try {
    const adminId = c.get("userId");
    const adminProfile = await kv.get(`user:${adminId}`);

    if (adminProfile.role !== "super_admin") {
      return c.json({ error: "Access denied: Super Admin only" }, 403);
    }

    const targetUserId = c.req.param("targetUserId");
    const updates = await c.req.json();

    if (!targetUserId) {
      return c.json({ error: "targetUserId is required" }, 400);
    }

    const userProfile = await kv.get(`user:${targetUserId}`);
    if (!userProfile) {
      return c.json({ error: "User not found" }, 404);
    }

    // Prevent changing own role
    if (targetUserId === adminId && updates.role && updates.role !== adminProfile.role) {
      return c.json({ error: "Cannot change your own role" }, 400);
    }

    // Update allowed fields
    const allowedFields = ['name', 'email', 'role', 'churchBranchId'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        userProfile[field] = updates[field];
      }
    });

    userProfile.updatedAt = new Date().toISOString();
    userProfile.updatedBy = adminId;

    await kv.set(`user:${targetUserId}`, userProfile);

    // Audit log
    await kv.set(`audit:${Date.now()}:user_update`, {
      action: "user_updated",
      adminId,
      targetUserId,
      updates,
      timestamp: new Date().toISOString()
    });

    return c.json({ success: true, user: userProfile });

  } catch (error) {
    console.log("Update user error:", error);
    return c.json({ error: "Failed to update user: " + error.message }, 500);
  }
});

// ===== DASHBOARD STATS =====
app.get("/make-server-561004a0/stats/dashboard", requireAuth, async (c) => {
  try {
    const members = await kv.getByPrefix("member:");
    const komsels = await kv.getByPrefix("komsel:");
    const pendingApprovals = await kv.getByPrefix("pending_approval:");

    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await kv.get(`attendance:date:${today}`) || [];

    return c.json({
      success: true,
      stats: {
        totalMembers: members.length,
        totalKomsel: komsels.filter((k: any) => k.status === 'active').length,
        pendingApprovals: pendingApprovals.length,
        todayAttendance: Array.isArray(todayAttendance) ? todayAttendance.length : 0
      }
    });
  } catch (error) {
    console.log("Dashboard stats error:", error);
    return c.json({ error: "Failed to load stats: " + error.message }, 500);
  }
});

// ===== CONGREGATION MANAGEMENT =====

// Get all members
app.get("/make-server-561004a0/congregation/members", requireAuth, async (c) => {
  try {
    const members = await kv.getByPrefix("member:");
    return c.json({ success: true, members: members || [] });
  } catch (error) {
    console.log("Get members error:", error);
    return c.json({ error: "Failed to get members: " + error.message }, 500);
  }
});

// Create member
app.post("/make-server-561004a0/congregation/members", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const member = {
      id: memberId,
      ...data,
      joinDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId
    };

    await kv.set(`member:${memberId}`, member);

    // If member joined komsel, add to komsel members
    if (data.komselJoined && data.pksName) {
      const komselId = await kv.get(`komsel:pks:${data.pksName}`);
      if (komselId) {
        const komsel = await kv.get(`komsel:${komselId}`);
        if (komsel) {
          const members = komsel.members || [];
          if (!members.includes(memberId)) {
            members.push(memberId);
            await kv.set(`komsel:${komselId}`, {
              ...komsel,
              members,
              memberCount: members.length,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
    }

    // Audit log
    await kv.set(`audit:${Date.now()}:member_create`, {
      action: "member_created",
      memberId,
      userId,
      timestamp: new Date().toISOString()
    });

    return c.json({ success: true, member });
  } catch (error) {
    console.log("Create member error:", error);
    return c.json({ error: "Failed to create member: " + error.message }, 500);
  }
});

// Update member
app.put("/make-server-561004a0/congregation/members/:id", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const memberId = c.req.param("id");
    const data = await c.req.json();

    const existingMember = await kv.get(`member:${memberId}`);
    if (!existingMember) {
      return c.json({ error: "Member not found" }, 404);
    }

    const updatedMember = {
      ...existingMember,
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    await kv.set(`member:${memberId}`, updatedMember);

    // Handle komsel membership changes
    const oldPksName = existingMember.pksName;
    const newPksName = data.pksName;
    const oldJoined = existingMember.komselJoined;
    const newJoined = data.komselJoined;

    // Remove from old komsel if changed
    if (oldJoined && oldPksName && (oldPksName !== newPksName || !newJoined)) {
      const oldKomselId = await kv.get(`komsel:pks:${oldPksName}`);
      if (oldKomselId) {
        const oldKomsel = await kv.get(`komsel:${oldKomselId}`);
        if (oldKomsel && oldKomsel.members) {
          const members = oldKomsel.members.filter((id: string) => id !== memberId);
          await kv.set(`komsel:${oldKomselId}`, {
            ...oldKomsel,
            members,
            memberCount: members.length,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    // Add to new komsel if joined
    if (newJoined && newPksName) {
      const newKomselId = await kv.get(`komsel:pks:${newPksName}`);
      if (newKomselId) {
        const newKomsel = await kv.get(`komsel:${newKomselId}`);
        if (newKomsel) {
          const members = newKomsel.members || [];
          if (!members.includes(memberId)) {
            members.push(memberId);
            await kv.set(`komsel:${newKomselId}`, {
              ...newKomsel,
              members,
              memberCount: members.length,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
    }

    // Audit log
    await kv.set(`audit:${Date.now()}:member_update`, {
      action: "member_updated",
      memberId,
      userId,
      timestamp: new Date().toISOString()
    });

    return c.json({ success: true, member: updatedMember });
  } catch (error) {
    console.log("Update member error:", error);
    return c.json({ error: "Failed to update member: " + error.message }, 500);
  }
});

// Delete member
app.delete("/make-server-561004a0/congregation/members/:id", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const memberId = c.req.param("id");

    await kv.del(`member:${memberId}`);

    // Audit log
    await kv.set(`audit:${Date.now()}:member_delete`, {
      action: "member_deleted",
      memberId,
      userId,
      timestamp: new Date().toISOString()
    });

    return c.json({ success: true });
  } catch (error) {
    console.log("Delete member error:", error);
    return c.json({ error: "Failed to delete member: " + error.message }, 500);
  }
});

// ===== ATTENDANCE MANAGEMENT =====

// Create attendance event
app.post("/make-server-561004a0/attendance/create-event", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const { name, date } = await c.req.json();

    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const qrCode = `QR_${eventId}_${Date.now()}`;

    const event = {
      id: eventId,
      name,
      date,
      qrCode,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };

    await kv.set(`attendance:event:${eventId}`, event);
    await kv.set(`attendance:qr:${qrCode}`, { eventId, active: true });

    return c.json({ success: true, event });
  } catch (error) {
    console.log("Create event error:", error);
    return c.json({ error: "Failed to create event: " + error.message }, 500);
  }
});

// Scan attendance
app.post("/make-server-561004a0/attendance/scan", requireAuth, async (c) => {
  try {
    const { qrCode, memberId } = await c.req.json();

    const qrData = await kv.get(`attendance:qr:${qrCode}`);
    if (!qrData || !qrData.active) {
      return c.json({ error: "Invalid or expired QR code" }, 400);
    }

    const attendanceId = `attendance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const attendance = {
      id: attendanceId,
      eventId: qrData.eventId,
      memberId,
      timestamp: new Date().toISOString()
    };

    await kv.set(`attendance:record:${attendanceId}`, attendance);

    // Add to event attendance list
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await kv.get(`attendance:date:${today}`) || [];
    todayAttendance.push(attendance);
    await kv.set(`attendance:date:${today}`, todayAttendance);

    return c.json({ success: true, attendance });
  } catch (error) {
    console.log("Scan attendance error:", error);
    return c.json({ error: "Failed to record attendance: " + error.message }, 500);
  }
});

// Get event attendance
app.get("/make-server-561004a0/attendance/event/:eventId", requireAuth, async (c) => {
  try {
    const eventId = c.req.param("eventId");
    const allAttendance = await kv.getByPrefix("attendance:record:");
    const eventAttendance = allAttendance.filter((a: any) => a.eventId === eventId);

    return c.json({ success: true, attendance: eventAttendance });
  } catch (error) {
    console.log("Get attendance error:", error);
    return c.json({ error: "Failed to get attendance: " + error.message }, 500);
  }
});

// ===== KOMSEL MANAGEMENT =====

// Get all komsels
app.get("/make-server-561004a0/komsel/list", requireAuth, async (c) => {
  try {
    const allKomsels = await kv.getByPrefix("komsel:");
    // Filter out pks mapping keys, only get actual komsel objects
    const komsels = allKomsels.filter((item: any) => item.id && item.id.startsWith('komsel_'));

    // Populate member details for each komsel
    for (const komsel of komsels) {
      if (komsel.members && komsel.members.length > 0) {
        const memberDetails = [];
        for (const memberId of komsel.members) {
          const member = await kv.get(`member:${memberId}`);
          if (member) {
            memberDetails.push({
              id: member.id,
              name: member.name,
              email: member.email,
              phone: member.phone
            });
          }
        }
        komsel.memberDetails = memberDetails;
      }
    }

    return c.json({ success: true, komsels: komsels || [] });
  } catch (error) {
    console.log("Get komsels error:", error);
    return c.json({ error: "Failed to get komsels: " + error.message }, 500);
  }
});

// Get PKS names for dropdown
app.get("/make-server-561004a0/komsel/pks-names", requireAuth, async (c) => {
  try {
    const allKomsels = await kv.getByPrefix("komsel:");
    // Filter only actual komsel objects and extract pksName
    const komsels = allKomsels.filter((item: any) => item.id && item.id.startsWith('komsel_'));
    const pksNames = komsels
      .map((k: any) => k.pksName)
      .filter((name: string) => name && name.trim() !== '');

    return c.json({ success: true, pksNames: [...new Set(pksNames)] });
  } catch (error) {
    console.log("Get PKS names error:", error);
    return c.json({ error: "Failed to get PKS names: " + error.message }, 500);
  }
});

// Create komsel
app.post("/make-server-561004a0/komsel/create", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const komselId = `komsel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const komsel = {
      id: komselId,
      ...data,
      members: [],
      memberCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: userId
    };

    await kv.set(`komsel:${komselId}`, komsel);

    // Also store by pksName for easy lookup
    if (data.pksName) {
      await kv.set(`komsel:pks:${data.pksName}`, komselId);
    }

    // Audit log
    await kv.set(`audit:${Date.now()}:komsel_create`, {
      action: "komsel_created",
      komselId,
      userId,
      timestamp: new Date().toISOString()
    });

    return c.json({ success: true, komsel });
  } catch (error) {
    console.log("Create komsel error:", error);
    return c.json({ error: "Failed to create komsel: " + error.message }, 500);
  }
});

// Update komsel
app.put("/make-server-561004a0/komsel/:id", requireAuth, async (c) => {
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

    await kv.set(`komsel:${komselId}`, updatedKomsel);

    // Update pksName lookup if changed
    if (data.pksName && data.pksName !== existingKomsel.pksName) {
      // Delete old mapping
      if (existingKomsel.pksName) {
        await kv.del(`komsel:pks:${existingKomsel.pksName}`);
      }
      // Create new mapping
      await kv.set(`komsel:pks:${data.pksName}`, komselId);
    }

    return c.json({ success: true, komsel: updatedKomsel });
  } catch (error) {
    console.log("Update komsel error:", error);
    return c.json({ error: "Failed to update komsel: " + error.message }, 500);
  }
});

// Delete komsel
app.delete("/make-server-561004a0/komsel/:id", requireAuth, async (c) => {
  try {
    const komselId = c.req.param("id");
    await kv.del(`komsel:${komselId}`);

    return c.json({ success: true });
  } catch (error) {
    console.log("Delete komsel error:", error);
    return c.json({ error: "Failed to delete komsel: " + error.message }, 500);
  }
});

// ===== FINANCE MANAGEMENT =====

// Get all transactions
app.get("/make-server-561004a0/finance/transactions", requireAuth, async (c) => {
  try {
    const transactions = await kv.getByPrefix("transaction:");

    // Calculate summary
    let income = 0;
    let expense = 0;

    transactions.forEach((t: any) => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    return c.json({
      success: true,
      transactions: transactions || [],
      summary: {
        income,
        expense,
        balance: income - expense
      }
    });
  } catch (error) {
    console.log("Get transactions error:", error);
    return c.json({ error: "Failed to get transactions: " + error.message }, 500);
  }
});

// Create transaction
app.post("/make-server-561004a0/finance/transactions", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const transactionId = `transaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transaction = {
      id: transactionId,
      ...data,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };

    await kv.set(`transaction:${transactionId}`, transaction);

    // Audit log
    await kv.set(`audit:${Date.now()}:transaction_create`, {
      action: "transaction_created",
      transactionId,
      type: data.type,
      amount: data.amount,
      userId,
      timestamp: new Date().toISOString()
    });

    return c.json({ success: true, transaction });
  } catch (error) {
    console.log("Create transaction error:", error);
    return c.json({ error: "Failed to create transaction: " + error.message }, 500);
  }
});

// ===== INVENTORY MANAGEMENT =====

// Get all inventory items
app.get("/make-server-561004a0/inventory/items", requireAuth, async (c) => {
  try {
    const items = await kv.getByPrefix("inventory:");
    return c.json({ success: true, items: items || [] });
  } catch (error) {
    console.log("Get inventory items error:", error);
    return c.json({ error: "Failed to get inventory items: " + error.message }, 500);
  }
});

// Create inventory item
app.post("/make-server-561004a0/inventory/items", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const data = await c.req.json();

    const itemId = `inventory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const item = {
      id: itemId,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId
    };

    await kv.set(`inventory:${itemId}`, item);

    // Audit log
    await kv.set(`audit:${Date.now()}:inventory_create`, {
      action: "inventory_item_created",
      itemId,
      userId,
      timestamp: new Date().toISOString()
    });

    return c.json({ success: true, item });
  } catch (error) {
    console.log("Create inventory item error:", error);
    return c.json({ error: "Failed to create inventory item: " + error.message }, 500);
  }
});

// Update inventory item
app.put("/make-server-561004a0/inventory/items/:id", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const itemId = c.req.param("id");
    const data = await c.req.json();

    const existingItem = await kv.get(`inventory:${itemId}`);
    if (!existingItem) {
      return c.json({ error: "Item not found" }, 404);
    }

    const updatedItem = {
      ...existingItem,
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    await kv.set(`inventory:${itemId}`, updatedItem);

    return c.json({ success: true, item: updatedItem });
  } catch (error) {
    console.log("Update inventory item error:", error);
    return c.json({ error: "Failed to update inventory item: " + error.message }, 500);
  }
});

// Delete inventory item
app.delete("/make-server-561004a0/inventory/items/:id", requireAuth, async (c) => {
  try {
    const itemId = c.req.param("id");
    await kv.del(`inventory:${itemId}`);

    return c.json({ success: true });
  } catch (error) {
    console.log("Delete inventory item error:", error);
    return c.json({ error: "Failed to delete inventory item: " + error.message }, 500);
  }
});

// Delete admin user permanently (Super Admin only)
app.delete("/make-server-561004a0/admin/users/:targetUserId", requireAuth, async (c) => {
  try {
    const adminId = c.get("userId");
    const adminProfile = await kv.get(`user:${adminId}`);

    if (adminProfile.role !== "super_admin") {
      return c.json({ error: "Access denied: Super Admin only" }, 403);
    }

    const targetUserId = c.req.param("targetUserId");

    if (targetUserId === adminId) {
      return c.json({ error: "Tidak bisa menghapus akun Anda sendiri" }, 400);
    }

    const userProfile = await kv.get(`user:${targetUserId}`);
    if (!userProfile) {
      return c.json({ error: "User not found" }, 404);
    }

    if (userProfile.role === "super_admin") {
      return c.json({ error: "Tidak bisa menghapus Super Admin" }, 400);
    }

    const supabase = getSupabaseClient();

    // 1. Delete from Supabase Auth (blocks login permanently)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(targetUserId);
    if (authDeleteError) {
      console.log("Auth delete error (non-fatal):", authDeleteError.message);
    }

    // 2. Blacklist the email so re-registration with same email is blocked
    const email = userProfile.email;
    await kv.set(`blacklist:email:${email.toLowerCase()}`, {
      email,
      deletedAt: new Date().toISOString(),
      deletedBy: adminId,
      reason: "admin_deleted",
      originalUserId: targetUserId,
    });

    // 3. Remove user profile from KV
    await kv.del(`user:${targetUserId}`);

    // 4. Audit log
    await kv.set(`audit:${Date.now()}:admin_user_deleted`, {
      action: "admin_user_deleted",
      adminId,
      targetUserId,
      targetEmail: email,
      targetName: userProfile.name,
      timestamp: new Date().toISOString(),
    });

    return c.json({ success: true, message: `User ${userProfile.name} berhasil dihapus secara permanen` });
  } catch (error) {
    console.log("Delete user error:", error);
    return c.json({ error: "Failed to delete user: " + error.message }, 500);
  }
});

// ===== ATTENDANCE SESSION ENDPOINTS =====

// Save attendance session (date + service type + present member IDs)
app.post("/make-server-561004a0/attendance/sessions", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const { date, serviceType, presentIds, notes } = await c.req.json();
    if (!date || !serviceType) return c.json({ error: "date and serviceType are required" }, 400);

    const sessionId = `sess_${date}_${serviceType.replace(/\s+/g, '_')}`;
    const session = {
      id: sessionId,
      date,
      serviceType,
      presentIds: presentIds || [],
      notes: notes || "",
      savedAt: new Date().toISOString(),
      savedBy: userId,
    };
    await kv.set(`attendance_session:${sessionId}`, session);
    return c.json({ success: true, session });
  } catch (error) {
    console.log("Save attendance session error:", error);
    return c.json({ error: "Failed to save session: " + error.message }, 500);
  }
});

// Get attendance session by date + service
app.get("/make-server-561004a0/attendance/sessions/:sessionId", requireAuth, async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const session = await kv.get(`attendance_session:${sessionId}`);
    return c.json({ success: true, session: session || null });
  } catch (error) {
    return c.json({ error: "Failed to get session: " + error.message }, 500);
  }
});

// Get all sessions for a month/year
app.get("/make-server-561004a0/attendance/sessions", requireAuth, async (c) => {
  try {
    const month = c.req.query("month"); // "2024-06"
    const year = c.req.query("year");   // "2024"
    const sessions = await kv.getByPrefix("attendance_session:");
    let filtered = sessions.filter((s: any) => s && s.id);
    if (month) filtered = filtered.filter((s: any) => s.date && s.date.startsWith(month));
    else if (year) filtered = filtered.filter((s: any) => s.date && s.date.startsWith(year));
    filtered.sort((a: any, b: any) => a.date.localeCompare(b.date));
    return c.json({ success: true, sessions: filtered });
  } catch (error) {
    return c.json({ error: "Failed to get sessions: " + error.message }, 500);
  }
});

// ===== ANNOUNCEMENT / FLYER ENDPOINTS =====

const ANNOUNCEMENT_BUCKET = "make-561004a0-announcements";

// Ensure bucket exists helper
const ensureAnnouncementBucket = async () => {
  const supabase = getSupabaseClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b: any) => b.name === ANNOUNCEMENT_BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(ANNOUNCEMENT_BUCKET, { public: false });
  }
};

// GET all announcements (public - no auth required)
app.get("/make-server-561004a0/announcements", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const items = await kv.getByPrefix("announcement:");

    // Sort by createdAt desc
    const sorted = items
      .filter((a: any) => a && a.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Generate signed URLs for each item
    const withUrls = await Promise.all(sorted.map(async (item: any) => {
      if (item.imagePath) {
        const { data } = await supabase.storage
          .from(ANNOUNCEMENT_BUCKET)
          .createSignedUrl(item.imagePath, 3600);
        return { ...item, imageUrl: data?.signedUrl || null };
      }
      return item;
    }));

    return c.json({ success: true, announcements: withUrls });
  } catch (error) {
    console.log("Get announcements error:", error);
    return c.json({ error: "Failed to get announcements: " + error.message }, 500);
  }
});

// POST create announcement (auth required)
app.post("/make-server-561004a0/announcements", requireAuth, async (c) => {
  try {
    await ensureAnnouncementBucket();
    const userId = c.get("userId");
    const body = await c.req.json();
    const { title, description, imageBase64, imageMimeType, active } = body;

    if (!title) {
      return c.json({ error: "Title is required" }, 400);
    }

    const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let imagePath: string | null = null;

    if (imageBase64 && imageMimeType) {
      const supabase = getSupabaseClient();
      const ext = imageMimeType.split("/")[1] || "jpg";
      imagePath = `${id}.${ext}`;
      const bytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
      const { error: uploadError } = await supabase.storage
        .from(ANNOUNCEMENT_BUCKET)
        .upload(imagePath, bytes, { contentType: imageMimeType, upsert: true });
      if (uploadError) {
        console.log("Image upload error:", uploadError);
        return c.json({ error: "Image upload failed: " + uploadError.message }, 500);
      }
    }

    const announcement = {
      id,
      title,
      description: description || "",
      imagePath,
      active: active !== false,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`announcement:${id}`, announcement);
    return c.json({ success: true, announcement });
  } catch (error) {
    console.log("Create announcement error:", error);
    return c.json({ error: "Failed to create announcement: " + error.message }, 500);
  }
});

// PUT update announcement (auth required)
app.put("/make-server-561004a0/announcements/:id", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const body = await c.req.json();
    const { title, description, imageBase64, imageMimeType, active } = body;

    const existing = await kv.get(`announcement:${id}`);
    if (!existing) {
      return c.json({ error: "Announcement not found" }, 404);
    }

    let imagePath = existing.imagePath;

    if (imageBase64 && imageMimeType) {
      await ensureAnnouncementBucket();
      const supabase = getSupabaseClient();
      const ext = imageMimeType.split("/")[1] || "jpg";
      imagePath = `${id}.${ext}`;
      const bytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
      const { error: uploadError } = await supabase.storage
        .from(ANNOUNCEMENT_BUCKET)
        .upload(imagePath, bytes, { contentType: imageMimeType, upsert: true });
      if (uploadError) {
        return c.json({ error: "Image upload failed: " + uploadError.message }, 500);
      }
    }

    const updated = {
      ...existing,
      title: title ?? existing.title,
      description: description ?? existing.description,
      imagePath,
      active: active !== undefined ? active : existing.active,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    await kv.set(`announcement:${id}`, updated);
    return c.json({ success: true, announcement: updated });
  } catch (error) {
    console.log("Update announcement error:", error);
    return c.json({ error: "Failed to update announcement: " + error.message }, 500);
  }
});

// DELETE announcement (auth required)
app.delete("/make-server-561004a0/announcements/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param("id");
    const existing = await kv.get(`announcement:${id}`);

    if (existing?.imagePath) {
      const supabase = getSupabaseClient();
      await supabase.storage.from(ANNOUNCEMENT_BUCKET).remove([existing.imagePath]);
    }

    await kv.del(`announcement:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log("Delete announcement error:", error);
    return c.json({ error: "Failed to delete announcement: " + error.message }, 500);
  }
});

// ===== GALLERY ENDPOINTS =====

const GALLERY_BUCKET = "make-561004a0-gallery";

const ensureGalleryBucket = async () => {
  const supabase = getSupabaseClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b: any) => b.name === GALLERY_BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(GALLERY_BUCKET, { public: false });
  }
};

// GET all albums with photo counts (public)
app.get("/make-server-561004a0/gallery/albums", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const albums = await kv.getByPrefix("gallery:album:");
    const sorted = albums
      .filter((a: any) => a && a.id)
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

    const withCounts = await Promise.all(sorted.map(async (album: any) => {
      const photos = await kv.getByPrefix(`gallery:photo:${album.id}:`);
      const validPhotos = photos.filter((p: any) => p && p.id);
      let coverUrl = null;
      if (validPhotos.length > 0) {
        const cover = validPhotos.find((p: any) => p.id === album.coverPhotoId) || validPhotos[0];
        if (cover?.imagePath) {
          const { data } = await supabase.storage.from(GALLERY_BUCKET).createSignedUrl(cover.imagePath, 3600);
          coverUrl = data?.signedUrl || null;
        }
      }
      return { ...album, photoCount: validPhotos.length, coverUrl };
    }));

    return c.json({ success: true, albums: withCounts });
  } catch (error) {
    return c.json({ error: "Failed to get albums: " + error.message }, 500);
  }
});

// POST create album (auth)
app.post("/make-server-561004a0/gallery/albums", requireAuth, async (c) => {
  try {
    const { name, description } = await c.req.json();
    if (!name) return c.json({ error: "Name is required" }, 400);
    const id = `alb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const albums = await kv.getByPrefix("gallery:album:");
    const album = {
      id, name, description: description || "",
      coverPhotoId: null, order: albums.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`gallery:album:${id}`, album);
    return c.json({ success: true, album });
  } catch (error) {
    return c.json({ error: "Failed to create album: " + error.message }, 500);
  }
});

// PUT update album (auth)
app.put("/make-server-561004a0/gallery/albums/:albumId", requireAuth, async (c) => {
  try {
    const albumId = c.req.param("albumId");
    const updates = await c.req.json();
    const album = await kv.get(`gallery:album:${albumId}`);
    if (!album) return c.json({ error: "Album not found" }, 404);
    const updated = { ...album, ...updates, id: albumId, updatedAt: new Date().toISOString() };
    await kv.set(`gallery:album:${albumId}`, updated);
    return c.json({ success: true, album: updated });
  } catch (error) {
    return c.json({ error: "Failed to update album: " + error.message }, 500);
  }
});

// DELETE album + all its photos (auth)
app.delete("/make-server-561004a0/gallery/albums/:albumId", requireAuth, async (c) => {
  try {
    const albumId = c.req.param("albumId");
    const supabase = getSupabaseClient();
    const photos = await kv.getByPrefix(`gallery:photo:${albumId}:`);
    const paths = photos.filter((p: any) => p?.imagePath).map((p: any) => p.imagePath);
    if (paths.length > 0) {
      await supabase.storage.from(GALLERY_BUCKET).remove(paths);
    }
    for (const p of photos) {
      if (p?.id) await kv.del(`gallery:photo:${albumId}:${p.id}`);
    }
    await kv.del(`gallery:album:${albumId}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete album: " + error.message }, 500);
  }
});

// GET photos in album (public)
app.get("/make-server-561004a0/gallery/albums/:albumId/photos", async (c) => {
  try {
    const albumId = c.req.param("albumId");
    const supabase = getSupabaseClient();
    const photos = await kv.getByPrefix(`gallery:photo:${albumId}:`);
    const sorted = photos
      .filter((p: any) => p && p.id)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const withUrls = await Promise.all(sorted.map(async (photo: any) => {
      if (photo.imagePath) {
        const { data } = await supabase.storage.from(GALLERY_BUCKET).createSignedUrl(photo.imagePath, 3600);
        return { ...photo, imageUrl: data?.signedUrl || null };
      }
      return photo;
    }));
    return c.json({ success: true, photos: withUrls });
  } catch (error) {
    return c.json({ error: "Failed to get photos: " + error.message }, 500);
  }
});

// POST upload photo to album (auth)
app.post("/make-server-561004a0/gallery/albums/:albumId/photos", requireAuth, async (c) => {
  try {
    await ensureGalleryBucket();
    const albumId = c.req.param("albumId");
    const album = await kv.get(`gallery:album:${albumId}`);
    if (!album) return c.json({ error: "Album not found" }, 404);

    const { imageBase64, imageMimeType, caption } = await c.req.json();
    if (!imageBase64 || !imageMimeType) return c.json({ error: "Image is required" }, 400);

    const supabase = getSupabaseClient();
    const photoId = `ph_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const ext = imageMimeType.split("/")[1] || "jpg";
    const imagePath = `${albumId}/${photoId}.${ext}`;
    const bytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const { error: uploadError } = await supabase.storage
      .from(GALLERY_BUCKET)
      .upload(imagePath, bytes, { contentType: imageMimeType, upsert: true });
    if (uploadError) return c.json({ error: "Upload failed: " + uploadError.message }, 500);

    const photo = {
      id: photoId, albumId, imagePath, caption: caption || "",
      createdAt: new Date().toISOString(),
    };
    await kv.set(`gallery:photo:${albumId}:${photoId}`, photo);

    // Set as cover if album has no cover yet
    if (!album.coverPhotoId) {
      await kv.set(`gallery:album:${albumId}`, { ...album, coverPhotoId: photoId, updatedAt: new Date().toISOString() });
    }

    return c.json({ success: true, photo });
  } catch (error) {
    return c.json({ error: "Failed to upload photo: " + error.message }, 500);
  }
});

// ===== TEAM ENDPOINTS =====
const TEAM_BUCKET = "make-561004a0-gallery";

// GET all team members (public)
app.get("/make-server-561004a0/team", async (c) => {
  try {
    const all = await kv.getByPrefix("team:member:");
    const members = all.filter((m: any) => m?.id).sort((a: any, b: any) => {
      const tierOrder: Record<string, number> = {
        gembala_sidang: 0, penerus_gembala: 1, wakil_gembala: 2, pastoral: 3, koordinator: 4
      };
      const tDiff = (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99);
      return tDiff !== 0 ? tDiff : (a.order ?? 0) - (b.order ?? 0);
    });
    const supabase = getSupabaseClient();
    // Generate signed URLs (3 years) so they work regardless of bucket public setting
    const withUrls = await Promise.all(members.map(async (m: any) => {
      let photoUrl = m.photoUrl ?? null;
      const path = m.photoPath ?? null;
      if (path) {
        // Try signed URL first (always works, bypasses RLS)
        const { data: signed } = await supabase.storage.from(TEAM_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365 * 3);
        if (signed?.signedUrl) photoUrl = signed.signedUrl;
        else {
          const { data: pub } = supabase.storage.from(TEAM_BUCKET).getPublicUrl(path);
          photoUrl = pub?.publicUrl ?? photoUrl;
        }
      }
      return { ...m, photoUrl };
    }));
    return c.json({ success: true, members: withUrls });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// POST create team member (auth)
app.post("/make-server-561004a0/team", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseClient();
    const body = await c.req.json();
    const { name, role, tier, spouseName, spouseRole, order, photoUrl: directPhotoUrl, photoBase64, photoMimeType } = body;
    if (!name || !tier) return c.json({ error: "Name and tier are required" }, 400);
    const id = body.id || crypto.randomUUID();
    let photoUrl = directPhotoUrl || null;
    let photoPath: string | null = null;
    // Server-side upload from base64 (fallback when direct browser upload failed)
    if (photoBase64 && photoMimeType) {
      const ext = photoMimeType.split("/")[1] || "jpg";
      photoPath = `team/${id}/photo.${ext}`;
      const bytes = Uint8Array.from(atob(photoBase64), c => c.charCodeAt(0));
      const { error } = await supabase.storage.from(TEAM_BUCKET).upload(photoPath, bytes, { contentType: photoMimeType, upsert: true });
      if (!error) {
        const { data: signed } = await supabase.storage.from(TEAM_BUCKET).createSignedUrl(photoPath, 60 * 60 * 24 * 365 * 3);
        photoUrl = signed?.signedUrl ?? null;
      } else {
        photoPath = null;
      }
    }
    const member = { id, name, role: role || "", tier, spouseName: spouseName || "", spouseRole: spouseRole || "", order: order ?? 0, photoUrl, photoPath, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await kv.set(`team:member:${id}`, member);
    return c.json({ success: true, member });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// PUT update team member (auth)
app.put("/make-server-561004a0/team/:id", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseClient();
    const id = c.req.param("id");
    const existing = await kv.get(`team:member:${id}`);
    if (!existing) return c.json({ error: "Member not found" }, 404);
    const body = await c.req.json();
    const { name, role, tier, spouseName, spouseRole, order, photoUrl: directPhotoUrl, photoBase64, photoMimeType } = body;
    let photoUrl = directPhotoUrl !== undefined ? directPhotoUrl : (existing.photoUrl ?? null);
    // Server-side upload from base64 (fallback)
    let newPhotoPath = existing.photoPath ?? null;
    if (photoBase64 && photoMimeType) {
      const ext = photoMimeType.split("/")[1] || "jpg";
      newPhotoPath = `team/${id}/photo.${ext}`;
      const bytes = Uint8Array.from(atob(photoBase64), c => c.charCodeAt(0));
      const { error } = await supabase.storage.from(TEAM_BUCKET).upload(newPhotoPath, bytes, { contentType: photoMimeType, upsert: true });
      if (!error) {
        const { data: signed } = await supabase.storage.from(TEAM_BUCKET).createSignedUrl(newPhotoPath, 60 * 60 * 24 * 365 * 3);
        photoUrl = signed?.signedUrl ?? null;
      } else {
        newPhotoPath = existing.photoPath ?? null;
      }
    }
    const updated = { ...existing, name: name ?? existing.name, role: role ?? existing.role, tier: tier ?? existing.tier, spouseName: spouseName ?? existing.spouseName, spouseRole: spouseRole ?? existing.spouseRole, order: order ?? existing.order, photoUrl, photoPath: newPhotoPath, updatedAt: new Date().toISOString() };
    await kv.set(`team:member:${id}`, updated);
    return c.json({ success: true, member: updated });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE team member (auth)
app.delete("/make-server-561004a0/team/:id", requireAuth, async (c) => {
  try {
    const supabase = getSupabaseClient();
    const id = c.req.param("id");
    const member = await kv.get(`team:member:${id}`);
    if (!member) return c.json({ error: "Member not found" }, 404);
    const paths = [member.photoPath, member.spousePhotoPath].filter(Boolean);
    if (paths.length) await supabase.storage.from(TEAM_BUCKET).remove(paths);
    await kv.del(`team:member:${id}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE photo from album (auth)
app.delete("/make-server-561004a0/gallery/albums/:albumId/photos/:photoId", requireAuth, async (c) => {
  try {
    const albumId = c.req.param("albumId");
    const photoId = c.req.param("photoId");
    const supabase = getSupabaseClient();
    const photo = await kv.get(`gallery:photo:${albumId}:${photoId}`);
    if (!photo) return c.json({ error: "Photo not found" }, 404);
    if (photo.imagePath) {
      await supabase.storage.from(GALLERY_BUCKET).remove([photo.imagePath]);
    }
    await kv.del(`gallery:photo:${albumId}:${photoId}`);

    // If deleted photo was the cover, reassign to first remaining photo
    const album = await kv.get(`gallery:album:${albumId}`);
    if (album?.coverPhotoId === photoId) {
      const remaining = await kv.getByPrefix(`gallery:photo:${albumId}:`);
      const next = remaining.find((p: any) => p?.id && p.id !== photoId);
      await kv.set(`gallery:album:${albumId}`, { ...album, coverPhotoId: next?.id || null, updatedAt: new Date().toISOString() });
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete photo: " + error.message }, 500);
  }
});

// ===== REGISTRATION ENDPOINTS =====

// Public: submit a registration form
app.post("/make-server-561004a0/registrations", async (c) => {
  try {
    const { type, title, data } = await c.req.json();
    if (!type || !data) return c.json({ error: "Missing fields" }, 400);
    const id = crypto.randomUUID();
    const record = { id, type, title, data, submittedAt: new Date().toISOString(), status: "baru" };
    await kv.set(`registration:${type}:${id}`, record);
    return c.json({ success: true, id });
  } catch (error) {
    return c.json({ error: "Failed to save: " + error.message }, 500);
  }
});

// Auth: list all registrations (optionally filter by type)
app.get("/make-server-561004a0/registrations", requireAuth, async (c) => {
  try {
    const type = c.req.query("type");
    const prefix = type ? `registration:${type}:` : "registration:";
    const all = await kv.getByPrefix(prefix);
    const sorted = all.filter(Boolean).sort((a: any, b: any) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    return c.json({ success: true, registrations: sorted });
  } catch (error) {
    return c.json({ error: "Failed to fetch: " + error.message }, 500);
  }
});

// Auth: update status
app.put("/make-server-561004a0/registrations/:id", requireAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const { status, type } = await c.req.json();
    const record = await kv.get(`registration:${type}:${id}`);
    if (!record) return c.json({ error: "Not found" }, 404);
    await kv.set(`registration:${type}:${id}`, { ...record, status });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to update: " + error.message }, 500);
  }
});

// Auth: delete a registration
app.delete("/make-server-561004a0/registrations/:id", requireAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const type = c.req.query("type");
    await kv.del(`registration:${type}:${id}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete: " + error.message }, 500);
  }
});

Deno.serve(app.fetch);