import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface Student {
  id: string;
  name: string;
  student_id_number: string | null;
  email: string | null;
  phone: string | null;
  enrollment_date: string;
  billing_start_month: string;
  course_start_month: string | null;
  course_end_month: string | null;
  admission_fee_total: number;
  monthly_fee_amount: number;
  status: "active" | "inactive" | "graduated";
  notes: string | null;
  user_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface StudentInsert {
  name: string;
  student_id_number?: string | null;
  email?: string | null;
  phone?: string | null;
  enrollment_date: string;
  billing_start_month: string;
  course_start_month?: string | null;
  course_end_month?: string | null;
  admission_fee_total?: number;
  monthly_fee_amount?: number;
  status?: "active" | "inactive" | "graduated";
  notes?: string | null;
  batch_id?: string | null;
}

export interface StudentFilters {
  search?: string;
  status?: "all" | "active" | "inactive" | "graduated";
  sortBy?: "name" | "enrollment_date" | "monthly_fee_amount";
  sortOrder?: "asc" | "desc";
}

export function useStudents(filters?: StudentFilters) {
  const { user } = useAuth();
  const search = filters?.search?.trim() || "";
  const status = filters?.status || "all";
  const sortBy = filters?.sortBy || "name";
  const sortOrder = (filters?.sortOrder || "asc") === "asc";

  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["students", activeCompanyId, { search, status, sortBy, sortOrder }],
    queryFn: async () => {
      if (!user) return [];
      if (!activeCompanyId) return [];
      let query = supabase.from("students").select("*").eq("company_id", activeCompanyId);

      if (status !== "all") {
        query = query.eq("status", status);
      }

      if (search) {
        // Escape special LIKE pattern characters to prevent pattern injection
        const sanitized = search.replace(/[%_\\]/g, '\\$&');
        query = query.or(`name.ilike.%${sanitized}%,student_id_number.ilike.%${sanitized}%`);
      }

      query = query.order(sortBy, { ascending: sortOrder });

      const { data, error } = await query;
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useStudent(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["students", id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Student;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateStudent() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (student: StudentInsert) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("students")
        .insert({
          ...student,
          user_id: user.id,
          company_id: activeCompanyId,
        })
        .select()
        .single();
      if (error) throw error;

      // Create initial monthly_fee_history entry if monthly fee > 0
      if ((student.monthly_fee_amount || 0) > 0) {
        await supabase.from("monthly_fee_history").insert({
          student_id: data.id,
          monthly_amount: student.monthly_fee_amount!,
          effective_from: student.billing_start_month,
          user_id: user.id,
          company_id: activeCompanyId,
        });
      }

      return data as Student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_fee_history"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StudentInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("students")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Student;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students", data.id] });
      queryClient.invalidateQueries({ queryKey: ["student_payments"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_summary"] });
      queryClient.invalidateQueries({ queryKey: ["expense_summary"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_fee_history"] });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student_payments"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_summary"] });
      queryClient.invalidateQueries({ queryKey: ["expense_summary"] });
    },
  });
}
