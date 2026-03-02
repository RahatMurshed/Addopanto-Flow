import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface Batch {
  id: string;
  company_id: string;
  course_id: string | null;
  batch_name: string;
  batch_code: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  course_duration_months: number | null;
  course_duration_days: number | null;
  payment_mode: "one_time" | "monthly";
  default_admission_fee: number;
  default_monthly_fee: number;
  max_capacity: number | null;
  status: "active" | "completed" | "archived";
  created_by: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface BatchInsert {
  batch_name: string;
  batch_code: string;
  course_id?: string | null;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  course_duration_months?: number | null;
  course_duration_days?: number | null;
  payment_mode?: "one_time" | "monthly";
  default_admission_fee?: number;
  default_monthly_fee?: number;
  max_capacity?: number | null;
  status?: "active" | "completed" | "archived";
}

export interface BatchFilters {
  search?: string;
  status?: "all" | "active" | "completed" | "archived";
}

export function useBatches(filters?: BatchFilters) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const search = filters?.search?.trim() || "";
  const status = filters?.status || "all";

  return useQuery({
    queryKey: ["batches", activeCompanyId, { search, status }],
    queryFn: async () => {
      if (!user || !activeCompanyId) return [];
      let query = supabase
        .from("batches" as any)
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (status !== "all") {
        query = query.eq("status", status);
      }

      if (search) {
        const sanitized = search.replace(/[%_\\]/g, "\\$&");
        query = query.or(`batch_name.ilike.%${sanitized}%,batch_code.ilike.%${sanitized}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Batch[];
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useBatch(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["batches", id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from("batches" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Batch;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateBatch() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batch: BatchInsert) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("batches" as any)
        .insert({
          ...batch,
          company_id: activeCompanyId,
          user_id: user.id,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BatchInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("batches" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Batch;
    },
    onSuccess: async (data: Batch, variables) => {
      // Issue 1.4: When batch is manually completed, also complete active enrollments
      if (data.status === "completed") {
        await supabase
          .from("batch_enrollments")
          .update({ status: "completed", updated_at: new Date().toISOString() } as any)
          .eq("batch_id", data.id)
          .eq("status", "active");
        queryClient.invalidateQueries({ queryKey: ["batch_enrollments"] });
      }

      // Issue 2.6: Warn if batch duration was extended
      if (variables.course_duration_months !== undefined) {
        // The toast is shown by the calling component; we just invalidate
      }

      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batches", data.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("batches" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useBatchStudentCount(batchId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["batch-student-count", batchId],
    queryFn: async () => {
      if (!user || !batchId) return 0;
      const { count, error } = await (supabase
        .from("batch_enrollments")
        .select("id", { count: "exact", head: true }) as any)
        .eq("batch_id", batchId)
        .eq("status", "active");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && !!batchId,
  });
}
