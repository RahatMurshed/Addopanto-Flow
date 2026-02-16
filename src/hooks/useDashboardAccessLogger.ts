import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AccessLogParams {
  userId: string;
  userEmail?: string;
  companyId?: string;
  membershipRole?: string;
  isCipher: boolean;
  isCompanyAdmin: boolean;
  isModerator: boolean;
  forceFullDashboard?: boolean;
}

export function useDashboardAccessLogger({
  userId,
  userEmail,
  companyId,
  membershipRole,
  isCipher,
  isCompanyAdmin,
  isModerator,
  forceFullDashboard = false,
}: AccessLogParams) {
  useEffect(() => {
    if (!userId) return;

    const viewPath = isModerator ? "moderator" : "full";
    const anomalies: string[] = [];

    // Anomaly: Cipher in moderator view
    if (isCipher && isModerator) {
      anomalies.push("Cipher user routed to moderator view");
    }
    // Anomaly: Admin in moderator view
    if (isCompanyAdmin && isModerator) {
      anomalies.push("Admin user routed to moderator view");
    }
    // Anomaly: membership role is admin but computed isModerator is true
    if (membershipRole === "admin" && isModerator) {
      anomalies.push("Role mismatch: membership=admin but computed as moderator");
    }

    if (forceFullDashboard) {
      anomalies.push("Cipher force-full-dashboard override active");
    }

    const isAnomaly = anomalies.length > 0;
    const anomalyReason = isAnomaly ? anomalies.join("; ") : null;

    // Also keep console logging for immediate visibility
    if (isAnomaly) {
      console.error("[DASHBOARD AUDIT] ❌ Anomaly detected!", { userId, anomalyReason, viewPath });
    }

    supabase
      .from("dashboard_access_logs" as any)
      .insert({
        user_id: userId,
        user_email: userEmail || null,
        company_id: companyId || null,
        membership_role: membershipRole || null,
        is_cipher: isCipher,
        view_path: viewPath,
        is_anomaly: isAnomaly,
        anomaly_reason: anomalyReason,
      } as any)
      .then(({ error }) => {
        if (error) console.warn("[DASHBOARD AUDIT] Failed to log access:", error.message);
      });
  }, [userId, companyId, isCipher, isCompanyAdmin, isModerator, membershipRole, userEmail, forceFullDashboard]);
}

