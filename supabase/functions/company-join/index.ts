import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

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

    // Helper: check if user is admin of a company
    const isCompanyAdmin = async (companyId: string) => {
      const { data } = await adminClient
        .from("company_memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .eq("status", "active")
        .maybeSingle();
      return data?.role === "admin";
    };

    if (action === "create-company") {
      if (!isCipher) return json(403, { error: "Only super admins can create companies" });

      const { name, slug, description, joinPassword, currency } = body;
      if (!name || !slug) return json(400, { error: "Name and slug required" });

      // Hash the password before storing
      const hashedPassword = joinPassword ? await bcrypt.hash(joinPassword) : null;

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

      // Check if banned from this company
      const { data: banCheck } = await adminClient
        .from("company_join_requests")
        .select("banned_until")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .eq("status", "rejected")
        .order("reviewed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (banCheck?.banned_until && new Date(banCheck.banned_until) > new Date()) {
        const remaining = Math.ceil((new Date(banCheck.banned_until).getTime() - Date.now()) / (1000 * 60 * 60));
        return json(400, { error: `You are temporarily blocked from joining this company. Try again in ${remaining} hour(s).` });
      }

      // Verify password
      const { data: company } = await adminClient
        .from("companies")
        .select("join_password")
        .eq("id", companyId)
        .single();

      if (!company || !company.join_password) return json(400, { error: "Company does not accept password joins" });
      
      // Compare with bcrypt - support both hashed and legacy plaintext passwords
      let passwordValid = false;
      try {
        passwordValid = await bcrypt.compare(password, company.join_password);
      } catch {
        // Fallback: direct comparison for legacy plaintext passwords
        passwordValid = company.join_password === password;
      }
      if (!passwordValid) return json(400, { error: "Incorrect password" });

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

      if (!isCipher && !(await isCompanyAdmin(companyId))) return json(403, { error: "Not authorized" });

      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

      await adminClient
        .from("companies")
        .update({ invite_code: code })
        .eq("id", companyId);

      return json(200, { success: true, inviteCode: code });
    }

    if (action === "approve-join-request") {
      const { requestId, companyId, permissions } = body;
      if (!requestId || !companyId) return json(400, { error: "Request ID and company ID required" });

      if (!isCipher && !(await isCompanyAdmin(companyId))) return json(403, { error: "Not authorized" });

      // Get the join request
      const { data: joinReq, error: reqError } = await adminClient
        .from("company_join_requests")
        .select("*")
        .eq("id", requestId)
        .eq("company_id", companyId)
        .eq("status", "pending")
        .single();

      if (reqError || !joinReq) return json(400, { error: "Join request not found or already processed" });

      const perms = permissions || {};

      // Update request status
      const { error: updateError } = await adminClient
        .from("company_join_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", requestId);

      if (updateError) return json(500, { error: "Failed to update request" });

      // Create membership with permissions
      const { error: memberError } = await adminClient
        .from("company_memberships")
        .insert({
          user_id: joinReq.user_id,
          company_id: companyId,
          role: "moderator",
          status: "active",
          approved_by: user.id,
          can_add_revenue: perms.can_add_revenue ?? false,
          can_add_expense: perms.can_add_expense ?? false,
          can_add_expense_source: perms.can_add_expense_source ?? false,
          can_transfer: perms.can_transfer ?? false,
          can_view_reports: perms.can_view_reports ?? false,
          can_manage_students: perms.can_manage_students ?? false,
        });

      if (memberError) return json(500, { error: "Failed to create membership: " + memberError.message });

      return json(200, { success: true });
    }

    if (action === "reject-join-request") {
      const { requestId, companyId, reason } = body;
      if (!requestId || !companyId) return json(400, { error: "Request ID and company ID required" });

      if (!isCipher && !(await isCompanyAdmin(companyId))) return json(403, { error: "Not authorized" });

      // Get the join request
      const { data: joinReq, error: reqError } = await adminClient
        .from("company_join_requests")
        .select("*")
        .eq("id", requestId)
        .eq("company_id", companyId)
        .eq("status", "pending")
        .single();

      if (reqError || !joinReq) return json(400, { error: "Join request not found or already processed" });

      // Update with rejection + 1-day ban
      const bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: updateError } = await adminClient
        .from("company_join_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: reason || null,
          banned_until: bannedUntil,
        })
        .eq("id", requestId);

      if (updateError) return json(500, { error: "Failed to update request" });

      // Force logout the rejected user
      try {
        await adminClient.auth.admin.signOut(joinReq.user_id, "global");
      } catch (_e) { /* non-fatal */ }

      return json(200, { success: true });
    }

    if (action === "accept-rejected-join-request") {
      const { requestId, companyId, permissions } = body;
      if (!requestId || !companyId) return json(400, { error: "Request ID and company ID required" });

      if (!isCipher && !(await isCompanyAdmin(companyId))) return json(403, { error: "Not authorized" });

      const perms = permissions || {};

      // Update request: approved, clear ban
      const { error: updateError } = await adminClient
        .from("company_join_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          banned_until: null,
        })
        .eq("id", requestId)
        .eq("company_id", companyId)
        .eq("status", "rejected");

      if (updateError) return json(500, { error: "Failed to update request" });

      // Create membership
      const { error: memberError } = await adminClient
        .from("company_memberships")
        .insert({
          user_id: body.targetUserId,
          company_id: companyId,
          role: "moderator",
          status: "active",
          approved_by: user.id,
          can_add_revenue: perms.can_add_revenue ?? false,
          can_add_expense: perms.can_add_expense ?? false,
          can_add_expense_source: perms.can_add_expense_source ?? false,
          can_transfer: perms.can_transfer ?? false,
          can_view_reports: perms.can_view_reports ?? false,
          can_manage_students: perms.can_manage_students ?? false,
        });

      if (memberError) return json(500, { error: "Failed to create membership: " + memberError.message });

      return json(200, { success: true });
    }

    if (action === "cipher-join") {
      const { companyId } = body;
      if (!companyId) return json(400, { error: "Company ID required" });
      if (!isCipher) return json(403, { error: "Only super admins can use this action" });

      // Check if already a member
      const { data: existing } = await adminClient
        .from("company_memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (existing) return json(400, { error: "Already a member of this company" });

      // Auto-join as admin with all permissions
      const { error: memberError } = await adminClient
        .from("company_memberships")
        .insert({
          user_id: user.id,
          company_id: companyId,
          role: "admin",
          status: "active",
          can_add_revenue: true,
          can_add_expense: true,
          can_add_expense_source: true,
          can_transfer: true,
          can_view_reports: true,
          can_manage_students: true,
        });

      if (memberError) return json(500, { error: "Failed to join: " + memberError.message });

      // Set as active company
      await adminClient
        .from("user_profiles")
        .update({ active_company_id: companyId })
        .eq("user_id", user.id);

      return json(200, { success: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("Error:", err);
    return json(500, { error: "Internal server error" });
  }
});
