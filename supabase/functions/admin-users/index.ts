import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
};

const uuidField = z.string().uuid("Invalid ID format");

const postBodySchema = z.object({
  action: z.enum(["delete"]).optional(),
  userId: uuidField,
});

const getParamsSchema = z.object({
  page: z.string().regex(/^\d+$/, "Page must be a number").optional(),
  perPage: z.string().regex(/^\d+$/, "perPage must be a number").optional(),
});

const deleteBodySchema = z.object({
  userId: uuidField,
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

    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles").select("role").eq("user_id", user.id).single();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Forbidden - no role found" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerRole = roleData.role;
    const isCipher = callerRole === "cipher";
    const isAdmin = callerRole === "admin";

    if (!isCipher && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden - insufficient permissions" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jsonResp = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const handleDeleteUser = async (userId: string) => {
      if (userId === user.id) return jsonResp(400, { error: "Cannot delete yourself" });

      const { data: targetRole } = await adminClient
        .from("user_roles").select("role").eq("user_id", userId).single();
      const targetUserRole = targetRole?.role || "user";

      if (!isCipher && targetUserRole !== "moderator") {
        return jsonResp(403, { error: "Admins can only delete moderators" });
      }

      const { error: roleDeleteError } = await adminClient.from("user_roles").delete().eq("user_id", userId);
      if (roleDeleteError) console.warn("Failed to delete user_roles:", roleDeleteError);

      await adminClient.from("moderator_permissions").delete().eq("user_id", userId);
      await adminClient.from("registration_requests").delete().eq("user_id", userId);

      await new Promise(resolve => setTimeout(resolve, 500));

      try { await adminClient.auth.admin.signOut(userId, "global"); } catch (_e) {}

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) {
        return jsonResp(500, { error: "Failed to delete user", details: deleteError.message });
      }
      return jsonResp(200, { success: true });
    };

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
      if (authError) return jsonResp(500, { error: "Failed to fetch users" });

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
      return await handleDeleteUser(parsed.data.userId);
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
