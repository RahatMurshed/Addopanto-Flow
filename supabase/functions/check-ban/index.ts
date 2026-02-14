import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const checkBanSchema = z.object({
  email: z.string().trim().email("Invalid email format").max(255, "Email too long"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = checkBanSchema.safeParse(rawBody);

    if (!parsed.success) {
      return jsonResponse(400, { error: parsed.error.issues[0]?.message || "Invalid input" });
    }

    const { email } = parsed.data;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalizedEmail = email.toLowerCase().trim();

    // Check for active ban first
    const { data: banData, error: banError } = await supabaseAdmin
      .from("registration_requests")
      .select("banned_until, status")
      .eq("email", normalizedEmail)
      .gt("banned_until", new Date().toISOString())
      .maybeSingle();

    if (banError) {
      console.error("DB error:", banError);
      return jsonResponse(500, { error: "Internal error" });
    }

    if (banData) {
      return jsonResponse(200, {
        banned: true,
        banned_until: banData.banned_until,
        ban_type: banData.status === "rejected" ? "rejected" : "deleted",
        rejected: false,
        rejection_reason: null,
      });
    }

    // No active ban — check if rejected (ban expired but still rejected status)
    const { data: rejectedData, error: rejError } = await supabaseAdmin
      .from("registration_requests")
      .select("status, rejection_reason")
      .eq("email", normalizedEmail)
      .eq("status", "rejected")
      .maybeSingle();

    if (rejError) {
      console.error("DB error:", rejError);
      return jsonResponse(500, { error: "Internal error" });
    }

    if (rejectedData) {
      return jsonResponse(200, {
        banned: false,
        banned_until: null,
        ban_type: null,
        rejected: true,
        rejection_reason: rejectedData.rejection_reason,
      });
    }

    return jsonResponse(200, {
      banned: false,
      banned_until: null,
      ban_type: null,
      rejected: false,
      rejection_reason: null,
    });
  } catch (e) {
    console.error("Error:", e);
    return jsonResponse(500, { error: "Internal error" });
  }
});
