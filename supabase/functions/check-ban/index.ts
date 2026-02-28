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

function jsonResponse(status: number, body: unknown, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

const checkBanSchema = z.object({
  email: z.string().trim().email("Invalid email format").max(255, "Email too long"),
});

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = checkBanSchema.safeParse(rawBody);

    if (!parsed.success) {
      return jsonResponse(400, { error: parsed.error.issues[0]?.message || "Invalid input" }, cors);
    }

    const { email } = parsed.data;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalizedEmail = email.toLowerCase().trim();

    const { data: banData, error: banError } = await supabaseAdmin
      .from("registration_requests")
      .select("banned_until, status")
      .eq("email", normalizedEmail)
      .gt("banned_until", new Date().toISOString())
      .maybeSingle();

    if (banError) {
      console.error("DB error:", banError);
      return jsonResponse(500, { error: "Internal error" }, cors);
    }

    if (banData) {
      return jsonResponse(200, {
        banned: true,
        banned_until: banData.banned_until,
        ban_type: banData.status === "rejected" ? "rejected" : "deleted",
        rejected: false,
        rejection_reason: null,
      }, cors);
    }

    const { data: rejectedData, error: rejError } = await supabaseAdmin
      .from("registration_requests")
      .select("status, rejection_reason")
      .eq("email", normalizedEmail)
      .eq("status", "rejected")
      .maybeSingle();

    if (rejError) {
      console.error("DB error:", rejError);
      return jsonResponse(500, { error: "Internal error" }, cors);
    }

    if (rejectedData) {
      return jsonResponse(200, {
        banned: false, banned_until: null, ban_type: null,
        rejected: true, rejection_reason: rejectedData.rejection_reason,
      }, cors);
    }

    return jsonResponse(200, {
      banned: false, banned_until: null, ban_type: null, rejected: false, rejection_reason: null,
    }, cors);
  } catch (e) {
    const cors = getCorsHeaders(req);
    console.error("Error:", e);
    return jsonResponse(500, { error: "Internal error" }, cors);
  }
});
