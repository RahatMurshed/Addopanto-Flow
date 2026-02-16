import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import type { StudentFilterValues } from "@/components/StudentFilters";

export interface SavedSearchPreset {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  filters: StudentFilterValues;
  created_at: string;
}

export function useSavedSearchPresets() {
  const { user } = useAuth();
  const companyId = useActiveCompanyId();

  return useQuery({
    queryKey: ["saved-search-presets", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_search_presets" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as SavedSearchPreset[];
    },
    enabled: !!user && !!companyId,
  });
}

export function useCreatePreset() {
  const { user } = useAuth();
  const companyId = useActiveCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, filters }: { name: string; filters: StudentFilterValues }) => {
      const { error } = await supabase
        .from("saved_search_presets" as any)
        .insert({
          user_id: user!.id,
          company_id: companyId!,
          name,
          filters: filters as any,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-search-presets", companyId] });
    },
  });
}

export function useDeletePreset() {
  const companyId = useActiveCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("saved_search_presets" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-search-presets", companyId] });
    },
  });
}
