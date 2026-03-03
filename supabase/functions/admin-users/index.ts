import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
};


const uuidField = z.string().uuid("Invalid ID format");

const postBodySchema = z.object({
  action: z.enum(["delete"]).optional(),
  userId: uuidField,
  password: z.string().min(1).optional(),
  targetEmail: z.string().email().optional(),
});

const getParamsSchema = z.object({
  page: z.string().regex(/^\d+$/, "Page must be a number").optional(),
  perPage: z.string().regex(/^\d+$/, "perPage must be a number").optional(),
});

const deleteBodySchema = z.object({
  userId: uuidField,
});

const roleChangeSchema = z.object({
  userId: uuidField,
  newRole: z.enum(["cipher", "user"]),
  password: z.string().min(1, "Password is required").optional(),
});

Deno.serve(async (req) => {
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleData } = await adminClient
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();

    const callerRole = roleData?.role || "user";
    const isCipher = callerRole === "cipher";

    if (!isCipher) {
      return new Response(JSON.stringify({ error: "Forbidden - only cipher can access this" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jsonResp = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Helper: write audit log entry via service role (bypasses RLS)
    // action must be INSERT/UPDATE/DELETE to satisfy the check constraint
    // extra context is stored inside old_data/new_data JSON
    const writeAuditLog = async (logAction: string, recordId: string, oldData: unknown, newData: unknown) => {
      try {
        const { data: profile } = await adminClient
          .from("user_profiles")
          .select("active_company_id, email")
          .eq("user_id", user.id)
          .maybeSingle();

        // company_id FK must reference a real company; skip audit if none available
        const companyId = profile?.active_company_id;
        if (!companyId) {
          console.warn("Skipping audit log: no active company for caller", user.id);
          return;
        }

        // Map custom actions to valid DB action values; store details in new_data
        const dbAction = logAction.includes("DELETE") ? "DELETE" : logAction.includes("INSERT") ? "INSERT" : "UPDATE";

        await adminClient.from("audit_logs").insert({
          company_id: companyId,
          user_id: user.id,
          user_email: profile?.email || user.email || null,
          table_name: "user_roles",
          record_id: recordId,
          action: dbAction,
          old_data: oldData ? JSON.parse(JSON.stringify({ _context: logAction, ...oldData as Record<string, unknown> })) : null,
          new_data: newData ? JSON.parse(JSON.stringify({ _context: logAction, ...newData as Record<string, unknown> })) : null,
        });
      } catch (e) {
        console.warn("Audit log write failed (non-fatal):", e);
      }
    };

    const handleDeleteUser = async (userId: string, password?: string, targetEmail?: string) => {
      if (userId === user.id) return jsonResp(400, { error: "Cannot delete yourself" });

      const { data: targetRole } = await adminClient
        .from("user_roles").select("id, role").eq("user_id", userId).maybeSingle();
      const targetUserRole = targetRole?.role || "user";

      // Get target user's email for verification
      const { data: targetAuthData } = await adminClient.auth.admin.getUserById(userId);
      const targetActualEmail = targetAuthData?.user?.email;

      if (!isCipher && targetUserRole !== "moderator") {
        return jsonResp(403, { error: "Admins can only delete moderators" });
      }

      // Require target email match for ALL deletions
      if (!targetEmail || targetEmail !== targetActualEmail) {
        return jsonResp(400, { error: "Target email verification failed. You must provide the exact email of the user being deleted." });
      }

      // Require caller password re-authentication for ALL deletions
      if (!password) {
        return jsonResp(400, { error: "Password required to delete a user" });
      }

      const verifyClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error: authError } = await verifyClient.auth.signInWithPassword({
        email: user.email!,
        password,
      });
      if (authError) {
        return jsonResp(403, { error: "Password verification failed. Cannot proceed with deletion." });
      }

      // Write audit log BEFORE deletion (so we capture the data)
      await writeAuditLog(
        "USER_DELETE",
        targetRole?.id || userId,
        {
          deleted_user_id: userId,
          deleted_user_email: targetActualEmail,
          deleted_user_role: targetUserRole,
          deleted_by: user.id,
          deleted_by_email: user.email,
          is_cipher_deletion: targetUserRole === "cipher",
        },
        null
      );

      console.warn("[USER DELETE]", {
        callerId: user.id,
        callerEmail: user.email,
        targetId: userId,
        targetEmail: targetActualEmail,
        targetRole: targetUserRole,
        isCipherDeletion: targetUserRole === "cipher",
        timestamp: new Date().toISOString(),
      });

      const { error: roleDeleteError } = await adminClient.from("user_roles").delete().eq("user_id", userId);
      if (roleDeleteError) console.warn("Failed to delete user_roles:", roleDeleteError);

      await adminClient.from("moderator_permissions").delete().eq("user_id", userId);
      await adminClient.from("registration_requests").delete().eq("user_id", userId);
      await adminClient.from("company_memberships").delete().eq("user_id", userId);
      await adminClient.from("company_join_requests").delete().eq("user_id", userId);
      await adminClient.from("user_profiles").delete().eq("user_id", userId);

      await new Promise(resolve => setTimeout(resolve, 500));

      try { await adminClient.auth.admin.signOut(userId, "global"); } catch (_e) {}

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) {
        return jsonResp(500, { error: "Failed to delete user", details: deleteError.message });
      }
      return jsonResp(200, { success: true });
    };

    // Handle PATCH - Change role with granular Cipher validation
    if (req.method === "PATCH") {
      const rawBody = await req.json().catch(() => null);
      const parsed = roleChangeSchema.safeParse(rawBody);
      if (!parsed.success) return jsonResp(400, { error: parsed.error.issues[0]?.message || "Invalid input" });

      const { userId, newRole, password } = parsed.data;

      // Cannot change own role
      if (userId === user.id) {
        await writeAuditLog("ROLE_CHANGE_BLOCKED", userId, { reason: "self_change", attempted_role: newRole, caller: user.email }, null);
        return jsonResp(400, { error: "Cannot change your own role" });
      }

      // Get target's current role
      const { data: targetRoleData } = await adminClient
        .from("user_roles").select("id, role").eq("user_id", userId).maybeSingle();
      const currentRole = targetRoleData?.role || "user";

      // CIPHER DOWNGRADE LOCK: Prevent demoting a Cipher to any lower role
      if (currentRole === "cipher" && newRole !== "cipher") {
        await writeAuditLog(
          "ROLE_CHANGE_BLOCKED",
          targetRoleData?.id || userId,
          { user_id: userId, current_role: currentRole, attempted_role: newRole, reason: "cipher_downgrade_locked", caller_id: user.id, caller_email: user.email },
          null
        );
        console.warn("[ROLE CHANGE BLOCKED] Cipher downgrade attempted", {
          callerId: user.id, callerEmail: user.email, targetId: userId,
          fromRole: currentRole, attemptedRole: newRole, timestamp: new Date().toISOString(),
        });
        return jsonResp(403, { error: "Cipher role is locked. Downgrading a Cipher user is not permitted." });
      }

      // If promoting TO cipher, require password re-authentication
      if (newRole === "cipher") {
        if (!password) {
          await writeAuditLog("ROLE_CHANGE_BLOCKED", targetRoleData?.id || userId, { user_id: userId, current_role: currentRole, attempted_role: newRole, reason: "missing_password", caller_id: user.id, caller_email: user.email }, null);
          return jsonResp(400, { error: "Password required for Cipher role changes" });
        }

        const verifyClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { error: authError } = await verifyClient.auth.signInWithPassword({
          email: user.email!,
          password,
        });
        if (authError) {
          await writeAuditLog("ROLE_CHANGE_BLOCKED", targetRoleData?.id || userId, { user_id: userId, current_role: currentRole, attempted_role: newRole, reason: "password_failed", caller_id: user.id, caller_email: user.email }, null);
          return jsonResp(403, { error: "Password verification failed" });
        }
      }

      // No-op check
      if (currentRole === newRole) {
        return jsonResp(200, { success: true, message: "Role already set" });
      }

      // Perform the role change via service_role (bypasses RLS)
      if (targetRoleData) {
        const { error: delErr } = await adminClient.from("user_roles").delete().eq("user_id", userId);
        if (delErr) return jsonResp(500, { error: "Failed to remove old role", details: delErr.message });
      }

      const { data: newRoleData, error: insErr } = await adminClient
        .from("user_roles")
        .insert({ user_id: userId, role: newRole, assigned_by: user.id })
        .select("id, user_id, role")
        .single();
      if (insErr) return jsonResp(500, { error: "Failed to assign new role", details: insErr.message });

      await writeAuditLog(
        "ROLE_CHANGE",
        newRoleData.id,
        { user_id: userId, role: currentRole, changed_by: user.id, changed_by_email: user.email },
        { user_id: userId, role: newRole, changed_by: user.id, changed_by_email: user.email }
      );

      console.info("[ROLE CHANGE]", {
        callerId: user.id, callerEmail: user.email, targetId: userId,
        fromRole: currentRole, toRole: newRole, timestamp: new Date().toISOString(),
      });

      return jsonResp(200, { success: true, fromRole: currentRole, toRole: newRole });
    }

    // Handle GET - List users
    if (req.method === "GET") {
      const url = new URL(req.url);
      const paramsParsed = getParamsSchema.safeParse({
        page: url.searchParams.get("page") ?? undefined,
        perPage: url.searchParams.get("perPage") ?? undefined,
      });
      if (!paramsParsed.success) return jsonResp(400, { error: paramsParsed.error.issues[0]?.message });

      const page = parseInt(paramsParsed.data.page || "1", 10);
      const perPage = Math.min(parseInt(paramsParsed.data.perPage || "50", 10), 100);

      const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (authError) {
        console.error("listUsers error:", JSON.stringify(authError));
        return jsonResp(500, { error: "Failed to fetch users", details: authError.message });
      }

      const { data: roles } = await adminClient.from("user_roles").select("user_id, role, created_at");
      const userIds = authUsers.users.map((u) => u.id);
      const { data: profilesData } = await adminClient
        .from("user_profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);

      const profileMap = new Map(profilesData?.map((p) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []);
      const roleMap = new Map(roles?.map((r) => [r.user_id, { role: r.role, created_at: r.created_at }]) || []);

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
        .filter((u) => isCipher || u.role !== "cipher");

      return jsonResp(200, { users, pagination: { page, perPage, total: authUsers.total || users.length, hasMore: users.length === perPage } });
    }

    // Handle POST - Delete user
    if (req.method === "POST") {
      const rawBody = await req.json().catch(() => null);
      const parsed = postBodySchema.safeParse(rawBody);
      if (!parsed.success) return jsonResp(400, { error: parsed.error.issues[0]?.message || "Invalid input" });
      return await handleDeleteUser(parsed.data.userId, parsed.data.password, parsed.data.targetEmail);
    }

    // Handle DELETE
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const userIdParam = url.searchParams.get("userId");
      if (userIdParam) {
        const idCheck = uuidField.safeParse(userIdParam);
        if (!idCheck.success) return jsonResp(400, { error: "Invalid userId format" });
        return await handleDeleteUser(idCheck.data);
      }
      const rawBody = await req.json().catch(() => null);
      const parsed = deleteBodySchema.safeParse(rawBody);
      if (!parsed.success) return jsonResp(400, { error: parsed.error.issues[0]?.message || "Missing userId" });
      return await handleDeleteUser(parsed.data.userId);
    }

    return jsonResp(405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
