import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

// Use Web Crypto API instead of bcrypt (Worker not available in Edge Runtime)
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const data = new TextEncoder().encode(saltHex + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return saltHex + ':' + hashHex;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Handle salt:hash format
  if (stored.includes(':')) {
    const [saltHex, storedHash] = stored.split(':');
    const data = new TextEncoder().encode(saltHex + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === storedHash;
  }
  // Legacy plaintext: verify and return needs-rehash signal
  // Use constant-time-ish comparison to mitigate timing attacks
  if (stored.length !== password.length) return false;
  let mismatch = 0;
  for (let i = 0; i < stored.length; i++) {
    mismatch |= stored.charCodeAt(i) ^ password.charCodeAt(i);
  }
  return mismatch === 0;
}

// Returns true if the stored password is legacy plaintext (not hashed)
function isLegacyPassword(stored: string): boolean {
  return !stored.includes(':');
}

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

const uuidField = z.string().uuid("Invalid ID format");

const permissionsSchema = z.object({
  can_add_revenue: z.boolean().optional().default(false),
  can_add_expense: z.boolean().optional().default(false),
  can_add_expense_source: z.boolean().optional().default(false),
  can_transfer: z.boolean().optional().default(false),
  can_view_reports: z.boolean().optional().default(false),
  can_manage_students: z.boolean().optional().default(false),
}).optional();

const createCompanySchema = z.object({
  action: z.literal("create-company"),
  name: z.string().trim().min(1, "Name required").max(100, "Name too long"),
  slug: z.string().trim().min(1, "Slug required").max(50, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens only"),
  description: z.string().max(500, "Description too long").optional().nullable(),
  joinPassword: z.string().max(100, "Password too long").optional().nullable(),
  currency: z.string().max(10, "Currency code too long").optional(),
});

const joinWithPasswordSchema = z.object({
  action: z.literal("join-with-password"),
  companyId: uuidField,
  password: z.string().min(1, "Password required").max(100, "Password too long"),
  message: z.string().max(500, "Message too long").optional().nullable(),
});

const joinWithInviteSchema = z.object({
  action: z.literal("join-with-invite"),
  inviteCode: z.string().trim().min(1, "Invite code required").max(12, "Invite code too long"),
});

const generateInviteSchema = z.object({
  action: z.literal("generate-invite"),
  companyId: uuidField,
});

const roleEnum = z.enum(["moderator", "data_entry_operator", "viewer"]).default("moderator");

const deoPermissionsSchema = z.object({
  deo_students: z.boolean().optional().default(false),
  deo_payments: z.boolean().optional().default(false),
  deo_batches: z.boolean().optional().default(false),
  deo_finance: z.boolean().optional().default(false),
}).optional();

const approveJoinSchema = z.object({
  action: z.literal("approve-join-request"),
  requestId: uuidField,
  companyId: uuidField,
  role: roleEnum,
  permissions: z.any().optional(),
});

const rejectJoinSchema = z.object({
  action: z.literal("reject-join-request"),
  requestId: uuidField,
  companyId: uuidField,
  reason: z.string().max(500, "Reason too long").optional().nullable(),
});

const acceptRejectedSchema = z.object({
  action: z.literal("accept-rejected-join-request"),
  requestId: uuidField,
  companyId: uuidField,
  targetUserId: uuidField,
  role: roleEnum,
  permissions: z.any().optional(),
});

const cipherJoinSchema = z.object({
  action: z.literal("cipher-join"),
  companyId: uuidField,
});

const changePasswordSchema = z.object({
  action: z.literal("change-join-password"),
  companyId: uuidField,
  newPassword: z.string().min(1, "Password required").max(100, "Password too long"),
});

const approveCreationSchema = z.object({
  action: z.literal("approve-company-creation"),
  requestId: uuidField,
});

const rejectCreationSchema = z.object({
  action: z.literal("reject-company-creation"),
  requestId: uuidField,
  reason: z.string().max(500, "Reason too long").optional().nullable(),
});

const actionSchema = z.object({
  action: z.string().min(1, "Action required").max(50, "Action too long"),
}).passthrough();

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

    const rawBody = await req.json().catch(() => null);
    
    const baseCheck = actionSchema.safeParse(rawBody);
    if (!baseCheck.success) {
      return json(400, { error: baseCheck.error.issues[0]?.message || "Invalid input" });
    }

    const { action } = baseCheck.data;

    const { data: cipherCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "cipher")
      .maybeSingle();
    const isCipher = !!cipherCheck;

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

      const parsed = createCompanySchema.safeParse(rawBody);
      if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" });

      const { name, slug, description, joinPassword, currency } = parsed.data;
      const hashedPassword = joinPassword ? await hashPassword(joinPassword) : null;

      const { data: company, error: createError } = await adminClient
        .from("companies")
        .insert({
          name, slug,
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

      await adminClient.from("company_memberships").insert({
        user_id: user.id, company_id: company.id, role: "admin",
        can_add_revenue: true, can_add_expense: true, can_add_expense_source: true,
        can_transfer: true, can_view_reports: true, can_manage_students: true, status: "active",
      });

      return json(200, { success: true, company });
    }

    if (action === "join-with-password") {
      const parsed = joinWithPasswordSchema.safeParse(rawBody);
      if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" });

      const { companyId, password, message } = parsed.data;

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

      const { data: company } = await adminClient
        .from("companies")
        .select("join_password")
        .eq("id", companyId)
        .single();

      if (!company) {
        return json(400, { error: "Company not found" });
      }
      if (!company.join_password) {
        return json(400, { error: "This business has not set a join password yet. Please contact the business admin to set one, or use an invite code instead." });
      }
      
      console.log("Password verification attempt", { companyId, storedFormat: company.join_password.includes(':') ? 'hashed' : 'plaintext', inputLength: password.length });
      
      let passwordValid = false;
      try { passwordValid = await verifyPassword(password, company.join_password); }
      catch (e) { console.log("Password verification error", e); passwordValid = false; }
      console.log("Password verification result", { passwordValid });
      if (!passwordValid) return json(400, { error: "Incorrect password" });

      // Auto-rehash legacy plaintext passwords to secure format
      if (isLegacyPassword(company.join_password)) {
        const rehashed = await hashPassword(password);
        await adminClient.from("companies").update({ join_password: rehashed }).eq("id", companyId);
      }

      const { data: existing } = await adminClient
        .from("company_memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .maybeSingle();
      if (existing) return json(400, { error: "Already a member" });

      const { data: existingReq } = await adminClient
        .from("company_join_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .eq("status", "pending")
        .maybeSingle();
      if (existingReq) return json(400, { error: "Join request already pending" });

      await adminClient.from("company_join_requests").insert({
        user_id: user.id, company_id: companyId, message: message || null,
      });

      return json(200, { success: true });
    }

    if (action === "join-with-invite") {
      const parsed = joinWithInviteSchema.safeParse(rawBody);
      if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" });

      const { inviteCode } = parsed.data;
      const { data: company } = await adminClient
        .from("companies").select("id").eq("invite_code", inviteCode.toUpperCase()).maybeSingle();
      if (!company) return json(400, { error: "Invalid invite code" });

      const { data: existing } = await adminClient
        .from("company_memberships").select("id").eq("user_id", user.id).eq("company_id", company.id).maybeSingle();
      if (existing) return json(400, { error: "Already a member" });

      await adminClient.from("company_memberships").insert({
        user_id: user.id, company_id: company.id, role: "viewer", status: "active",
      });
      await adminClient.from("user_profiles").update({ active_company_id: company.id }).eq("user_id", user.id);
      return json(200, { success: true });
    }

    if (action === "generate-invite") {
      const parsed = generateInviteSchema.safeParse(rawBody);
      if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" });
      const { companyId } = parsed.data;
      if (!isCipher && !(await isCompanyAdmin(companyId))) return json(403, { error: "Not authorized" });

      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
      await adminClient.from("companies").update({ invite_code: code }).eq("id", companyId);
      return json(200, { success: true, inviteCode: code });
    }

    if (action === "approve-join-request") {
      const parsed = approveJoinSchema.safeParse(rawBody);
      if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" });
      const { requestId, companyId, role, permissions: perms } = parsed.data;

      if (!isCipher && !(await isCompanyAdmin(companyId))) return json(403, { error: "Not authorized" });

      const { data: joinReq, error: reqError } = await adminClient
        .from("company_join_requests").select("*")
        .eq("id", requestId).eq("company_id", companyId).eq("status", "pending").single();
      if (reqError || !joinReq) return json(400, { error: "Join request not found or already processed" });

      const p = perms || {};
      await adminClient.from("company_join_requests").update({
        status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user.id,
      }).eq("id", requestId);

      const memberData: Record<string, unknown> = {
        user_id: joinReq.user_id, company_id: companyId, role, status: "active",
        approved_by: user.id,
      };

      if (role === "moderator") {
        memberData.can_add_revenue = p.can_add_revenue ?? false;
        memberData.can_add_expense = p.can_add_expense ?? false;
        memberData.can_add_expense_source = p.can_add_expense_source ?? false;
        memberData.can_transfer = p.can_transfer ?? false;
        memberData.can_view_reports = p.can_view_reports ?? false;
        memberData.can_manage_students = p.can_manage_students ?? false;
      } else if (role === "data_entry_operator") {
        memberData.deo_students = p.deo_students ?? false;
        memberData.deo_payments = p.deo_payments ?? false;
        memberData.deo_batches = p.deo_batches ?? false;
        memberData.deo_finance = p.deo_finance ?? false;
      }
      // viewer: all defaults to false, no extra fields needed

      const { error: memberError } = await adminClient.from("company_memberships").insert(memberData);
      if (memberError) return json(500, { error: "Failed to create membership: " + memberError.message });
      return json(200, { success: true });
    }

    if (action === "reject-join-request") {
      const parsed = rejectJoinSchema.safeParse(rawBody);
      if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" });
      const { requestId, companyId, reason } = parsed.data;

      if (!isCipher && !(await isCompanyAdmin(companyId))) return json(403, { error: "Not authorized" });

      const { data: joinReq, error: reqError } = await adminClient
        .from("company_join_requests").select("*")
        .eq("id", requestId).eq("company_id", companyId).eq("status", "pending").single();
      if (reqError || !joinReq) return json(400, { error: "Join request not found or already processed" });

      const bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await adminClient.from("company_join_requests").update({
        status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: user.id,
        rejection_reason: reason || null, banned_until: bannedUntil,
      }).eq("id", requestId);

      try { await adminClient.auth.admin.signOut(joinReq.user_id, "global"); } catch (_e) {}
      return json(200, { success: true });
    }

    if (action === "accept-rejected-join-request") {
      const parsed = acceptRejectedSchema.safeParse(rawBody);
      if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" });
      const { requestId, companyId, targetUserId, role, permissions: perms } = parsed.data;

      if (!isCipher && !(await isCompanyAdmin(companyId))) return json(403, { error: "Not authorized" });
      const p = perms || {};

      await adminClient.from("company_join_requests").update({
        status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user.id, banned_until: null,
      }).eq("id", requestId).eq("company_id", companyId).eq("status", "rejected");

      const memberData: Record<string, unknown> = {
        user_id: targetUserId, company_id: companyId, role, status: "active",
        approved_by: user.id,
      };

      if (role === "moderator") {
        memberData.can_add_revenue = p.can_add_revenue ?? false;
        memberData.can_add_expense = p.can_add_expense ?? false;
        memberData.can_add_expense_source = p.can_add_expense_source ?? false;
        memberData.can_transfer = p.can_transfer ?? false;
        memberData.can_view_reports = p.can_view_reports ?? false;
        memberData.can_manage_students = p.can_manage_students ?? false;
      } else if (role === "data_entry_operator") {
        memberData.deo_students = p.deo_students ?? false;
        memberData.deo_payments = p.deo_payments ?? false;
        memberData.deo_batches = p.deo_batches ?? false;
        memberData.deo_finance = p.deo_finance ?? false;
      }

      const { error: memberError } = await adminClient.from("company_memberships").insert(memberData);
      if (memberError) return json(500, { error: "Failed to create membership: " + memberError.message });
      return json(200, { success: true });
    }

    if (action === "cipher-join") {
      const parsed = cipherJoinSchema.safeParse(rawBody);
      if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" });
      const { companyId } = parsed.data;
      if (!isCipher) return json(403, { error: "Only super admins can use this action" });

      const { data: existing } = await adminClient
        .from("company_memberships").select("id").eq("user_id", user.id).eq("company_id", companyId).maybeSingle();
      if (existing) return json(400, { error: "Already a member of this company" });

      await adminClient.from("company_memberships").insert({
        user_id: user.id, company_id: companyId, role: "admin", status: "active",
        can_add_revenue: true, can_add_expense: true, can_add_expense_source: true,
        can_transfer: true, can_view_reports: true, can_manage_students: true,
      });
      await adminClient.from("user_profiles").update({ active_company_id: companyId }).eq("user_id", user.id);
      return json(200, { success: true });
    }

    if (action === "change-join-password") {
      const parsed = changePasswordSchema.safeParse(rawBody);
      if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" });
      const { companyId, newPassword } = parsed.data;
      if (!isCipher && !(await isCompanyAdmin(companyId))) return json(403, { error: "Not authorized" });
      const hashedPassword = await hashPassword(newPassword);
      const { error: updateError } = await adminClient.from("companies").update({ join_password: hashedPassword }).eq("id", companyId);
      if (updateError) return json(500, { error: "Failed to update password" });
      return json(200, { success: true });
    }

    // --- Company Creation Request actions ---

    if (action === "approve-company-creation") {
      const parsed = approveCreationSchema.safeParse(rawBody);
      if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" });
      if (!isCipher) return json(403, { error: "Only Cipher can approve company creation requests" });

      const { requestId } = parsed.data;
      const { data: request, error: reqErr } = await adminClient
        .from("company_creation_requests").select("*")
        .eq("id", requestId).eq("status", "pending").single();
      if (reqErr || !request) return json(400, { error: "Request not found or already processed" });

      // Check slug uniqueness
      const { data: existingSlug } = await adminClient
        .from("companies").select("id").eq("slug", request.company_slug).maybeSingle();
      if (existingSlug) return json(400, { error: "Company slug already exists. Ask the user to modify their request." });

      // Create the company
      const { data: company, error: createErr } = await adminClient
        .from("companies")
        .insert({
          name: request.company_name,
          slug: request.company_slug,
          description: request.description || null,
          logo_url: request.logo_url || null,
          created_by: request.user_id,
        })
        .select()
        .single();
      if (createErr) return json(500, { error: "Failed to create company: " + createErr.message });

      // Assign requesting user as admin
      await adminClient.from("company_memberships").insert({
        user_id: request.user_id, company_id: company.id, role: "admin", status: "active",
        can_add_revenue: true, can_add_expense: true, can_add_expense_source: true,
        can_transfer: true, can_view_reports: true, can_manage_students: true,
      });

      // Update request status
      await adminClient.from("company_creation_requests").update({
        status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString(),
      }).eq("id", requestId);

      return json(200, { success: true, company });
    }

    if (action === "reject-company-creation") {
      const parsed = rejectCreationSchema.safeParse(rawBody);
      if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" });
      if (!isCipher) return json(403, { error: "Only Cipher can reject company creation requests" });

      const { requestId, reason } = parsed.data;
      const { error: updateErr } = await adminClient
        .from("company_creation_requests").update({
          status: "rejected", rejection_reason: reason || null,
          reviewed_by: user.id, reviewed_at: new Date().toISOString(),
        }).eq("id", requestId).eq("status", "pending");
      if (updateErr) return json(500, { error: "Failed to reject request" });
      return json(200, { success: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("Error:", err);
    return json(500, { error: "Internal server error" });
  }
});
