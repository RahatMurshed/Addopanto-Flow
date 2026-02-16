import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ImportRow {
  [key: string]: string | number | null | undefined;
}

interface ColumnMapping {
  [csvColumn: string]: string; // maps CSV column -> DB column
}

const VALID_DB_COLUMNS = new Set([
  "name",
  "student_id_number",
  "email",
  "phone",
  "enrollment_date",
  "billing_start_month",
  "course_start_month",
  "course_end_month",
  "admission_fee_total",
  "monthly_fee_amount",
  "status",
  "notes",
  "batch_id",
  "date_of_birth",
  "gender",
  "blood_group",
  "religion_category",
  "nationality",
  "aadhar_id_number",
  "whatsapp_number",
  "alt_contact_number",
  "address_house",
  "address_street",
  "address_area",
  "address_city",
  "address_state",
  "address_pin_zip",
  "permanent_address_same",
  "perm_address_house",
  "perm_address_street",
  "perm_address_area",
  "perm_address_city",
  "perm_address_state",
  "perm_address_pin_zip",
  "father_name",
  "father_occupation",
  "father_contact",
  "father_annual_income",
  "mother_name",
  "mother_occupation",
  "mother_contact",
  "guardian_name",
  "guardian_contact",
  "guardian_relationship",
  "previous_school",
  "class_grade",
  "roll_number",
  "academic_year",
  "section_division",
  "previous_qualification",
  "previous_percentage",
  "board_university",
  "special_needs_medical",
  "emergency_contact_name",
  "emergency_contact_number",
  "transportation_mode",
  "distance_from_institution",
  "extracurricular_interests",
  "language_proficiency",
]);

const NUMERIC_COLUMNS = new Set([
  "admission_fee_total",
  "monthly_fee_amount",
  "father_annual_income",
]);

const VALID_STATUSES = new Set(["active", "inactive", "graduated"]);

function validateRow(
  row: Record<string, unknown>,
  rowIndex: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!row.name || String(row.name).trim() === "") {
    errors.push("Name is required");
  } else if (String(row.name).trim().length > 200) {
    errors.push("Name must be less than 200 characters");
  }

  if (!row.enrollment_date || String(row.enrollment_date).trim() === "") {
    errors.push("Enrollment date is required");
  } else {
    const d = new Date(String(row.enrollment_date));
    if (isNaN(d.getTime())) errors.push("Invalid enrollment_date format");
  }

  if (
    !row.billing_start_month ||
    String(row.billing_start_month).trim() === ""
  ) {
    errors.push("Billing start month is required");
  } else if (!/^\d{4}-\d{2}$/.test(String(row.billing_start_month))) {
    errors.push("billing_start_month must be YYYY-MM format");
  }

  if (row.status && !VALID_STATUSES.has(String(row.status))) {
    errors.push(`Invalid status '${row.status}'. Must be active/inactive/graduated`);
  }

  for (const col of NUMERIC_COLUMNS) {
    if (row[col] !== undefined && row[col] !== null && row[col] !== "") {
      const n = Number(row[col]);
      if (isNaN(n) || n < 0) {
        errors.push(`${col} must be a non-negative number`);
      }
    }
  }

  if (row.email && String(row.email).trim() !== "") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(row.email))) {
      errors.push("Invalid email format");
    }
  }

  if (row.date_of_birth && String(row.date_of_birth).trim() !== "") {
    const d = new Date(String(row.date_of_birth));
    if (isNaN(d.getTime())) errors.push("Invalid date_of_birth format");
  }

  return { valid: errors.length === 0, errors };
}

function transformRow(
  row: Record<string, unknown>,
  userId: string,
  companyId: string,
  batchId?: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    user_id: userId,
    company_id: companyId,
  };

  for (const [key, val] of Object.entries(row)) {
    if (!VALID_DB_COLUMNS.has(key)) continue;
    if (val === undefined || val === null || val === "") {
      continue;
    }
    if (NUMERIC_COLUMNS.has(key)) {
      result[key] = Number(val);
    } else if (key === "permanent_address_same") {
      result[key] =
        String(val).toLowerCase() === "true" ||
        String(val) === "1" ||
        String(val).toLowerCase() === "yes";
    } else {
      result[key] = String(val).trim();
    }
  }

  // Defaults
  if (!result.status) result.status = "active";
  if (!result.admission_fee_total) result.admission_fee_total = 0;
  if (!result.monthly_fee_amount) result.monthly_fee_amount = 0;
  if (batchId && !result.batch_id) result.batch_id = batchId;

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client to get user
    const authClient = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      rows,
      column_mapping,
      company_id,
      batch_id,
    }: {
      rows: ImportRow[];
      column_mapping: ColumnMapping;
      company_id: string;
      batch_id?: string;
    } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No rows provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rows.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Maximum 5000 rows per import" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify company membership
    const { data: membership } = await authClient
      .from("company_memberships")
      .select("role")
      .eq("company_id", company_id)
      .eq("user_id", user.id)
      .eq("status", "approved")
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Not a member of this company" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map CSV columns to DB columns
    const mappedRows = rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [csvCol, dbCol] of Object.entries(column_mapping)) {
        if (VALID_DB_COLUMNS.has(dbCol) && row[csvCol] !== undefined) {
          mapped[dbCol] = row[csvCol];
        }
      }
      return mapped;
    });

    // Validate all rows
    const validRows: Record<string, unknown>[] = [];
    const failedRows: { row: number; errors: string[]; data: Record<string, unknown> }[] = [];
    let duplicateCount = 0;

    // Collect student_id_numbers for duplicate checking
    const idNumbers = mappedRows
      .map((r) => r.student_id_number)
      .filter((id) => id && String(id).trim() !== "");

    let existingIds = new Set<string>();
    if (idNumbers.length > 0) {
      const { data: existing } = await authClient
        .from("students")
        .select("student_id_number")
        .eq("company_id", company_id)
        .in(
          "student_id_number",
          idNumbers.map((id) => String(id))
        );
      if (existing) {
        existingIds = new Set(
          existing.map((e: { student_id_number: string }) => e.student_id_number)
        );
      }
    }

    for (let i = 0; i < mappedRows.length; i++) {
      const row = mappedRows[i];
      const { valid, errors } = validateRow(row, i);

      if (
        row.student_id_number &&
        String(row.student_id_number).trim() !== "" &&
        existingIds.has(String(row.student_id_number))
      ) {
        errors.push(
          `Duplicate: student ID '${row.student_id_number}' already exists`
        );
        duplicateCount++;
      }

      if (errors.length > 0) {
        failedRows.push({ row: i + 1, errors, data: row });
      } else {
        validRows.push(transformRow(row, user.id, company_id, batch_id));
      }
    }

    // Insert valid rows in batches of 100
    let successCount = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      const { error: insertError, data: inserted } = await authClient
        .from("students")
        .insert(batch as any)
        .select("id, monthly_fee_amount, billing_start_month");

      if (insertError) {
        // Add remaining as failures
        for (let j = i; j < validRows.length; j++) {
          failedRows.push({
            row: j + 1,
            errors: [`Database error: ${insertError.message}`],
            data: validRows[j],
          });
        }
        break;
      }

      // Create monthly_fee_history entries for students with monthly fees
      if (inserted) {
        const feeHistoryEntries = inserted
          .filter((s: any) => (s.monthly_fee_amount || 0) > 0)
          .map((s: any) => ({
            student_id: s.id,
            monthly_amount: s.monthly_fee_amount,
            effective_from: s.billing_start_month,
            user_id: user.id,
            company_id: company_id,
          }));

        if (feeHistoryEntries.length > 0) {
          await authClient.from("monthly_fee_history").insert(feeHistoryEntries);
        }
      }

      successCount += batch.length;
    }

    return new Response(
      JSON.stringify({
        success_count: successCount,
        failed_count: failedRows.length,
        duplicate_count: duplicateCount,
        total_rows: rows.length,
        failed_rows: failedRows.slice(0, 100), // limit response size
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
