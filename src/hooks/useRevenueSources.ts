import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type RevenueSource = Tables<"revenue_sources">;

export function useRevenueSources() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["revenue_sources", activeCompanyId],
    queryFn: async () => {
      if (!user) return [];
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("revenue_sources")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("name");
      if (error) throw error;
      return data as RevenueSource[];
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useDeleteRevenueSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Issue 2.12: Block deletion if linked revenues exist
      const { count } = await supabase
        .from("revenues")
        .select("id", { count: "exact", head: true })
        .eq("source_id", id);
      if (count && count > 0) {
        throw new Error(`Cannot delete this source — it has ${count} linked revenue(s). Deactivate it instead.`);
      }

      const { error } = await supabase.from("revenue_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue_sources"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useCreateRevenueSource() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("revenue_sources")
        .insert({ name, user_id: user.id, company_id: activeCompanyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue_sources"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
