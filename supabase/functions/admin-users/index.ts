import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("Missing environment variables:", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        hasAnonKey: !!supabaseAnonKey,
      });
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user has admin or cipher role
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Forbidden - no role found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerRole = roleData.role;
    const isCipher = callerRole === "cipher";
    const isAdmin = callerRole === "admin";

    if (!isCipher && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden - insufficient permissions" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const handleDeleteUser = async (userId: string) => {
      // Prevent deleting self
      if (userId === user.id) {
        return json(400, { error: "Cannot delete yourself" });
      }

      // Check target user's role
      const { data: targetRole, error: targetRoleError } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (targetRoleError && targetRoleError.code !== "PGRST116") {
        console.error("Error fetching target role:", targetRoleError);
        return json(500, { error: "Failed to verify target user role" });
      }

      const targetUserRole = targetRole?.role || "user";

      // Admins cannot delete cipher users
      if (!isCipher && targetUserRole === "cipher") {
        return json(403, { error: "Cannot delete cipher users" });
      }

      // Step 1: Delete user_roles first to trigger Realtime event while connection is alive
      const { error: roleDeleteError } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (roleDeleteError) {
        console.warn("Failed to delete user_roles (non-fatal):", roleDeleteError);
      }

      // Small delay to allow Realtime event to propagate to client
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Sign out all sessions (backup to invalidate refresh tokens)
      try {
        await adminClient.auth.admin.signOut(userId, "global");
        console.log(`Signed out all sessions for user ${userId}`);
      } catch (signOutErr) {
        console.warn("Failed to sign out user sessions (non-fatal):", signOutErr);
      }

      // Step 3: Delete user from auth.users (cascade handles remaining data)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error("Error deleting user:", deleteError);
        return json(500, {
          error: "Failed to delete user",
          details: deleteError.message,
          code: (deleteError as unknown as { code?: string }).code,
          status: (deleteError as unknown as { status?: number }).status,
        });
      }

      return json(200, { success: true });
    };

    const handleApproveUser = async (
      userId: string,
      permissions: { 
        can_add_revenue: boolean; 
        can_add_expense: boolean; 
        can_add_expense_source: boolean;
        can_transfer: boolean;
        can_view_reports: boolean;
      }
    ) => {
      // Update registration request status
      const { error: updateError } = await adminClient
        .from("registration_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          can_add_revenue: permissions.can_add_revenue,
          can_add_expense: permissions.can_add_expense,
          can_add_expense_source: permissions.can_add_expense_source,
          can_transfer: permissions.can_transfer,
          can_view_reports: permissions.can_view_reports,
        })
        .eq("user_id", userId)
        .eq("status", "pending");

      if (updateError) {
        console.error("Error updating registration request:", updateError);
        return json(500, { error: "Failed to update registration request" });
      }

      // Create user role as moderator
      const { error: roleInsertError } = await adminClient
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "moderator",
          assigned_by: user.id,
        });

      if (roleInsertError) {
        console.error("Error inserting user role:", roleInsertError);
        return json(500, { error: "Failed to assign user role" });
      }

      // Create moderator permissions
      const { error: permError } = await adminClient
        .from("moderator_permissions")
        .insert({
          user_id: userId,
          can_add_revenue: permissions.can_add_revenue,
          can_add_expense: permissions.can_add_expense,
          can_add_expense_source: permissions.can_add_expense_source,
          can_transfer: permissions.can_transfer,
          can_view_reports: permissions.can_view_reports,
          controlled_by: user.id,
        });

      if (permError) {
        console.error("Error inserting moderator permissions:", permError);
        return json(500, { error: "Failed to set moderator permissions" });
      }

      return json(200, { success: true });
    };

    const handleRejectUser = async (userId: string, reason?: string) => {
      // Update registration request status first
      const { error: updateError } = await adminClient
        .from("registration_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: reason || null,
        })
        .eq("user_id", userId)
        .eq("status", "pending");

      if (updateError) {
        console.error("Error updating registration request:", updateError);
        return json(500, { error: "Failed to update registration request" });
      }

      // Delete user from auth.users
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error("Error deleting rejected user:", deleteError);
        return json(500, { error: "Failed to delete user account" });
      }

      return json(200, { success: true });
    };

    // Handle GET - List users with emails
    if (req.method === "GET") {
      const url = new URL(req.url);
      const pendingOnly = url.searchParams.get("pending") === "true";
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const perPage = parseInt(url.searchParams.get("perPage") || "50", 10);

      if (pendingOnly) {
        // Return pending registration requests
        const { data: requests, error: reqError } = await adminClient
          .from("registration_requests")
          .select("*")
          .eq("status", "pending")
          .order("requested_at", { ascending: false });

        if (reqError) {
          console.error("Error fetching pending requests:", reqError);
          return json(500, { error: "Failed to fetch pending requests" });
        }

        return json(200, { requests });
      }

      // Get all users from auth.users using admin API with pagination
      const { data: authUsers, error: authError } =
        await adminClient.auth.admin.listUsers({
          page,
          perPage,
        });

      if (authError) {
        console.error("Error fetching auth users:", authError);
        return json(500, { error: "Failed to fetch users" });
      }

      // Get all user roles
      const { data: roles, error: rolesError } = await adminClient
        .from("user_roles")
        .select("user_id, role, created_at");

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        return json(500, { error: "Failed to fetch roles" });
      }

      // Create a map of user_id to role
      const roleMap = new Map(
        roles?.map((r) => [r.user_id, { role: r.role, created_at: r.created_at }]) ||
          [],
      );

      // Combine auth users with roles, filtering by visibility
      const users = authUsers.users
        .map((authUser) => {
          const roleInfo = roleMap.get(authUser.id);
          return {
            user_id: authUser.id,
            email: authUser.email || null,
            role: (roleInfo?.role || "user") as string,
            created_at: roleInfo?.created_at || authUser.created_at,
          };
        })
        .filter((u) => {
          // Non-cipher users cannot see cipher users
          if (!isCipher && u.role === "cipher") {
            return false;
          }
          return true;
        });

      return json(200, { 
        users,
        pagination: {
          page,
          perPage,
          total: authUsers.total || users.length,
          hasMore: users.length === perPage,
        }
      });
    }

    // Handle POST - Delete, approve, or reject a user
    if (req.method === "POST") {
      const body = (await req.json().catch(() => null)) as
        | { 
            action?: string;
            userId?: string;
            permissions?: { 
              can_add_revenue: boolean; 
              can_add_expense: boolean; 
              can_add_expense_source: boolean;
              can_transfer: boolean;
              can_view_reports: boolean;
            };
            reason?: string;
          }
        | null;

      if (!body?.userId) {
        return json(400, { error: "Missing userId" });
      }

      // Handle different actions
      if (body.action === "approve") {
        const permissions = body.permissions || {
          can_add_revenue: true,
          can_add_expense: true,
          can_add_expense_source: false,
          can_transfer: false,
          can_view_reports: true,
        };
        return await handleApproveUser(body.userId, permissions);
      }

      if (body.action === "reject") {
        return await handleRejectUser(body.userId, body.reason);
      }

      // Default: delete user (backward compatibility)
      return await handleDeleteUser(body.userId);
    }

    // Handle DELETE - Delete a user (query param or JSON body)
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      let userId = url.searchParams.get("userId");

      if (!userId) {
        const body = (await req.json().catch(() => null)) as
          | { userId?: string }
          | null;
        userId = body?.userId || null;
      }

      if (!userId) {
        return json(400, { error: "Missing userId parameter" });
      }

      return await handleDeleteUser(userId);
    }

    return json(405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
