import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const resetSchema = z.object({
  companyId: z.string().uuid("Invalid company ID"),
  password: z.string().min(1, "Password required").max(200, "Password too long"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing authorization" });

    // Verify user identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json(401, { error: "Unauthorized" });

    const rawBody = await req.json().catch(() => null);
    const parsed = resetSchema.safeParse(rawBody);
    if (!parsed.success) {
      return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" });
    }

    const { companyId, password } = parsed.data;

    // Re-authenticate with password server-side
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify password by attempting sign-in
    const tempClient = createClient(supabaseUrl, supabaseAnonKey);
    const { error: authError } = await tempClient.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (authError) {
      return json(403, { error: "Incorrect password" });
    }

    // Verify user is admin of this company or cipher
    const { data: membership } = await adminClient
      .from("company_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .eq("status", "active")
      .maybeSingle();

    const { data: cipherCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "cipher")
      .maybeSingle();

    const isCipher = !!cipherCheck;
    const isAdmin = membership?.role === "admin";

    if (!isCipher && !isAdmin) {
      return json(403, { error: "Only company admins can reset data" });
    }

    // Delete data scoped to company (order matters for FK constraints)
    const tables = [
      "allocations",
      "khata_transfers",
      "expenses",
      "revenues",
      "expense_accounts",
      "revenue_sources",
      "student_payments",
      "monthly_fee_history",
      "students",
      "batches",
    ];

    for (const table of tables) {
      const { error } = await adminClient
        .from(table)
        .delete()
        .eq("company_id", companyId);

      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        return json(500, { error: `Failed to delete ${table}` });
      }
    }

    return json(200, { success: true });
  } catch (err) {
    console.error("Error:", err);
    return json(500, { error: "Internal error" });
  }
});
