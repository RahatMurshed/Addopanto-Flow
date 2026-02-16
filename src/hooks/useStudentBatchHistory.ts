import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface BatchHistoryEntry {
  id: string;
  student_id: string;
  from_batch_id: string | null;
  to_batch_id: string | null;
  reason: string | null;
  transferred_at: string;
  transferred_by: string;
  company_id: string;
}

export function useStudentBatchHistory(studentId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["student_batch_history", studentId],
    queryFn: async () => {
      if (!user || !studentId) return [];
      const { data, error } = await supabase
        .from("student_batch_history")
        .select("*")
        .eq("student_id", studentId)
        .order("transferred_at", { ascending: false });
      if (error) throw error;
      return data as BatchHistoryEntry[];
    },
    enabled: !!user && !!studentId,
  });
}

export function useCreateBatchHistory() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      student_id: string;
      from_batch_id: string | null;
      to_batch_id: string | null;
      reason?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("student_batch_history")
        .insert({
          ...entry,
          transferred_by: user.id,
          company_id: activeCompanyId,
        })
        .select()
        .single();
      if (error) throw error;
      return data as BatchHistoryEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student_batch_history", data.student_id] });
    },
  });
}
