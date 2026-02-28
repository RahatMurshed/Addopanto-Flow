import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

function isAllowedOrigin(origin: string): boolean {
  if (origin === "https://addopantoflow.lovable.app") return true;
  if (origin === "https://58aee540-d716-4564-805b-e26d9615ae54.lovableproject.com") return true;
  if (/^https:\/\/[a-z0-9-]+--58aee540-d716-4564-805b-e26d9615ae54\.lovable\.app$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : "https://addopantoflow.lovable.app",
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

    // Delete data scoped to company (FK-safe order: children before parents)
    const tables = [
      // Tags & notes (leaf tables)
      "student_tag_assignments",
      "student_tags",
      "student_sales_notes",
      "sales_note_categories",
      "duplicate_dismissals",
      // Products
      "product_sales",
      "product_stock_movements",
      "products",
      "product_categories",
      // Stakeholders (investments/loans)
      "profit_distributions",
      "loan_repayments",
      "loans",
      "investments",
      "stakeholders",
      // Employees
      "employee_attendance",
      "employee_leaves",
      "employee_salary_payments",
      "employees",
      // Suppliers
      "suppliers",
      // Finance
      "allocations",
      "khata_transfers",
      "expenses",
      // Enrollments & payments (BEFORE revenue_sources to avoid v_batch trigger)
      "batch_enrollments",
      "student_payments",
      "monthly_fee_history",
      "student_siblings",
      "student_batch_history",
      // Revenue (after student_payments)
      "revenues",
      "revenue_sources",
      "expense_accounts",
      // Core entities
      "students",
      "batches",
      "courses",
      // System/logs
      "moderator_permissions",
      "registration_requests",
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
