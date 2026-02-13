import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return jsonResponse(400, { error: "Missing email" });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabaseAdmin
      .from("registration_requests")
      .select("banned_until, status")
      .eq("email", email.toLowerCase().trim())
      .gt("banned_until", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("DB error:", error);
      return jsonResponse(500, { error: "Internal error" });
    }

    if (data) {
      return jsonResponse(200, {
        banned: true,
        banned_until: data.banned_until,
        ban_type: data.status === "rejected" ? "rejected" : "deleted",
      });
    }

    return jsonResponse(200, { banned: false, banned_until: null, ban_type: null });
  } catch (e) {
    console.error("Error:", e);
    return jsonResponse(500, { error: "Internal error" });
  }
});
