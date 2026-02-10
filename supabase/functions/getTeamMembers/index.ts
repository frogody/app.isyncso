import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token for RLS
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's company_id
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.company_id) {
      return new Response(
        JSON.stringify({ users: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get team members from the same company
    const { data: teamMembers, error: teamError } = await supabaseClient
      .from("users")
      .select("id, full_name, email, avatar_url, job_title")
      .eq("company_id", userData.company_id);

    if (teamError) {
      console.error("Error fetching team members:", teamError);
    }

    // Also fetch platform admins (super_admin, hierarchy_level >= 100) from any organization
    const { data: adminRoleUsers } = await supabaseClient
      .from("rbac_user_roles")
      .select("user_id, rbac_roles!inner(hierarchy_level)")
      .gte("rbac_roles.hierarchy_level", 100);

    let platformAdmins: any[] = [];
    if (adminRoleUsers && adminRoleUsers.length > 0) {
      const adminUserIds = adminRoleUsers.map((r: any) => r.user_id);
      const { data: adminUsers } = await supabaseClient
        .from("users")
        .select("id, full_name, email, avatar_url, job_title")
        .in("id", adminUserIds);
      platformAdmins = (adminUsers || []).map((u: any) => ({
        ...u,
        is_platform_admin: true,
      }));
    }

    // Merge and deduplicate (team members + platform admins)
    const teamList = (teamMembers || []).map((u: any) => ({ ...u, is_platform_admin: false }));
    const teamIds = new Set(teamList.map((u: any) => u.id));
    const uniqueAdmins = platformAdmins.filter((a: any) => !teamIds.has(a.id));

    // Mark team members who are also platform admins
    for (const member of teamList) {
      if (platformAdmins.some((a: any) => a.id === member.id)) {
        member.is_platform_admin = true;
      }
    }

    return new Response(
      JSON.stringify({ users: [...teamList, ...uniqueAdmins] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in getTeamMembers:", error);
    return new Response(
      JSON.stringify({ error: error.message, users: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
