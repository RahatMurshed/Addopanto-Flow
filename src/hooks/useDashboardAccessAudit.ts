import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AccessLog {
  id: string;
  user_id: string;
  user_email: string | null;
  company_id: string | null;
  membership_role: string | null;
  is_cipher: boolean;
  view_path: string;
  is_anomaly: boolean;
  anomaly_reason: string | null;
  created_at: string;
}

interface Filters {
  anomalyOnly: boolean;
  emailSearch: string;
  page: number;
  pageSize: number;
}

export function useDashboardAccessAudit() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({
    anomalyOnly: false,
    emailSearch: "",
    page: 0,
    pageSize: 20,
  });

  // Fetch logs
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-access-logs", filters],
    queryFn: async () => {
      let query = (supabase.from("dashboard_access_logs" as any) as any)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(filters.page * filters.pageSize, (filters.page + 1) * filters.pageSize - 1);

      if (filters.anomalyOnly) {
        query = query.eq("is_anomaly", true);
      }
      if (filters.emailSearch.trim()) {
        query = query.ilike("user_email", `%${filters.emailSearch.trim()}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: (data || []) as AccessLog[], total: count || 0 };
    },
  });

  // 24h summary
  const { data: summary } = useQuery({
    queryKey: ["dashboard-access-summary"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase.from("dashboard_access_logs" as any) as any)
        .select("user_id, user_email, company_id, is_anomaly, anomaly_reason, created_at")
        .gte("created_at", since);
      if (error) throw error;
      const logs = (data || []) as AccessLog[];
      const uniqueUsers = new Set(logs.map((l) => l.user_id)).size;
      const uniqueCompanies = new Set(logs.filter((l) => l.company_id).map((l) => l.company_id)).size;
      const anomalies = logs.filter((l) => l.is_anomaly);
      return {
        totalAccesses: logs.length,
        uniqueUsers,
        activeCompanies: uniqueCompanies,
        anomalyCount: anomalies.length,
        recentAnomalies: anomalies.slice(0, 10),
      };
    },
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-access-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dashboard_access_logs" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-access-logs"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-access-summary"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const setAnomalyOnly = useCallback((v: boolean) => setFilters((f) => ({ ...f, anomalyOnly: v, page: 0 })), []);
  const setEmailSearch = useCallback((v: string) => setFilters((f) => ({ ...f, emailSearch: v, page: 0 })), []);
  const setPage = useCallback((v: number) => setFilters((f) => ({ ...f, page: v })), []);

  return {
    logs: data?.logs || [],
    total: data?.total || 0,
    isLoading,
    filters,
    setAnomalyOnly,
    setEmailSearch,
    setPage,
    summary: summary || { totalAccesses: 0, uniqueUsers: 0, activeCompanies: 0, anomalyCount: 0, recentAnomalies: [] },
  };
}
