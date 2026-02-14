import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface AuditLog {
  id: string;
  company_id: string;
  user_id: string;
  user_email: string | null;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogFilters {
  table_name?: string;
  action?: string;
  user_email?: string;
  limit?: number;
  offset?: number;
}

export function useAuditLogs(filters?: AuditLogFilters) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const tableName = filters?.table_name || "";
  const action = filters?.action || "";
  const userEmail = filters?.user_email?.trim() || "";
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  return useQuery({
    queryKey: ["audit_logs", activeCompanyId, { tableName, action, userEmail, limit, offset }],
    queryFn: async () => {
      if (!user || !activeCompanyId) return { data: [] as AuditLog[], count: 0 };

      let query = supabase
        .from("audit_logs" as any)
        .select("*", { count: "exact" })
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (tableName) query = query.eq("table_name", tableName);
      if (action) query = query.eq("action", action);
      if (userEmail) {
        const sanitized = userEmail.replace(/[%_\\]/g, "\\$&");
        query = query.ilike("user_email", `%${sanitized}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data ?? []) as unknown as AuditLog[], count: count ?? 0 };
    },
    enabled: !!user && !!activeCompanyId,
  });
}
