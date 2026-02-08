import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type KhataTransfer = {
  id: string;
  user_id: string;
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

  return useQuery({
    queryKey: ["khata_transfers", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("khata_transfers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as KhataTransfer[];
    },
    enabled: !!user,
  });
}

export function useCreateKhataTransfer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transfer: KhataTransferInsert) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("khata_transfers")
        .insert({ ...transfer, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["khata_transfers", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["account_balances", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.id] });
    },
  });
}

export function useDeleteKhataTransfer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("khata_transfers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["khata_transfers", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["account_balances", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.id] });
    },
  });
}
