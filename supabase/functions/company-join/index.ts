import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json(401, { error: "Unauthorized" });

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action } = body;

    // Check if user is cipher
    const { data: cipherCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "cipher")
      .maybeSingle();
    const isCipher = !!cipherCheck;

    if (action === "create-company") {
      if (!isCipher) return json(403, { error: "Only super admins can create companies" });

      const { name, slug, description, joinPassword, currency } = body;
      if (!name || !slug) return json(400, { error: "Name and slug required" });

      // Hash password if provided (simple hash for now - bcrypt not available in Deno by default)
      const hashedPassword = joinPassword ? joinPassword : null;

      const { data: company, error: createError } = await adminClient
        .from("companies")
        .insert({
          name,
          slug,
          description: description || null,
          join_password: hashedPassword,
          currency: currency || "BDT",
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) {
        if (createError.code === "23505") return json(400, { error: "Company slug already exists" });
        return json(500, { error: createError.message });
      }

      // Add creator as admin
      await adminClient
        .from("company_memberships")
        .insert({
          user_id: user.id,
          company_id: company.id,
          role: "admin",
          can_add_revenue: true,
          can_add_expense: true,
          can_add_expense_source: true,
          can_transfer: true,
          can_view_reports: true,
          can_manage_students: true,
          status: "active",
        });

      return json(200, { success: true, company });
    }

    if (action === "join-with-password") {
      const { companyId, password, message } = body;
      if (!companyId || !password) return json(400, { error: "Company ID and password required" });

      // Verify password
      const { data: company } = await adminClient
        .from("companies")
        .select("join_password")
        .eq("id", companyId)
        .single();

      if (!company || !company.join_password) return json(400, { error: "Company does not accept password joins" });
      if (company.join_password !== password) return json(400, { error: "Incorrect password" });

      // Check if already a member
      const { data: existing } = await adminClient
        .from("company_memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (existing) return json(400, { error: "Already a member" });

      // Check for existing pending request
      const { data: existingReq } = await adminClient
        .from("company_join_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingReq) return json(400, { error: "Join request already pending" });

      // Create join request
      await adminClient
        .from("company_join_requests")
        .insert({
          user_id: user.id,
          company_id: companyId,
          message: message || null,
        });

      return json(200, { success: true });
    }

    if (action === "join-with-invite") {
      const { inviteCode } = body;
      if (!inviteCode) return json(400, { error: "Invite code required" });

      // Find company with this invite code
      const { data: company } = await adminClient
        .from("companies")
        .select("id")
        .eq("invite_code", inviteCode.toUpperCase())
        .maybeSingle();

      if (!company) return json(400, { error: "Invalid invite code" });

      // Check if already a member
      const { data: existing } = await adminClient
        .from("company_memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", company.id)
        .maybeSingle();

      if (existing) return json(400, { error: "Already a member" });

      // Auto-join as viewer
      await adminClient
        .from("company_memberships")
        .insert({
          user_id: user.id,
          company_id: company.id,
          role: "viewer",
          status: "active",
        });

      // Set as active company
      await adminClient
        .from("user_profiles")
        .update({ active_company_id: company.id })
        .eq("user_id", user.id);

      return json(200, { success: true });
    }

    if (action === "generate-invite") {
      const { companyId } = body;
      if (!companyId) return json(400, { error: "Company ID required" });

      // Check if user is admin of this company
      const { data: membership } = await adminClient
        .from("company_memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .eq("status", "active")
        .maybeSingle();

      if (!isCipher && membership?.role !== "admin") return json(403, { error: "Not authorized" });

      // Generate random invite code
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

      await adminClient
        .from("companies")
        .update({ invite_code: code })
        .eq("id", companyId);

      return json(200, { success: true, inviteCode: code });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("Error:", err);
    return json(500, { error: "Internal server error" });
  }
});
