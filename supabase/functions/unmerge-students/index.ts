import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const undoData = await req.json();
    const {
      primary_student_id,
      duplicate_student_id,
      company_id,
      duplicate_original,
      fields_filled_on_primary,
      transferred_payment_ids,
      transferred_batch_history_ids,
      transferred_fee_history_ids,
      transferred_sibling_ids,
    } = undoData;

    if (!primary_student_id || !duplicate_student_id || !company_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin or cipher
    const { data: isAdmin } = await db.rpc("is_company_admin", {
      _user_id: user.id,
      _company_id: company_id,
    });
    const { data: isCipher } = await db.rpc("is_cipher", {
      _user_id: user.id,
    });

    if (!isAdmin && !isCipher) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Restore duplicate student status & notes
    await db
      .from("students")
      .update({
        status: duplicate_original?.status || "active",
        notes: duplicate_original?.notes || null,
      })
      .eq("id", duplicate_student_id)
      .eq("company_id", company_id);

    // 2. Move transferred payments back
    if (transferred_payment_ids?.length > 0) {
      await db
        .from("student_payments")
        .update({ student_id: duplicate_student_id })
        .in("id", transferred_payment_ids);
    }

    // 3. Move transferred batch history back
    if (transferred_batch_history_ids?.length > 0) {
      await db
        .from("student_batch_history")
        .update({ student_id: duplicate_student_id })
        .in("id", transferred_batch_history_ids);
    }

    // 4. Move transferred fee history back
    if (transferred_fee_history_ids?.length > 0) {
      await db
        .from("monthly_fee_history")
        .update({ student_id: duplicate_student_id })
        .in("id", transferred_fee_history_ids);
    }

    // 5. Move transferred siblings back
    if (transferred_sibling_ids?.length > 0) {
      await db
        .from("student_siblings")
        .update({ student_id: duplicate_student_id })
        .in("id", transferred_sibling_ids);
    }

    // 6. Null out fields that were filled on primary from duplicate
    if (fields_filled_on_primary?.length > 0) {
      const nullUpdates: Record<string, null> = {};
      for (const field of fields_filled_on_primary) {
        nullUpdates[field] = null;
      }
      await db
        .from("students")
        .update(nullUpdates)
        .eq("id", primary_student_id)
        .eq("company_id", company_id);
    }

    // 7. Audit log
    const { data: userProfile } = await db
      .from("user_profiles")
      .select("email")
      .eq("user_id", user.id)
      .single();

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

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
