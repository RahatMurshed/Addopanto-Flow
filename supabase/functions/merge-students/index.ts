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

    // Verify caller identity with anon client
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

    const { primary_student_id, duplicate_student_id, company_id } = await req.json();

    if (!primary_student_id || !duplicate_student_id || !company_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for DB operations
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

    // Fetch both students
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
      return new Response(JSON.stringify({ error: "Student(s) not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transfer student_payments
    await db
      .from("student_payments")
      .update({ student_id: primary_student_id })
      .eq("student_id", duplicate_student_id);

    // Transfer student_batch_history
    await db
      .from("student_batch_history")
      .update({ student_id: primary_student_id })
      .eq("student_id", duplicate_student_id);

    // Transfer monthly_fee_history
    await db
      .from("monthly_fee_history")
      .update({ student_id: primary_student_id })
      .eq("student_id", duplicate_student_id);

    // Transfer student_siblings
    await db
      .from("student_siblings")
      .update({ student_id: primary_student_id })
      .eq("student_id", duplicate_student_id);

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
      await db
        .from("students")
        .update(updates)
        .eq("id", primary_student_id);
    }

    // Soft-delete duplicate
    await db
      .from("students")
      .update({
        status: "inactive",
        notes: `Merged into ${primary.name} (${primary_student_id})${duplicate.notes ? ". Previous notes: " + duplicate.notes : ""}`,
      })
      .eq("id", duplicate_student_id);

    // Log to audit
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
      action: "MERGE",
      old_data: { duplicate_student: duplicate },
      new_data: { primary_student: primary, fields_filled: updates },
    });

    return new Response(
      JSON.stringify({ success: true, primary_student_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
