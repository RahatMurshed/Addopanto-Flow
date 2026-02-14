import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
};

// --- Zod schemas ---

const uuidField = z.string().uuid("Invalid ID format");

const permissionsSchema = z.object({
  can_add_revenue: z.boolean().optional().default(true),
  can_add_expense: z.boolean().optional().default(true),
  can_add_expense_source: z.boolean().optional().default(false),
  can_transfer: z.boolean().optional().default(false),
  can_view_reports: z.boolean().optional().default(true),
});

const postBodySchema = z.object({
  action: z.enum(["approve", "reject", "permanent-delete", "accept-rejected", "delete"]).optional(),
  userId: uuidField,
  permissions: permissionsSchema.optional(),
  reason: z.string().max(500, "Reason too long").optional().nullable(),
});

const getParamsSchema = z.object({
  pending: z.enum(["true", "false"]).optional(),
  page: z.string().regex(/^\d+$/, "Page must be a number").optional(),
  perPage: z.string().regex(/^\d+$/, "perPage must be a number").optional(),
});

const deleteBodySchema = z.object({
  userId: uuidField,
});

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

    const jsonResp = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const handleDeleteUser = async (userId: string) => {
      if (userId === user.id) {
        return jsonResp(400, { error: "Cannot delete yourself" });
      }

      const { data: targetRole, error: targetRoleError } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (targetRoleError && targetRoleError.code !== "PGRST116") {
        console.error("Error fetching target role:", targetRoleError);
        return jsonResp(500, { error: "Failed to verify target user role" });
      }

      const targetUserRole = targetRole?.role || "user";

      if (!isCipher && targetUserRole !== "moderator") {
        return jsonResp(403, { error: "Admins can only delete moderators" });
      }

      const { data: targetAuthUser, error: authLookupError } =
        await adminClient.auth.admin.getUserById(userId);

      if (authLookupError) {
        console.error("Error looking up user:", authLookupError);
        return jsonResp(500, { error: "Failed to look up user" });
      }

      const targetEmail = targetAuthUser?.user?.email;

      const { error: roleDeleteError } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (roleDeleteError) {
        console.warn("Failed to delete user_roles (non-fatal):", roleDeleteError);
      }

      await adminClient.from("moderator_permissions").delete().eq("user_id", userId);
      await adminClient.from("registration_requests").delete().eq("user_id", userId);

      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        await adminClient.auth.admin.signOut(userId, "global");
        console.log(`Signed out all sessions for user ${userId}`);
      } catch (signOutErr) {
        console.warn("Failed to sign out user sessions (non-fatal):", signOutErr);
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error("Error deleting user:", deleteError);
        return jsonResp(500, {
          error: "Failed to delete user",
          details: deleteError.message,
          code: (deleteError as unknown as { code?: string }).code,
          status: (deleteError as unknown as { status?: number }).status,
        });
      }

      return jsonResp(200, { success: true });
    };

    const handleApproveUser = async (
      userId: string,
      permissions: z.infer<typeof permissionsSchema>
    ) => {
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
        return jsonResp(500, { error: "Failed to update registration request" });
      }

      const { error: roleInsertError } = await adminClient
        .from("user_roles")
        .upsert({
          user_id: userId,
          role: "moderator",
          assigned_by: user.id,
        }, { onConflict: "user_id,role" });

      if (roleInsertError) {
        console.error("Error inserting user role:", roleInsertError);
        return jsonResp(500, { error: "Failed to assign user role" });
      }

      const { error: permError } = await adminClient
        .from("moderator_permissions")
        .upsert({
          user_id: userId,
          can_add_revenue: permissions.can_add_revenue,
          can_add_expense: permissions.can_add_expense,
          can_add_expense_source: permissions.can_add_expense_source,
          can_transfer: permissions.can_transfer,
          can_view_reports: permissions.can_view_reports,
          controlled_by: user.id,
        }, { onConflict: "user_id" });

      if (permError) {
        console.error("Error inserting moderator permissions:", permError);
        return jsonResp(500, { error: "Failed to set moderator permissions" });
      }

      return jsonResp(200, { success: true });
    };

    const handleRejectUser = async (userId: string, reason?: string | null) => {
      const { error: updateError } = await adminClient
        .from("registration_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: reason || null,
          banned_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("user_id", userId)
        .eq("status", "pending");

      if (updateError) {
        console.error("Error updating registration request:", updateError);
        return jsonResp(500, { error: "Failed to update registration request" });
      }

      await adminClient.from("user_roles").delete().eq("user_id", userId);

      try {
        await adminClient.auth.admin.signOut(userId, "global");
      } catch (_e) { /* non-fatal */ }

      return jsonResp(200, { success: true });
    };

    const handlePermanentDelete = async (userId: string) => {
      const { data: targetAuthUser } = await adminClient.auth.admin.getUserById(userId);
      const targetEmail = targetAuthUser?.user?.email;

      const { data: existingReq } = await adminClient
        .from("registration_requests")
        .select("email")
        .eq("user_id", userId)
        .maybeSingle();

      const emailForBan = targetEmail || existingReq?.email;

      await adminClient.from("registration_requests").delete().eq("user_id", userId);
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      await adminClient.from("moderator_permissions").delete().eq("user_id", userId);

      try {
        await adminClient.auth.admin.signOut(userId, "global");
      } catch (_e) { /* non-fatal */ }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error("Error deleting user:", deleteError);
        return jsonResp(500, { error: "Failed to delete user account" });
      }

      if (emailForBan) {
        const bannedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error: banError } = await adminClient
          .from("registration_requests")
          .insert({
            user_id: crypto.randomUUID(),
            email: emailForBan,
            status: "rejected",
            banned_until: bannedUntil,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
          });

        if (banError) {
          console.error("Failed to insert ban record:", banError);
        } else {
          console.log(`Set 7-day permanent delete ban for ${emailForBan} until ${bannedUntil}`);
        }
      }

      return jsonResp(200, { success: true });
    };

    const handleAcceptFromRejected = async (
      userId: string,
      permissions?: z.infer<typeof permissionsSchema>
    ) => {
      const perms = permissions || {
        can_add_revenue: true,
        can_add_expense: true,
        can_add_expense_source: false,
        can_transfer: false,
        can_view_reports: true,
      };

      const { error: updateError } = await adminClient
        .from("registration_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          banned_until: null,
          can_add_revenue: perms.can_add_revenue,
          can_add_expense: perms.can_add_expense,
          can_add_expense_source: perms.can_add_expense_source,
          can_transfer: perms.can_transfer,
          can_view_reports: perms.can_view_reports,
        })
        .eq("user_id", userId)
        .eq("status", "rejected");

      if (updateError) {
        console.error("Error updating registration request:", updateError);
        return jsonResp(500, { error: "Failed to update registration request" });
      }

      const { error: roleError } = await adminClient
        .from("user_roles")
        .upsert({ user_id: userId, role: "moderator", assigned_by: user.id }, { onConflict: "user_id,role" });

      if (roleError) {
        console.error("Error inserting role:", roleError);
        return jsonResp(500, { error: "Failed to assign role" });
      }

      const { error: permError } = await adminClient
        .from("moderator_permissions")
        .insert({
          user_id: userId,
          ...perms,
          controlled_by: user.id,
        });

      if (permError) {
        console.error("Error inserting permissions:", permError);
        return jsonResp(500, { error: "Failed to set permissions" });
      }

      return jsonResp(200, { success: true });
    };

    // Handle GET - List users with emails
    if (req.method === "GET") {
      const url = new URL(req.url);
      const paramsParsed = getParamsSchema.safeParse({
        pending: url.searchParams.get("pending") ?? undefined,
        page: url.searchParams.get("page") ?? undefined,
        perPage: url.searchParams.get("perPage") ?? undefined,
      });

      if (!paramsParsed.success) {
        return jsonResp(400, { error: paramsParsed.error.issues[0]?.message || "Invalid query parameters" });
      }

      const pendingOnly = paramsParsed.data.pending === "true";
      const page = parseInt(paramsParsed.data.page || "1", 10);
      const perPage = Math.min(parseInt(paramsParsed.data.perPage || "50", 10), 100);

      if (pendingOnly) {
        const { data: requests, error: reqError } = await adminClient
          .from("registration_requests")
          .select("*")
          .eq("status", "pending")
          .order("requested_at", { ascending: false });

        if (reqError) {
          console.error("Error fetching pending requests:", reqError);
          return jsonResp(500, { error: "Failed to fetch pending requests" });
        }

        return jsonResp(200, { requests });
      }

      const { data: authUsers, error: authError } =
        await adminClient.auth.admin.listUsers({
          page,
          perPage,
        });

      if (authError) {
        console.error("Error fetching auth users:", authError);
        return jsonResp(500, { error: "Failed to fetch users" });
      }

      const { data: roles, error: rolesError } = await adminClient
        .from("user_roles")
        .select("user_id, role, created_at");

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        return jsonResp(500, { error: "Failed to fetch roles" });
      }

      const userIds = authUsers.users.map((u) => u.id);
      const { data: profilesData } = await adminClient
        .from("user_profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        profilesData?.map((p) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || [],
      );

      const roleMap = new Map(
        roles?.map((r) => [r.user_id, { role: r.role, created_at: r.created_at }]) ||
          [],
      );

      const users = authUsers.users
        .map((authUser) => {
          const roleInfo = roleMap.get(authUser.id);
          return {
            user_id: authUser.id,
            email: authUser.email || null,
            full_name: profileMap.get(authUser.id)?.full_name || null,
            avatar_url: profileMap.get(authUser.id)?.avatar_url || null,
            role: (roleInfo?.role || "user") as string,
            created_at: roleInfo?.created_at || authUser.created_at,
          };
        })
        .filter((u) => {
          if (!isCipher && u.role === "cipher") {
            return false;
          }
          return true;
        });

      return jsonResp(200, { 
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
      const rawBody = await req.json().catch(() => null);
      const parsed = postBodySchema.safeParse(rawBody);

      if (!parsed.success) {
        return jsonResp(400, { error: parsed.error.issues[0]?.message || "Invalid input" });
      }

      const body = parsed.data;

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

      if (body.action === "permanent-delete") {
        return await handlePermanentDelete(body.userId);
      }

      if (body.action === "accept-rejected") {
        return await handleAcceptFromRejected(body.userId, body.permissions);
      }

      // Default: delete user (backward compatibility)
      return await handleDeleteUser(body.userId);
    }

    // Handle DELETE - Delete a user (query param or JSON body)
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const userIdParam = url.searchParams.get("userId");

      if (userIdParam) {
        const idCheck = uuidField.safeParse(userIdParam);
        if (!idCheck.success) {
          return jsonResp(400, { error: "Invalid userId format" });
        }
        return await handleDeleteUser(idCheck.data);
      }

      const rawBody = await req.json().catch(() => null);
      const parsed = deleteBodySchema.safeParse(rawBody);

      if (!parsed.success) {
        return jsonResp(400, { error: parsed.error.issues[0]?.message || "Missing userId parameter" });
      }

      return await handleDeleteUser(parsed.data.userId);
    }

    return jsonResp(405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
