import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export type KhataTransfer = {
  id: string;
  user_id: string;
  company_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string | null;
  created_at: string;
};

export type KhataTransferInsert = {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description?: string | null;
};

export function useKhataTransfers() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["khata_transfers", activeCompanyId],
    queryFn: async () => {
      if (!user) return [];
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("khata_transfers")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as KhataTransfer[];
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useCreateKhataTransfer() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transfer: KhataTransferInsert) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("khata_transfers")
        .insert({ ...transfer, user_id: user.id, company_id: activeCompanyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["khata_transfers"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useDeleteKhataTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("khata_transfers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["khata_transfers"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
