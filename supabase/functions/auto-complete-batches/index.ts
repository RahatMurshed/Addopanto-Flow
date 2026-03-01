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

    // ── 1. Auto-complete expired batches ──
    const { data: expiredBatches, error: fetchError } = await supabase
      .from("batches")
      .select("id, batch_name, company_id")
      .eq("status", "active")
      .not("end_date", "is", null)
      .lt("end_date", today);

    if (fetchError) throw fetchError;

    const completedIds: string[] = [];

    if (expiredBatches && expiredBatches.length > 0) {
      for (const batch of expiredBatches) {
        const { error: updateError } = await supabase
          .from("batches")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", batch.id);

        if (updateError) {
          console.error(`Failed to complete batch ${batch.id}:`, updateError);
          continue;
        }

        await supabase.from("audit_logs").insert({
          company_id: batch.company_id,
          user_id: "00000000-0000-0000-0000-000000000000",
          record_id: batch.id,
          table_name: "batches",
          action: "auto_complete",
          new_data: { status: "completed", batch_name: batch.batch_name },
          user_email: "system@auto-complete",
        });

        completedIds.push(batch.id);
      }
    }

    // ── 2. Financial consistency check for all companies ──
    const { data: companies, error: compError } = await supabase
      .from("companies")
      .select("id");

    if (compError) {
      console.error("Failed to fetch companies for consistency check:", compError);
    }

    const consistencyResults: Record<string, unknown> = {};

    if (companies && companies.length > 0) {
      for (const company of companies) {
        try {
          const { data, error } = await supabase.rpc("verify_financial_consistency", {
            _company_id: company.id,
          });
          if (error) {
            console.error(`Consistency check failed for ${company.id}:`, error);
            consistencyResults[company.id] = { error: error.message };
          } else {
            consistencyResults[company.id] = data;
          }
        } catch (e) {
          console.error(`Consistency check exception for ${company.id}:`, e);
          consistencyResults[company.id] = { error: String(e) };
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Auto-completed ${completedIds.length} batch(es)`,
        count: completedIds.length,
        batch_ids: completedIds,
        consistency_check: consistencyResults,
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
