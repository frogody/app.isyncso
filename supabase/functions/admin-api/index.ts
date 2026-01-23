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
