import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type RevenueSource = Tables<"revenue_sources">;

export function useRevenueSources() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue_sources"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("revenue_sources")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as RevenueSource[];
    },
    enabled: !!user,
  });
}

export function useCreateRevenueSource() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("revenue_sources")
        .insert({ name, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue_sources"] });
    },
  });
}
