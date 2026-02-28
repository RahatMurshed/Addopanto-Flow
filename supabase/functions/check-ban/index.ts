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
    // Rate limiting: 10 requests per IP per minute
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: allowed } = await supabaseAdmin.rpc("check_rate_limit", {
      _key: `check-ban:${clientIp}`,
      _max_requests: 10,
      _window_seconds: 60,
    });
    if (allowed === false) {
      return jsonResponse(429, { error: "Too many requests. Please try again later." }, cors);
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = checkBanSchema.safeParse(rawBody);

    if (!parsed.success) {
      return jsonResponse(400, { error: parsed.error.issues[0]?.message || "Invalid input" }, cors);
    }

    const { email } = parsed.data;
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
