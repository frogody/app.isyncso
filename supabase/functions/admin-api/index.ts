/**
 * Admin API Edge Function
 * Provides endpoints for platform administration
 *
 * Endpoints:
 * - GET /settings - List all platform settings
 * - PUT /settings/:key - Update a setting
 * - GET /feature-flags - List all feature flags
 * - PUT /feature-flags/:id - Update a feature flag
 * - GET /audit-logs - List audit logs with pagination
 * - POST /audit-log - Create audit log entry
 * - GET /admins - List platform admins
 * - POST /admins - Add a new platform admin
 * - DELETE /admins/:id - Remove a platform admin
 * - GET /users - List all users with pagination, search, filters
 * - GET /users/:id - Get single user details
 * - PUT /users/:id - Update user
 * - DELETE /users/:id - Deactivate user
 * - GET /user-stats - Get user statistics
 * - GET /companies - List companies for filter dropdown
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create service role client for admin operations
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface AdminUser {
  id: string;
  user_id: string;
  role: "super_admin" | "admin" | "support" | "analyst";
  permissions: string[];
  is_active: boolean;
}

/**
 * Verify the request is from a platform admin
 */
async function verifyPlatformAdmin(authHeader: string | null): Promise<{ isAdmin: boolean; adminUser: AdminUser | null; userId: string | null }> {
  if (!authHeader) {
    return { isAdmin: false, adminUser: null, userId: null };
  }

  const token = authHeader.replace("Bearer ", "");

  // Create a client with the user's token
  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Get the user from the token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error("[Admin API] Auth error:", authError);
    return { isAdmin: false, adminUser: null, userId: null };
  }

  // Check if user is a platform admin using service role client
  const { data: adminData, error: adminError } = await supabaseAdmin
    .from("platform_admins")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (adminError || !adminData) {
    console.log("[Admin API] User is not a platform admin:", user.id);
    return { isAdmin: false, adminUser: null, userId: user.id };
  }

  return { isAdmin: true, adminUser: adminData as AdminUser, userId: user.id };
}

/**
 * Create an audit log entry
 */
async function createAuditLog(
  adminId: string,
  adminEmail: string | null,
  action: string,
  resourceType: string,
  resourceId: string | null,
  oldValue: unknown,
  newValue: unknown,
  ipAddress: string | null,
  userAgent: string | null
) {
  try {
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: adminId,
      admin_email: adminEmail,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      old_value: oldValue,
      new_value: newValue,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (err) {
    console.error("[Admin API] Failed to create audit log:", err);
  }
}

/**
 * Get admin email from user id
 */
async function getAdminEmail(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data?.user?.email || null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/admin-api", "");
  const method = req.method;

  // Get client info for audit logging
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  try {
    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    const { isAdmin, adminUser, userId } = await verifyPlatformAdmin(authHeader);

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Platform admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminEmail = userId ? await getAdminEmail(userId) : null;

    // =========================================================================
    // Settings Endpoints
    // =========================================================================

    // GET /settings - List all platform settings
    if (path === "/settings" && method === "GET") {
      const category = url.searchParams.get("category");
      const includeSensitive = url.searchParams.get("include_sensitive") === "true" && adminUser?.role === "super_admin";

      let query = supabaseAdmin.from("platform_settings").select("*");

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query.order("category").order("key");

      if (error) {
        throw error;
      }

      // Redact sensitive values unless super_admin
      const settings = data?.map((s) => ({
        ...s,
        value: s.is_sensitive && !includeSensitive ? "[REDACTED]" : s.value,
      }));

      await createAuditLog(userId!, adminEmail, "list", "platform_settings", null, null, null, ipAddress, userAgent);

      return new Response(
        JSON.stringify({ settings }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /settings/:key - Update a setting
    if (path.startsWith("/settings/") && method === "PUT") {
      const key = path.split("/settings/")[1];

      if (!key) {
        return new Response(
          JSON.stringify({ error: "Setting key is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const { value } = body;

      if (value === undefined) {
        return new Response(
          JSON.stringify({ error: "Value is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get old value
      const { data: oldSetting } = await supabaseAdmin
        .from("platform_settings")
        .select("value")
        .eq("key", key)
        .single();

      // Update the setting
      const { data, error } = await supabaseAdmin
        .from("platform_settings")
        .update({ value, updated_by: userId, updated_at: new Date().toISOString() })
        .eq("key", key)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await createAuditLog(
        userId!,
        adminEmail,
        "update",
        "platform_setting",
        key,
        { value: oldSetting?.value },
        { value },
        ipAddress,
        userAgent
      );

      return new Response(
        JSON.stringify({ setting: data, message: "Setting updated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // Feature Flags Endpoints
    // =========================================================================

    // GET /feature-flags - List all feature flags
    if (path === "/feature-flags" && method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("feature_flags")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      await createAuditLog(userId!, adminEmail, "list", "feature_flags", null, null, null, ipAddress, userAgent);

      return new Response(
        JSON.stringify({ feature_flags: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /feature-flags/:id - Update a feature flag
    if (path.startsWith("/feature-flags/") && method === "PUT") {
      const id = path.split("/feature-flags/")[1];

      if (!id) {
        return new Response(
          JSON.stringify({ error: "Feature flag ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const allowedFields = ["is_enabled", "rollout_percentage", "target_organizations", "target_users", "description", "metadata"];
      const updates: Record<string, unknown> = {};

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ error: "No valid fields to update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get old value
      const { data: oldFlag } = await supabaseAdmin
        .from("feature_flags")
        .select("*")
        .eq("id", id)
        .single();

      // Update the flag
      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from("feature_flags")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await createAuditLog(
        userId!,
        adminEmail,
        "update",
        "feature_flag",
        id,
        oldFlag,
        data,
        ipAddress,
        userAgent
      );

      return new Response(
        JSON.stringify({ feature_flag: data, message: "Feature flag updated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // Audit Logs Endpoints
    // =========================================================================

    // GET /audit-logs - List audit logs with pagination
    if (path === "/audit-logs" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const resourceType = url.searchParams.get("resource_type");
      const adminIdFilter = url.searchParams.get("admin_id");
      const action = url.searchParams.get("action");

      let query = supabaseAdmin
        .from("admin_audit_logs")
        .select("*", { count: "exact" });

      if (resourceType) {
        query = query.eq("resource_type", resourceType);
      }
      if (adminIdFilter) {
        query = query.eq("admin_id", adminIdFilter);
      }
      if (action) {
        query = query.eq("action", action);
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          audit_logs: data,
          pagination: {
            total: count,
            limit,
            offset,
            has_more: (count || 0) > offset + limit,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /audit-log - Create audit log entry (internal use)
    if (path === "/audit-log" && method === "POST") {
      const body = await req.json();
      const { action, resource_type, resource_id, old_value, new_value, metadata } = body;

      if (!action || !resource_type) {
        return new Response(
          JSON.stringify({ error: "action and resource_type are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("admin_audit_logs")
        .insert({
          admin_id: userId,
          admin_email: adminEmail,
          action,
          resource_type,
          resource_id,
          old_value,
          new_value,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ audit_log: data, message: "Audit log created successfully" }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // Platform Admins Endpoints
    // =========================================================================

    // GET /admins - List platform admins
    if (path === "/admins" && method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("platform_admins")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Enrich with user emails
      const adminsWithEmail = await Promise.all(
        (data || []).map(async (admin) => {
          const email = await getAdminEmail(admin.user_id);
          return { ...admin, email };
        })
      );

      await createAuditLog(userId!, adminEmail, "list", "platform_admins", null, null, null, ipAddress, userAgent);

      return new Response(
        JSON.stringify({ admins: adminsWithEmail }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /admins - Add a new platform admin (super_admin only)
    if (path === "/admins" && method === "POST") {
      if (adminUser?.role !== "super_admin") {
        return new Response(
          JSON.stringify({ error: "Only super admins can add new platform admins" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const { user_id, role, permissions } = body;

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the user exists
      const { data: userExists, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);

      if (userError || !userExists) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("platform_admins")
        .insert({
          user_id,
          role: role || "admin",
          permissions: permissions || [],
          is_active: true,
          added_by: userId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return new Response(
            JSON.stringify({ error: "User is already a platform admin" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw error;
      }

      await createAuditLog(
        userId!,
        adminEmail,
        "create",
        "platform_admin",
        data.id,
        null,
        data,
        ipAddress,
        userAgent
      );

      return new Response(
        JSON.stringify({ admin: data, message: "Platform admin added successfully" }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /admins/:id - Remove a platform admin (super_admin only)
    if (path.startsWith("/admins/") && method === "DELETE") {
      if (adminUser?.role !== "super_admin") {
        return new Response(
          JSON.stringify({ error: "Only super admins can remove platform admins" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const id = path.split("/admins/")[1];

      if (!id) {
        return new Response(
          JSON.stringify({ error: "Admin ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent deleting yourself
      if (adminUser?.id === id) {
        return new Response(
          JSON.stringify({ error: "Cannot remove yourself as a platform admin" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the admin being deleted
      const { data: adminToDelete } = await supabaseAdmin
        .from("platform_admins")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabaseAdmin
        .from("platform_admins")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      await createAuditLog(
        userId!,
        adminEmail,
        "delete",
        "platform_admin",
        id,
        adminToDelete,
        null,
        ipAddress,
        userAgent
      );

      return new Response(
        JSON.stringify({ message: "Platform admin removed successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // User Management Endpoints
    // =========================================================================

    // GET /users - List all users with pagination, search, and filters
    if (path === "/users" && method === "GET") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "25");
      const search = url.searchParams.get("search");
      const role = url.searchParams.get("role");
      const companyId = url.searchParams.get("company_id");
      const isActive = url.searchParams.get("is_active");
      const sortBy = url.searchParams.get("sort_by") || "created_at";
      const sortOrder = url.searchParams.get("sort_order") || "desc";

      const offset = (page - 1) * limit;

      // Build the query
      let query = supabaseAdmin
        .from("admin_users_view")
        .select("*", { count: "exact" });

      // Apply filters
      if (search) {
        query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,full_name.ilike.%${search}%`);
      }
      if (role) {
        query = query.eq("role", role);
      }
      if (companyId) {
        query = query.eq("company_id", companyId);
      }
      if (isActive === "true") {
        query = query.eq("is_active_recently", true);
      } else if (isActive === "false") {
        query = query.eq("is_active_recently", false);
      }

      // Apply sorting
      const ascending = sortOrder === "asc";
      query = query.order(sortBy, { ascending });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      await createAuditLog(userId!, adminEmail, "list", "users", null, null, { search, role, page }, ipAddress, userAgent);

      return new Response(
        JSON.stringify({
          users: data || [],
          pagination: {
            total: count || 0,
            page,
            limit,
            total_pages: Math.ceil((count || 0) / limit),
            has_more: (count || 0) > offset + limit,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /user-stats - Get user statistics for dashboard
    if (path === "/user-stats" && method === "GET") {
      const [totalUsers, activeUsers, newUsers, adminUsers, roleStats] = await Promise.all([
        supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("users").select("*", { count: "exact", head: true }).gt("last_active_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabaseAdmin.from("users").select("*", { count: "exact", head: true }).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabaseAdmin.from("platform_admins").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabaseAdmin.from("users").select("role"),
      ]);

      // Calculate role distribution
      const roleDistribution: Record<string, number> = {};
      (roleStats.data || []).forEach((u: { role: string | null }) => {
        const r = u.role || "unknown";
        roleDistribution[r] = (roleDistribution[r] || 0) + 1;
      });

      return new Response(
        JSON.stringify({
          stats: {
            total_users: totalUsers.count || 0,
            active_users_30d: activeUsers.count || 0,
            new_users_month: newUsers.count || 0,
            platform_admins: adminUsers.count || 0,
            role_distribution: roleDistribution,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /users/:id - Get single user details
    if (path.match(/^\/users\/[a-f0-9-]+$/) && method === "GET") {
      const userId_param = path.split("/users/")[1];

      const { data, error } = await supabaseAdmin
        .from("admin_users_view")
        .select("*")
        .or(`id.eq.${userId_param},auth_id.eq.${userId_param}`)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return new Response(
            JSON.stringify({ error: "User not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw error;
      }

      // Get additional user data
      const [teamsData, rolesData] = await Promise.all([
        supabaseAdmin.from("team_members").select("*, teams(*)").eq("user_id", data.auth_id),
        supabaseAdmin.from("rbac_user_roles").select("*, rbac_roles(*)").eq("user_id", data.auth_id),
      ]);

      await createAuditLog(userId!, adminEmail, "view", "users", userId_param, null, null, ipAddress, userAgent);

      return new Response(
        JSON.stringify({
          user: {
            ...data,
            team_memberships: teamsData.data || [],
            rbac_roles: rolesData.data || [],
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /users/:id - Update user
    if (path.match(/^\/users\/[a-f0-9-]+$/) && method === "PUT") {
      const userId_param = path.split("/users/")[1];
      const body = await req.json();

      // Only super_admin and admin can update users
      if (!["super_admin", "admin"].includes(adminUser?.role || "")) {
        return new Response(
          JSON.stringify({ error: "Insufficient permissions to update users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get old data for audit
      const { data: oldUser } = await supabaseAdmin
        .from("users")
        .select("*")
        .or(`id.eq.${userId_param},auth_id.eq.${userId_param}`)
        .single();

      if (!oldUser) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Allowed fields to update
      const allowedFields = ["role", "job_title", "credits", "onboarding_completed", "full_name"];
      const updates: Record<string, unknown> = {};

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ error: "No valid fields to update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from("users")
        .update(updates)
        .eq("id", oldUser.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await createAuditLog(
        userId!,
        adminEmail,
        "update",
        "users",
        userId_param,
        { role: oldUser.role, job_title: oldUser.job_title, credits: oldUser.credits },
        updates,
        ipAddress,
        userAgent
      );

      return new Response(
        JSON.stringify({ user: data, message: "User updated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /users/:id - Deactivate user (soft delete)
    if (path.match(/^\/users\/[a-f0-9-]+$/) && method === "DELETE") {
      // Only super_admin can deactivate users
      if (adminUser?.role !== "super_admin") {
        return new Response(
          JSON.stringify({ error: "Only super admins can deactivate users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId_param = path.split("/users/")[1];

      // Get user data for audit
      const { data: userToDeactivate } = await supabaseAdmin
        .from("users")
        .select("*")
        .or(`id.eq.${userId_param},auth_id.eq.${userId_param}`)
        .single();

      if (!userToDeactivate) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent deactivating platform admins
      const { data: isPlatformAdmin } = await supabaseAdmin
        .from("platform_admins")
        .select("id")
        .eq("user_id", userToDeactivate.auth_id)
        .single();

      if (isPlatformAdmin) {
        return new Response(
          JSON.stringify({ error: "Cannot deactivate a platform admin. Remove admin status first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Soft delete by setting a deactivated flag or role
      const { error } = await supabaseAdmin
        .from("users")
        .update({ role: "deactivated", updated_at: new Date().toISOString() })
        .eq("id", userToDeactivate.id);

      if (error) {
        throw error;
      }

      await createAuditLog(
        userId!,
        adminEmail,
        "deactivate",
        "users",
        userId_param,
        userToDeactivate,
        { role: "deactivated" },
        ipAddress,
        userAgent
      );

      return new Response(
        JSON.stringify({ message: "User deactivated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /companies - List all companies for filter dropdown
    if (path === "/companies" && method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("companies")
        .select("id, name, domain")
        .order("name");

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ companies: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // Health Check
    // =========================================================================

    if (path === "/health" && method === "GET") {
      return new Response(
        JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // Stats Endpoint
    // =========================================================================

    if (path === "/stats" && method === "GET") {
      const [settingsCount, flagsCount, logsCount, adminsCount] = await Promise.all([
        supabaseAdmin.from("platform_settings").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("feature_flags").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("admin_audit_logs").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("platform_admins").select("*", { count: "exact", head: true }),
      ]);

      return new Response(
        JSON.stringify({
          stats: {
            platform_settings: settingsCount.count || 0,
            feature_flags: flagsCount.count || 0,
            audit_logs: logsCount.count || 0,
            platform_admins: adminsCount.count || 0,
          },
          current_admin: {
            id: adminUser?.id,
            role: adminUser?.role,
            user_id: userId,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route not found
    return new Response(
      JSON.stringify({ error: "Not found", path, method }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Admin API] Error:", error);

    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
