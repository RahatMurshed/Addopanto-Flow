import * as Sentry from "@sentry/react";

const PII_KEYS = new Set([
  "phone", "email", "address", "name", "student_name",
  "guardian_name", "guardian_phone", "guardian_email",
  "date_of_birth", "whatsapp_number", "contact_number",
  "aadhar_national_id", "bank_account_number",
]);

function scrubPii(obj: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!obj || typeof obj !== "object") return obj;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PII_KEYS.has(key.toLowerCase())) {
      cleaned[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = scrubPii(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: import.meta.env.MODE,
    beforeSend(event) {
      // Scrub PII from extra, contexts, and breadcrumbs
      if (event.extra) {
        event.extra = scrubPii(event.extra as Record<string, unknown>);
      }
      if (event.contexts) {
        event.contexts = scrubPii(event.contexts as Record<string, unknown>) as typeof event.contexts;
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => ({
          ...bc,
          data: bc.data ? scrubPii(bc.data as Record<string, unknown>) : bc.data,
        }));
      }
      return event;
    },
  });
}

export { Sentry };
