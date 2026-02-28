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

const mergeSchema = z.object({
  primary_student_id: z.string().uuid("Invalid primary student ID"),
  duplicate_student_id: z.string().uuid("Invalid duplicate student ID"),
  company_id: z.string().uuid("Invalid company ID"),
});

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" }, cors);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) return json(401, { error: "Unauthorized" }, cors);

    const rawBody = await req.json().catch(() => null);
    const parsed = mergeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" }, cors);
    }

    const { primary_student_id, duplicate_student_id } = parsed.data;

    const db = createClient(supabaseUrl, serviceRoleKey);

    // Derive company_id from user's active_company_id instead of trusting request body
    const { data: profile } = await db
      .from("user_profiles")
      .select("active_company_id")
      .eq("user_id", user.id)
      .single();

    const company_id = profile?.active_company_id;
    if (!company_id) {
      return json(400, { error: "No active company selected" }, cors);
    }

    // Verify caller is admin or cipher
    const { data: isAdmin } = await db.rpc("is_company_admin", {
      _user_id: user.id,
      _company_id: company_id,
    });
    const { data: isCipher } = await db.rpc("is_cipher", {
      _user_id: user.id,
    });

    if (!isAdmin && !isCipher) return json(403, { error: "Forbidden" }, cors);

    // Fetch both students — scoped to company
    const { data: primary } = await db
      .from("students")
      .select("*")
      .eq("id", primary_student_id)
      .eq("company_id", company_id)
      .single();

    const { data: duplicate } = await db
      .from("students")
      .select("*")
      .eq("id", duplicate_student_id)
      .eq("company_id", company_id)
      .single();

    if (!primary || !duplicate) {
      return json(404, { error: "Student(s) not found in this company" }, cors);
    }

    // Collect IDs — scoped to company
    const { data: paymentIds } = await db
      .from("student_payments")
      .select("id")
      .eq("student_id", duplicate_student_id)
      .eq("company_id", company_id);

    const { data: batchHistoryIds } = await db
      .from("student_batch_history")
      .select("id")
      .eq("student_id", duplicate_student_id)
      .eq("company_id", company_id);

    const { data: feeHistoryIds } = await db
      .from("monthly_fee_history")
      .select("id")
      .eq("student_id", duplicate_student_id)
      .eq("company_id", company_id);

    const { data: siblingIds } = await db
      .from("student_siblings")
      .select("id")
      .eq("student_id", duplicate_student_id)
      .eq("company_id", company_id);

    // Transfer records
    await db.from("student_payments").update({ student_id: primary_student_id }).eq("student_id", duplicate_student_id).eq("company_id", company_id);
    await db.from("student_batch_history").update({ student_id: primary_student_id }).eq("student_id", duplicate_student_id).eq("company_id", company_id);
    await db.from("monthly_fee_history").update({ student_id: primary_student_id }).eq("student_id", duplicate_student_id).eq("company_id", company_id);
    await db.from("student_siblings").update({ student_id: primary_student_id }).eq("student_id", duplicate_student_id).eq("company_id", company_id);

    // Fill empty fields on primary from duplicate
    const fillableFields = [
      "email", "phone", "aadhar_id_number", "whatsapp_number", "alt_contact_number",
      "date_of_birth", "gender", "blood_group", "religion_category", "nationality",
      "address_house", "address_street", "address_area", "address_city",
      "address_state", "address_pin_zip", "father_name", "father_occupation",
      "father_contact", "mother_name", "mother_occupation", "mother_contact",
      "guardian_name", "guardian_contact", "guardian_relationship",
      "emergency_contact_name", "emergency_contact_number",
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const field of fillableFields) {
      if (!primary[field] && duplicate[field]) {
        updates[field] = duplicate[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.from("students").update(updates).eq("id", primary_student_id).eq("company_id", company_id);
    }

    // Soft-delete duplicate
    await db.from("students").update({
      status: "inactive",
      notes: `Merged into ${primary.name} (${primary_student_id})${duplicate.notes ? ". Previous notes: " + duplicate.notes : ""}`,
    }).eq("id", duplicate_student_id).eq("company_id", company_id);

    // Audit log
    const { data: userProfile } = await db.from("user_profiles").select("email").eq("user_id", user.id).single();

    await db.from("audit_logs").insert({
      company_id,
      user_id: user.id,
      user_email: userProfile?.email ?? null,
      table_name: "students",
      record_id: primary_student_id,
      action: "MERGE",
      old_data: { duplicate_student: duplicate },
      new_data: { primary_student: primary, fields_filled: updates },
    });

    const undoData = {
      primary_student_id,
      duplicate_student_id,
      company_id,
      duplicate_original: { status: duplicate.status, notes: duplicate.notes },
      fields_filled_on_primary: Object.keys(updates),
      transferred_payment_ids: (paymentIds || []).map((r: any) => r.id),
      transferred_batch_history_ids: (batchHistoryIds || []).map((r: any) => r.id),
      transferred_fee_history_ids: (feeHistoryIds || []).map((r: any) => r.id),
      transferred_sibling_ids: (siblingIds || []).map((r: any) => r.id),
    };

    return json(200, { success: true, primary_student_id, undo_data: undoData }, cors);
  } catch (err) {
    const cors = getCorsHeaders(req);
    return json(500, { error: err instanceof Error ? err.message : "Internal error" }, cors);
  }
});
