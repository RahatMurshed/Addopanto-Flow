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

const unmergeSchema = z.object({
  primary_student_id: z.string().uuid(),
  duplicate_student_id: z.string().uuid(),
  company_id: z.string().uuid(),
  duplicate_original: z.object({
    status: z.string().optional(),
    notes: z.string().nullable().optional(),
  }).optional(),
  fields_filled_on_primary: z.array(z.string()).optional(),
  transferred_payment_ids: z.array(z.string().uuid()).optional(),
  transferred_batch_history_ids: z.array(z.string().uuid()).optional(),
  transferred_fee_history_ids: z.array(z.string().uuid()).optional(),
  transferred_sibling_ids: z.array(z.string().uuid()).optional(),
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
    const parsed = unmergeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return json(400, { error: parsed.error.issues[0]?.message || "Invalid input" }, cors);
    }

    const undoData = parsed.data;
    const {
      primary_student_id,
      duplicate_student_id,
      duplicate_original,
      fields_filled_on_primary,
      transferred_payment_ids,
      transferred_batch_history_ids,
      transferred_fee_history_ids,
      transferred_sibling_ids,
    } = undoData;

    const db = createClient(supabaseUrl, serviceRoleKey);

    // Derive company_id from user's active_company_id
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
    const { data: isCipher } = await db.rpc("is_cipher", { _user_id: user.id });

    if (!isAdmin && !isCipher) return json(403, { error: "Forbidden" }, cors);

    // Verify both students belong to this company
    const { data: primaryCheck } = await db.from("students").select("id").eq("id", primary_student_id).eq("company_id", company_id).single();
    const { data: duplicateCheck } = await db.from("students").select("id").eq("id", duplicate_student_id).eq("company_id", company_id).single();

    if (!primaryCheck || !duplicateCheck) {
      return json(404, { error: "Student(s) not found in this company" }, cors);
    }

    // 1. Restore duplicate student status & notes
    await db.from("students").update({
      status: duplicate_original?.status || "active",
      notes: duplicate_original?.notes || null,
    }).eq("id", duplicate_student_id).eq("company_id", company_id);

    // 2. Move transferred payments back — FILTER BY company_id to prevent cross-tenant tampering
    if (transferred_payment_ids && transferred_payment_ids.length > 0) {
      await db.from("student_payments")
        .update({ student_id: duplicate_student_id })
        .in("id", transferred_payment_ids)
        .eq("company_id", company_id);
    }

    // 3. Move transferred batch history back — FILTER BY company_id
    if (transferred_batch_history_ids && transferred_batch_history_ids.length > 0) {
      await db.from("student_batch_history")
        .update({ student_id: duplicate_student_id })
        .in("id", transferred_batch_history_ids)
        .eq("company_id", company_id);
    }

    // 4. Move transferred fee history back — FILTER BY company_id
    if (transferred_fee_history_ids && transferred_fee_history_ids.length > 0) {
      await db.from("monthly_fee_history")
        .update({ student_id: duplicate_student_id })
        .in("id", transferred_fee_history_ids)
        .eq("company_id", company_id);
    }

    // 5. Move transferred siblings back — FILTER BY company_id
    if (transferred_sibling_ids && transferred_sibling_ids.length > 0) {
      await db.from("student_siblings")
        .update({ student_id: duplicate_student_id })
        .in("id", transferred_sibling_ids)
        .eq("company_id", company_id);
    }

    // 6. Null out fields that were filled on primary from duplicate
    if (fields_filled_on_primary && fields_filled_on_primary.length > 0) {
      const nullUpdates: Record<string, null> = {};
      for (const field of fields_filled_on_primary) {
        nullUpdates[field] = null;
      }
      await db.from("students").update(nullUpdates).eq("id", primary_student_id).eq("company_id", company_id);
    }

    // 7. Audit log
    const { data: userProfile } = await db.from("user_profiles").select("email").eq("user_id", user.id).single();

    await db.from("audit_logs").insert({
      company_id,
      user_id: user.id,
      user_email: userProfile?.email ?? null,
      table_name: "students",
      record_id: primary_student_id,
      action: "UNMERGE",
      old_data: { undo_data: undoData },
      new_data: { restored_duplicate_id: duplicate_student_id },
    });

    return json(200, { success: true }, cors);
  } catch (err) {
    const cors = getCorsHeaders(req);
    return json(500, { error: err instanceof Error ? err.message : "Internal error" }, cors);
  }
});
