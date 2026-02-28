import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];

    // Find all active batches past their end_date
    const { data: expiredBatches, error: fetchError } = await supabase
      .from("batches")
      .select("id, batch_name, company_id")
      .eq("status", "active")
      .not("end_date", "is", null)
      .lt("end_date", today);

    if (fetchError) throw fetchError;

    if (!expiredBatches || expiredBatches.length === 0) {
      return new Response(
        JSON.stringify({ message: "No batches to complete", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const completedIds: string[] = [];

    for (const batch of expiredBatches) {
      // Update batch status to completed
      const { error: updateError } = await supabase
        .from("batches")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", batch.id);

      if (updateError) {
        console.error(`Failed to complete batch ${batch.id}:`, updateError);
        continue;
      }

      // The DB trigger sync_enrollments_on_batch_completion will
      // automatically update batch_enrollments.status to 'completed'

      // Log to audit_logs
      await supabase.from("audit_logs").insert({
        company_id: batch.company_id,
        user_id: "00000000-0000-0000-0000-000000000000", // system action
        record_id: batch.id,
        table_name: "batches",
        action: "auto_complete",
        new_data: { status: "completed", batch_name: batch.batch_name },
        user_email: "system@auto-complete",
      });

      completedIds.push(batch.id);
    }

    return new Response(
      JSON.stringify({
        message: `Auto-completed ${completedIds.length} batch(es)`,
        count: completedIds.length,
        batch_ids: completedIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-complete batches error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
