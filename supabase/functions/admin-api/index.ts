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
 * - GET /organizations - List organizations with pagination, search, filters
 * - GET /organizations/:id - Get organization details
 * - GET /organizations/:id/users - Get organization users
 * - PUT /organizations/:id - Update organization
 * - GET /organization-stats - Get organization statistics
 * - GET /marketplace/stats - Get marketplace statistics
 * - GET /marketplace/categories - List data categories
 * - POST /marketplace/categories - Create category
 * - PUT /marketplace/categories/:id - Update category
 * - GET /marketplace/products - List products with pagination, search, filters
 * - GET /marketplace/products/:id - Get product details
 * - POST /marketplace/products - Create product
 * - PUT /marketplace/products/:id - Update product
 * - DELETE /marketplace/products/:id - Delete product
 * - GET /marketplace/products/:id/purchases - Get product purchases
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
    // Organization Management Endpoints
    // =========================================================================

    // GET /organizations - List all organizations with pagination, search, and filters
    if (path === "/organizations" && method === "GET") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const search = url.searchParams.get("search");
      const industry = url.searchParams.get("industry");
      const status = url.searchParams.get("status");
      const sortBy = url.searchParams.get("sort_by") || "created_date";
      const sortOrder = url.searchParams.get("sort_order") || "desc";

      const offset = (page - 1) * limit;

      // Build the query
      let query = supabaseAdmin
        .from("admin_organizations_view")
        .select("*", { count: "exact" });

      // Apply filters
      if (search) {
        query = query.or(`name.ilike.%${search}%,domain.ilike.%${search}%`);
      }
      if (industry) {
        query = query.eq("industry", industry);
      }
      if (status === "active") {
        query = query.eq("is_active", true);
      } else if (status === "inactive") {
        query = query.eq("is_active", false);
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

      await createAuditLog(userId!, adminEmail, "list", "organizations", null, null, { search, industry, page }, ipAddress, userAgent);

      return new Response(
        JSON.stringify({
          organizations: data || [],
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

    // GET /organization-stats - Get organization statistics for dashboard
    if (path === "/organization-stats" && method === "GET") {
      const [totalOrgs, newOrgs, withSub] = await Promise.all([
        supabaseAdmin.from("companies").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("companies").select("*", { count: "exact", head: true }).gte("created_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabaseAdmin.from("subscriptions").select("company_id", { count: "exact", head: true }).eq("status", "active"),
      ]);

      // Get active organizations (with users who logged in recently)
      const { data: activeOrgsData } = await supabaseAdmin
        .from("admin_organizations_view")
        .select("id")
        .eq("is_active", true);

      // Get industry distribution
      const { data: industryData } = await supabaseAdmin
        .from("companies")
        .select("industry");

      const industryDistribution: Record<string, number> = {};
      (industryData || []).forEach((c: { industry: string | null }) => {
        const ind = c.industry || "Unknown";
        industryDistribution[ind] = (industryDistribution[ind] || 0) + 1;
      });

      return new Response(
        JSON.stringify({
          stats: {
            total_organizations: totalOrgs.count || 0,
            active_organizations: activeOrgsData?.length || 0,
            new_this_month: newOrgs.count || 0,
            with_subscription: withSub.count || 0,
            industry_distribution: industryDistribution,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /organizations/:id - Get single organization details
    if (path.match(/^\/organizations\/[a-f0-9-]+$/) && method === "GET") {
      const orgId = path.split("/organizations/")[1];

      const { data, error } = await supabaseAdmin
        .from("admin_organizations_view")
        .select("*")
        .eq("id", orgId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return new Response(
            JSON.stringify({ error: "Organization not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw error;
      }

      await createAuditLog(userId!, adminEmail, "view", "organizations", orgId, null, null, ipAddress, userAgent);

      return new Response(
        JSON.stringify({ organization: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /organizations/:id/users - Get organization users
    if (path.match(/^\/organizations\/[a-f0-9-]+\/users$/) && method === "GET") {
      const orgId = path.split("/organizations/")[1].replace("/users", "");

      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id, auth_id, name, full_name, email, role, job_title, avatar_url, last_active_at, created_at")
        .eq("company_id", orgId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Add is_active flag
      const usersWithStatus = (data || []).map((u: { last_active_at: string | null }) => ({
        ...u,
        is_active: u.last_active_at ? new Date(u.last_active_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : false,
      }));

      return new Response(
        JSON.stringify({ users: usersWithStatus }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /organizations/:id - Update organization
    if (path.match(/^\/organizations\/[a-f0-9-]+$/) && method === "PUT") {
      const orgId = path.split("/organizations/")[1];
      const body = await req.json();

      // Only super_admin and admin can update organizations
      if (!["super_admin", "admin"].includes(adminUser?.role || "")) {
        return new Response(
          JSON.stringify({ error: "Insufficient permissions to update organizations" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get old data for audit
      const { data: oldOrg } = await supabaseAdmin
        .from("companies")
        .select("*")
        .eq("id", orgId)
        .single();

      if (!oldOrg) {
        return new Response(
          JSON.stringify({ error: "Organization not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Allowed fields to update
      const allowedFields = ["name", "domain", "industry", "size", "revenue", "description", "website", "linkedin_url", "location"];
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

      updates.updated_date = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from("companies")
        .update(updates)
        .eq("id", orgId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await createAuditLog(
        userId!,
        adminEmail,
        "update",
        "organizations",
        orgId,
        { name: oldOrg.name, industry: oldOrg.industry, size: oldOrg.size },
        updates,
        ipAddress,
        userAgent
      );

      return new Response(
        JSON.stringify({ organization: data, message: "Organization updated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // Data Marketplace Endpoints
    // =========================================================================

    // GET /marketplace/stats - Get marketplace statistics
    if (path === "/marketplace/stats" && method === "GET") {
      const [totalProducts, publishedProducts, draftProducts, purchases, downloads, featured] = await Promise.all([
        supabaseAdmin.from("data_products").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("data_products").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabaseAdmin.from("data_products").select("*", { count: "exact", head: true }).eq("status", "draft"),
        supabaseAdmin.from("data_purchases").select("amount", { count: "exact" }).eq("payment_status", "completed"),
        supabaseAdmin.from("data_products").select("download_count"),
        supabaseAdmin.from("data_products").select("*", { count: "exact", head: true }).eq("is_featured", true),
      ]);

      // Calculate total revenue
      const totalRevenue = (purchases.data || []).reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);

      // Calculate total downloads
      const totalDownloads = (downloads.data || []).reduce((sum: number, p: { download_count: number }) => sum + (p.download_count || 0), 0);

      // Get products by category
      const { data: categoryData } = await supabaseAdmin
        .from("data_categories")
        .select("id, name");

      const { data: productsByCategory } = await supabaseAdmin
        .from("data_products")
        .select("category_id");

      const categoryCounts: Record<string, number> = {};
      (productsByCategory || []).forEach((p: { category_id: string | null }) => {
        if (p.category_id) {
          categoryCounts[p.category_id] = (categoryCounts[p.category_id] || 0) + 1;
        }
      });

      const productsByCategoryWithNames = (categoryData || []).map((c: { id: string; name: string }) => ({
        category: c.name,
        count: categoryCounts[c.id] || 0,
      }));

      // Get products by status
      const { data: statusData } = await supabaseAdmin
        .from("data_products")
        .select("status");

      const statusCounts: Record<string, number> = {};
      (statusData || []).forEach((p: { status: string }) => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });

      const productsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

      // Get recent purchases
      const { data: recentPurchases } = await supabaseAdmin
        .from("data_purchases")
        .select("id, amount, purchased_at, product_id, user_id")
        .eq("payment_status", "completed")
        .order("purchased_at", { ascending: false })
        .limit(5);

      // Enrich with product and user names
      const enrichedPurchases = await Promise.all(
        (recentPurchases || []).map(async (p: { id: string; amount: number; purchased_at: string; product_id: string; user_id: string }) => {
          const [{ data: product }, { data: user }] = await Promise.all([
            supabaseAdmin.from("data_products").select("name").eq("id", p.product_id).single(),
            supabaseAdmin.from("users").select("name").eq("id", p.user_id).single(),
          ]);
          return {
            id: p.id,
            product_name: product?.name || "Unknown",
            user_name: user?.name || "Unknown",
            amount: p.amount,
            purchased_at: p.purchased_at,
          };
        })
      );

      return new Response(
        JSON.stringify({
          stats: {
            total_products: totalProducts.count || 0,
            published_products: publishedProducts.count || 0,
            draft_products: draftProducts.count || 0,
            total_purchases: purchases.count || 0,
            total_revenue: totalRevenue,
            total_downloads: totalDownloads,
            featured_products: featured.count || 0,
            products_by_category: productsByCategoryWithNames,
            products_by_status: productsByStatus,
            recent_purchases: enrichedPurchases,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /marketplace/categories - Get all categories
    if (path === "/marketplace/categories" && method === "GET") {
      const { data: categories, error } = await supabaseAdmin
        .from("data_categories")
        .select("*")
        .order("sort_order");

      if (error) {
        throw error;
      }

      // Get product counts for each category
      const { data: products } = await supabaseAdmin
        .from("data_products")
        .select("category_id");

      const categoryCounts: Record<string, number> = {};
      (products || []).forEach((p: { category_id: string | null }) => {
        if (p.category_id) {
          categoryCounts[p.category_id] = (categoryCounts[p.category_id] || 0) + 1;
        }
      });

      const categoriesWithCounts = (categories || []).map((c: { id: string }) => ({
        ...c,
        product_count: categoryCounts[c.id] || 0,
      }));

      return new Response(
        JSON.stringify({ categories: categoriesWithCounts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /marketplace/categories - Create a new category
    if (path === "/marketplace/categories" && method === "POST") {
      const body = await req.json();
      const { name, slug, description, icon, sort_order, is_active } = body;

      if (!name || !slug) {
        return new Response(
          JSON.stringify({ error: "Name and slug are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("data_categories")
        .insert({
          name,
          slug,
          description,
          icon,
          sort_order: sort_order || 0,
          is_active: is_active !== false,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return new Response(
            JSON.stringify({ error: "Category slug already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw error;
      }

      await createAuditLog(userId!, adminEmail, "create", "data_categories", data.id, null, data, ipAddress, userAgent);

      return new Response(
        JSON.stringify({ category: data, message: "Category created successfully" }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /marketplace/categories/:id - Update a category
    if (path.match(/^\/marketplace\/categories\/[a-f0-9-]+$/) && method === "PUT") {
      const categoryId = path.split("/marketplace/categories/")[1];
      const body = await req.json();

      const allowedFields = ["name", "slug", "description", "icon", "sort_order", "is_active"];
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
        .from("data_categories")
        .update(updates)
        .eq("id", categoryId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await createAuditLog(userId!, adminEmail, "update", "data_categories", categoryId, null, updates, ipAddress, userAgent);

      return new Response(
        JSON.stringify({ category: data, message: "Category updated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /marketplace/products - List all products with pagination, search, filters
    if (path === "/marketplace/products" && method === "GET") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const search = url.searchParams.get("search");
      const category = url.searchParams.get("category");
      const status = url.searchParams.get("status");
      const sortBy = url.searchParams.get("sort_by") || "created_at";
      const sortOrder = url.searchParams.get("sort_order") || "desc";

      const offset = (page - 1) * limit;

      // Build the query
      let query = supabaseAdmin
        .from("data_products")
        .select("*, data_categories(name, icon)", { count: "exact" });

      // Apply filters
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }
      if (category) {
        query = query.eq("category_id", category);
      }
      if (status) {
        query = query.eq("status", status);
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

      // Get creator names
      const products = await Promise.all(
        (data || []).map(async (p: { created_by: string | null; data_categories: { name: string; icon: string } | null }) => {
          let creatorName = null;
          if (p.created_by) {
            const { data: creator } = await supabaseAdmin
              .from("users")
              .select("name")
              .eq("id", p.created_by)
              .single();
            creatorName = creator?.name;
          }
          return {
            ...p,
            category_name: p.data_categories?.name,
            category_icon: p.data_categories?.icon,
            created_by_name: creatorName,
          };
        })
      );

      await createAuditLog(userId!, adminEmail, "list", "data_products", null, null, { search, category, status, page }, ipAddress, userAgent);

      return new Response(
        JSON.stringify({
          products,
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

    // GET /marketplace/products/:id - Get single product details
    if (path.match(/^\/marketplace\/products\/[a-f0-9-]+$/) && method === "GET") {
      const productId = path.split("/marketplace/products/")[1];

      const { data: product, error } = await supabaseAdmin
        .from("data_products")
        .select("*, data_categories(name, icon)")
        .eq("id", productId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return new Response(
            JSON.stringify({ error: "Product not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw error;
      }

      // Get creator info
      let creatorInfo = null;
      if (product.created_by) {
        const { data: creator } = await supabaseAdmin
          .from("users")
          .select("id, name, email, avatar_url")
          .eq("id", product.created_by)
          .single();
        creatorInfo = creator;
      }

      // Get recent purchases
      const { data: purchases } = await supabaseAdmin
        .from("data_purchases")
        .select("id, amount, currency, payment_status, purchased_at, user_id, company_id")
        .eq("product_id", productId)
        .order("purchased_at", { ascending: false })
        .limit(20);

      // Enrich purchases with user/company info
      const enrichedPurchases = await Promise.all(
        (purchases || []).map(async (p: { id: string; amount: number; currency: string; payment_status: string; purchased_at: string; user_id: string; company_id: string | null }) => {
          const [{ data: user }, { data: company }] = await Promise.all([
            supabaseAdmin.from("users").select("name, email").eq("id", p.user_id).single(),
            p.company_id ? supabaseAdmin.from("companies").select("name").eq("id", p.company_id).single() : Promise.resolve({ data: null }),
          ]);
          return {
            ...p,
            user_name: user?.name,
            user_email: user?.email,
            company_name: company?.name,
          };
        })
      );

      // Get download count from data_downloads table
      const { count: downloadCount } = await supabaseAdmin
        .from("data_downloads")
        .select("*", { count: "exact", head: true })
        .eq("product_id", productId);

      await createAuditLog(userId!, adminEmail, "view", "data_products", productId, null, null, ipAddress, userAgent);

      return new Response(
        JSON.stringify({
          product: {
            ...product,
            category_name: product.data_categories?.name,
            category_icon: product.data_categories?.icon,
            created_by_info: creatorInfo,
            recent_purchases: enrichedPurchases,
            total_downloads: downloadCount || product.download_count || 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /marketplace/products - Create a new product
    if (path === "/marketplace/products" && method === "POST") {
      const body = await req.json();
      const {
        name, slug, description, long_description, category_id,
        price_type, price, currency,
        data_format, data_source, record_count, update_frequency,
        sample_file_url, full_file_url, preview_image_url,
        tags, features, status, is_featured
      } = body;

      if (!name || !slug) {
        return new Response(
          JSON.stringify({ error: "Name and slug are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user.id from users table using auth_id
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("auth_id", userId)
        .single();

      const { data, error } = await supabaseAdmin
        .from("data_products")
        .insert({
          name,
          slug,
          description,
          long_description,
          category_id,
          price_type: price_type || "one_time",
          price: price || 0,
          currency: currency || "EUR",
          data_format,
          data_source,
          record_count,
          update_frequency,
          sample_file_url,
          full_file_url,
          preview_image_url,
          tags: tags || [],
          features: features || [],
          status: status || "draft",
          is_featured: is_featured || false,
          created_by: userData?.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return new Response(
            JSON.stringify({ error: "Product slug already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw error;
      }

      await createAuditLog(userId!, adminEmail, "create", "data_products", data.id, null, { name, slug, price }, ipAddress, userAgent);

      return new Response(
        JSON.stringify({ product: data, message: "Product created successfully" }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /marketplace/products/:id - Update a product
    if (path.match(/^\/marketplace\/products\/[a-f0-9-]+$/) && method === "PUT") {
      const productId = path.split("/marketplace/products/")[1];
      const body = await req.json();

      // Get old data for audit
      const { data: oldProduct } = await supabaseAdmin
        .from("data_products")
        .select("*")
        .eq("id", productId)
        .single();

      if (!oldProduct) {
        return new Response(
          JSON.stringify({ error: "Product not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const allowedFields = [
        "name", "slug", "description", "long_description", "category_id",
        "price_type", "price", "currency",
        "data_format", "data_source", "record_count", "update_frequency",
        "sample_file_url", "full_file_url", "preview_image_url",
        "tags", "features", "status", "is_featured"
      ];
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
        .from("data_products")
        .update(updates)
        .eq("id", productId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await createAuditLog(
        userId!,
        adminEmail,
        "update",
        "data_products",
        productId,
        { name: oldProduct.name, status: oldProduct.status, price: oldProduct.price },
        updates,
        ipAddress,
        userAgent
      );

      return new Response(
        JSON.stringify({ product: data, message: "Product updated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /marketplace/products/:id - Delete a product
    if (path.match(/^\/marketplace\/products\/[a-f0-9-]+$/) && method === "DELETE") {
      const productId = path.split("/marketplace/products/")[1];

      // Only super_admin can delete products
      if (adminUser?.role !== "super_admin") {
        return new Response(
          JSON.stringify({ error: "Only super admins can delete products" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get product for audit
      const { data: product } = await supabaseAdmin
        .from("data_products")
        .select("name")
        .eq("id", productId)
        .single();

      if (!product) {
        return new Response(
          JSON.stringify({ error: "Product not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabaseAdmin
        .from("data_products")
        .delete()
        .eq("id", productId);

      if (error) {
        throw error;
      }

      await createAuditLog(userId!, adminEmail, "delete", "data_products", productId, product, null, ipAddress, userAgent);

      return new Response(
        JSON.stringify({ message: "Product deleted successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /marketplace/products/:id/purchases - Get purchases for a product
    if (path.match(/^\/marketplace\/products\/[a-f0-9-]+\/purchases$/) && method === "GET") {
      const productId = path.split("/marketplace/products/")[1].replace("/purchases", "");

      const { data: purchases, error } = await supabaseAdmin
        .from("data_purchases")
        .select("*")
        .eq("product_id", productId)
        .order("purchased_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Enrich with user/company info
      const enrichedPurchases = await Promise.all(
        (purchases || []).map(async (p: { user_id: string; company_id: string | null }) => {
          const [{ data: user }, { data: company }] = await Promise.all([
            supabaseAdmin.from("users").select("name, email, avatar_url").eq("id", p.user_id).single(),
            p.company_id ? supabaseAdmin.from("companies").select("name").eq("id", p.company_id).single() : Promise.resolve({ data: null }),
          ]);
          return {
            ...p,
            user_name: user?.name,
            user_email: user?.email,
            user_avatar: user?.avatar_url,
            company_name: company?.name,
          };
        })
      );

      return new Response(
        JSON.stringify({ purchases: enrichedPurchases }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // App Store Management Endpoints
    // =========================================================================

    // GET /apps/stats - Get app store statistics
    if (path === "/apps/stats" && method === "GET") {
      const [totalApps, activeApps, activeLicenses, licensedCompanies, monthlyRevenue] = await Promise.all([
        supabaseAdmin.from("platform_apps").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("platform_apps").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabaseAdmin.from("app_licenses").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabaseAdmin.from("app_licenses").select("company_id").eq("status", "active"),
        supabaseAdmin.from("app_licenses").select("amount").eq("status", "active").eq("billing_cycle", "monthly"),
      ]);

      // Calculate unique licensed companies
      const uniqueCompanies = new Set((licensedCompanies.data || []).map((l: { company_id: string }) => l.company_id));

      // Calculate monthly revenue
      const revenue = (monthlyRevenue.data || []).reduce((sum: number, l: { amount: number }) => sum + (l.amount || 0), 0);

      return new Response(
        JSON.stringify({
          total_apps: totalApps.count || 0,
          active_apps: activeApps.count || 0,
          active_licenses: activeLicenses.count || 0,
          licensed_companies: uniqueCompanies.size,
          monthly_revenue: revenue,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /apps - List all platform apps
    if (path === "/apps" && method === "GET") {
      const category = url.searchParams.get("category");
      const pricing = url.searchParams.get("pricing");
      const status = url.searchParams.get("status");

      let query = supabaseAdmin.from("platform_apps").select("*");

      if (category) query = query.eq("category", category);
      if (pricing) query = query.eq("pricing_type", pricing);
      if (status === "active") query = query.eq("is_active", true);
      if (status === "beta") query = query.eq("is_beta", true);
      if (status === "inactive") query = query.eq("is_active", false);

      const { data: apps, error } = await query.order("sort_order").order("name");

      if (error) throw error;

      // Get license counts for each app
      const appIds = (apps || []).map((a: { id: string }) => a.id);
      const { data: licenseCounts } = await supabaseAdmin
        .from("app_licenses")
        .select("app_id")
        .in("app_id", appIds)
        .eq("status", "active");

      // Count licenses per app
      const licenseCountMap: Record<string, number> = {};
      (licenseCounts || []).forEach((l: { app_id: string }) => {
        licenseCountMap[l.app_id] = (licenseCountMap[l.app_id] || 0) + 1;
      });

      // Get revenue per app
      const { data: revenueData } = await supabaseAdmin
        .from("app_licenses")
        .select("app_id, amount")
        .in("app_id", appIds)
        .eq("status", "active");

      const revenueMap: Record<string, number> = {};
      (revenueData || []).forEach((l: { app_id: string; amount: number }) => {
        revenueMap[l.app_id] = (revenueMap[l.app_id] || 0) + (l.amount || 0);
      });

      // Enrich apps with license counts and revenue
      const enrichedApps = (apps || []).map((app: { id: string }) => ({
        ...app,
        active_licenses: licenseCountMap[app.id] || 0,
        total_revenue: revenueMap[app.id] || 0,
      }));

      await createAuditLog(userId!, adminEmail, "list", "platform_apps", null, null, { category, pricing, status }, ipAddress, userAgent);

      return new Response(
        JSON.stringify(enrichedApps),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /apps/:id - Get single app details
    if (path.match(/^\/apps\/[a-f0-9-]+$/) && method === "GET") {
      const appId = path.split("/apps/")[1];

      const { data: app, error } = await supabaseAdmin
        .from("platform_apps")
        .select("*")
        .eq("id", appId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return new Response(
            JSON.stringify({ error: "App not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw error;
      }

      // Get license stats
      const [activeLicenses, totalRevenue] = await Promise.all([
        supabaseAdmin.from("app_licenses").select("*", { count: "exact", head: true }).eq("app_id", appId).eq("status", "active"),
        supabaseAdmin.from("app_licenses").select("amount").eq("app_id", appId).eq("status", "active"),
      ]);

      const revenue = (totalRevenue.data || []).reduce((sum: number, l: { amount: number }) => sum + (l.amount || 0), 0);

      await createAuditLog(userId!, adminEmail, "view", "platform_apps", appId, null, null, ipAddress, userAgent);

      return new Response(
        JSON.stringify({
          ...app,
          active_licenses: activeLicenses.count || 0,
          total_revenue: revenue,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /apps - Create or update platform app
    if (path === "/apps" && method === "POST") {
      const body = await req.json();
      const { id, name, slug, description, long_description, category, icon, pricing_model, base_price, status, is_core, route_path, required_permissions, dependencies, sort_order } = body;

      if (!name || !slug) {
        return new Response(
          JSON.stringify({ error: "Name and slug are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Map frontend fields to database schema
      const appData: Record<string, unknown> = {
        name,
        slug,
        description: description || null,
        long_description: long_description || null,
        category: category || "productivity",
        icon: icon || null,
        pricing_type: pricing_model || "free",
        price_monthly: base_price || 0,
        is_active: status !== "inactive" && status !== "deprecated",
        is_beta: status === "beta",
        is_new: false,
        route_path: route_path || `/${slug}`,
        required_permissions: required_permissions || [],
        dependencies: dependencies || [],
        sort_order: sort_order || 0,
      };

      let result;
      if (id) {
        // Update existing app
        const { data: oldApp } = await supabaseAdmin.from("platform_apps").select("*").eq("id", id).single();

        const { data, error } = await supabaseAdmin
          .from("platform_apps")
          .update({ ...appData, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        result = data;

        await createAuditLog(userId!, adminEmail, "update", "platform_apps", id, oldApp, data, ipAddress, userAgent);
      } else {
        // Create new app
        const { data, error } = await supabaseAdmin
          .from("platform_apps")
          .insert(appData)
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            return new Response(
              JSON.stringify({ error: "App slug already exists" }),
              { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw error;
        }
        result = data;

        await createAuditLog(userId!, adminEmail, "create", "platform_apps", data.id, null, data, ipAddress, userAgent);
      }

      return new Response(
        JSON.stringify(result),
        { status: id ? 200 : 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /apps/:id - Delete platform app
    if (path.match(/^\/apps\/[a-f0-9-]+$/) && method === "DELETE") {
      const appId = path.split("/apps/")[1];

      // Only super_admin can delete apps
      if (adminUser?.role !== "super_admin") {
        return new Response(
          JSON.stringify({ error: "Only super admins can delete apps" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get app for audit
      const { data: app } = await supabaseAdmin.from("platform_apps").select("*").eq("id", appId).single();

      if (!app) {
        return new Response(
          JSON.stringify({ error: "App not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for active licenses
      const { count: activeLicenses } = await supabaseAdmin
        .from("app_licenses")
        .select("*", { count: "exact", head: true })
        .eq("app_id", appId)
        .eq("status", "active");

      if (activeLicenses && activeLicenses > 0) {
        return new Response(
          JSON.stringify({ error: `Cannot delete app with ${activeLicenses} active license(s). Revoke licenses first.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabaseAdmin.from("platform_apps").delete().eq("id", appId);
      if (error) throw error;

      await createAuditLog(userId!, adminEmail, "delete", "platform_apps", appId, app, null, ipAddress, userAgent);

      return new Response(
        JSON.stringify({ message: "App deleted successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /licenses - List all licenses
    if (path === "/licenses" && method === "GET") {
      const appId = url.searchParams.get("app");
      const companyId = url.searchParams.get("company");
      const status = url.searchParams.get("status");

      let query = supabaseAdmin.from("app_licenses").select("*");

      if (appId) query = query.eq("app_id", appId);
      if (companyId) query = query.eq("company_id", companyId);
      if (status) query = query.eq("status", status);

      const { data: licenses, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      // Get app and company names
      const appIds = [...new Set((licenses || []).map((l: { app_id: string }) => l.app_id))];
      const companyIds = [...new Set((licenses || []).map((l: { company_id: string }) => l.company_id))];

      const [{ data: apps }, { data: companies }] = await Promise.all([
        supabaseAdmin.from("platform_apps").select("id, name, icon").in("id", appIds),
        supabaseAdmin.from("companies").select("id, name").in("id", companyIds),
      ]);

      const appMap: Record<string, { name: string; icon: string }> = {};
      (apps || []).forEach((a: { id: string; name: string; icon: string }) => {
        appMap[a.id] = { name: a.name, icon: a.icon };
      });

      const companyMap: Record<string, string> = {};
      (companies || []).forEach((c: { id: string; name: string }) => {
        companyMap[c.id] = c.name;
      });

      // Enrich licenses
      const enrichedLicenses = (licenses || []).map((license: { app_id: string; company_id: string }) => ({
        ...license,
        app_name: appMap[license.app_id]?.name || "Unknown",
        app_icon: appMap[license.app_id]?.icon || null,
        company_name: companyMap[license.company_id] || "Unknown",
      }));

      await createAuditLog(userId!, adminEmail, "list", "app_licenses", null, null, { appId, companyId, status }, ipAddress, userAgent);

      return new Response(
        JSON.stringify(enrichedLicenses),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /licenses - Grant a new license
    if (path === "/licenses" && method === "POST") {
      const body = await req.json();
      const { app_id, company_id, license_type, expires_at, amount, billing_cycle, user_limit, notes } = body;

      if (!app_id || !company_id) {
        return new Response(
          JSON.stringify({ error: "app_id and company_id are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if license already exists
      const { data: existing } = await supabaseAdmin
        .from("app_licenses")
        .select("id, status")
        .eq("app_id", app_id)
        .eq("company_id", company_id)
        .eq("status", "active")
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "An active license already exists for this app and company" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user.id from auth_id
      const { data: userData } = await supabaseAdmin.from("users").select("id").eq("auth_id", userId).single();

      const { data, error } = await supabaseAdmin
        .from("app_licenses")
        .insert({
          app_id,
          company_id,
          license_type: license_type || "subscription",
          status: "active",
          expires_at: expires_at || null,
          amount: amount || 0,
          billing_cycle: billing_cycle || "monthly",
          user_limit: user_limit || null,
          notes: notes || null,
          granted_by: userData?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      await createAuditLog(userId!, adminEmail, "create", "app_licenses", data.id, null, data, ipAddress, userAgent);

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /licenses/:id - Update a license
    if (path.match(/^\/licenses\/[a-f0-9-]+$/) && method === "PUT") {
      const licenseId = path.split("/licenses/")[1];
      const body = await req.json();

      // Get old data for audit
      const { data: oldLicense } = await supabaseAdmin.from("app_licenses").select("*").eq("id", licenseId).single();

      if (!oldLicense) {
        return new Response(
          JSON.stringify({ error: "License not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const allowedFields = ["status", "expires_at", "amount", "billing_cycle", "user_limit", "notes"];
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
        .from("app_licenses")
        .update(updates)
        .eq("id", licenseId)
        .select()
        .single();

      if (error) throw error;

      await createAuditLog(userId!, adminEmail, "update", "app_licenses", licenseId, oldLicense, data, ipAddress, userAgent);

      return new Response(
        JSON.stringify(data),
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
