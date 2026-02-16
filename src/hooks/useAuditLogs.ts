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
  role?: string;
  limit?: number;
  offset?: number;
}

export function useAuditLogs(filters?: AuditLogFilters) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const tableName = filters?.table_name || "";
  const action = filters?.action || "";
  const userEmail = filters?.user_email?.trim() || "";
  const role = filters?.role || "";
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  // Pre-fetch user_ids for a given role
  const { data: roleUserIds } = useQuery({
    queryKey: ["audit_role_user_ids", activeCompanyId, role],
    queryFn: async () => {
      if (!activeCompanyId || !role) return null;
      const { data, error } = await supabase
        .from("company_memberships")
        .select("user_id")
        .eq("company_id", activeCompanyId)
        .eq("role", role as any)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).map((d) => d.user_id);
    },
    enabled: !!user && !!activeCompanyId && !!role,
  });

  return useQuery({
    queryKey: ["audit_logs", activeCompanyId, { tableName, action, userEmail, role, roleUserIds, limit, offset }],
    queryFn: async () => {
      if (!user || !activeCompanyId) return { data: [] as AuditLog[], count: 0 };

      // If role filter is active but no users found with that role, return empty
      if (role && roleUserIds !== null && roleUserIds !== undefined && roleUserIds.length === 0) {
        return { data: [] as AuditLog[], count: 0 };
      }

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
      if (role && roleUserIds && roleUserIds.length > 0) {
        query = query.in("user_id", roleUserIds);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data ?? []) as unknown as AuditLog[], count: count ?? 0 };
    },
    enabled: !!user && !!activeCompanyId && (!role || roleUserIds !== undefined),
  });
}
