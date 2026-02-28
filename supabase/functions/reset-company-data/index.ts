import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const ALLOWED_ORIGINS = [
  "https://addopantoflow.lovable.app",
  "https://id-preview--58aee540-d716-4564-805b-e26d9615ae54.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const json = (status: number, body: unknown, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

const resetSchema = z.object({
  companyId: z.string().uuid("Invalid company ID"),
  password: z.string().min(1, "Password required").max(200, "Password too long"),
});

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing authorization" }, cors);

    // Verify user identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json(401, { error: "Unauthorized" }, cors);

    const rawBody = await req.json().catch(() => null);
    const parsed = resetSchema.safeParse(rawBody);
    if (!parsed.success) {
      return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" }, cors);
    }

    const { password } = parsed.data;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify password by attempting sign-in with a separate client
    const tempClient = createClient(supabaseUrl, supabaseAnonKey);
    const { error: authError } = await tempClient.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (authError) {
      return json(403, { error: "Incorrect password" }, cors);
    }

    // CIPHER-ONLY: Only cipher users can reset data
    const { data: cipherCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "cipher")
      .maybeSingle();

    if (!cipherCheck) {
      return json(403, { error: "Only platform administrators can reset company data" }, cors);
    }

    // Derive company_id from user's active company — cipher can access any company
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("active_company_id")
      .eq("user_id", user.id)
      .single();

    const companyId = profile?.active_company_id;
    if (!companyId) {
      return json(400, { error: "No active company selected" }, cors);
    }

    // Delete data scoped to company (order matters for FK constraints)
    const tables = [
      "allocations",
      "khata_transfers",
      "expenses",
      "revenues",
      "expense_accounts",
      "revenue_sources",
      "student_siblings",
      "student_batch_history",
      "student_payments",
      "monthly_fee_history",
      "students",
      "batches",
      "courses",
      "audit_logs",
      "currency_change_logs",
      "dashboard_access_logs",
      "company_join_requests",
    ];

    for (const table of tables) {
      const { error } = await adminClient
        .from(table)
        .delete()
        .eq("company_id", companyId);

      if (error) {
        console.error(`Error deleting from ${table}:`, error);
      }
    }

    // Remove non-admin memberships (keep admin)
    const { error: membershipError } = await adminClient
      .from("company_memberships")
      .delete()
      .eq("company_id", companyId)
      .neq("role", "admin");

    if (membershipError) {
      console.error("Error cleaning memberships:", membershipError);
    }

    return json(200, { success: true }, cors);
  } catch (err) {
    const cors = getCorsHeaders(req);
    console.error("Error:", err);
    return json(500, { error: "Internal error" }, cors);
  }
});
