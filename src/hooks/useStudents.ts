import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

  return useQuery({
    queryKey: ["students", { search, status, sortBy, sortOrder }],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase.from("students").select("*");

      // Server-side status filter
      if (status !== "all") {
        query = query.eq("status", status);
      }

      // Server-side search: name or student_id_number (case-insensitive)
      if (search) {
        query = query.or(`name.ilike.%${search}%,student_id_number.ilike.%${search}%`);
      }

      // Server-side sorting
      query = query.order(sortBy, { ascending: sortOrder });

      const { data, error } = await query;
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!user,
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (student: StudentInsert) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("students")
        .insert({ ...student, user_id: user.id } as any)
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
        } as any);
      }

      return data as Student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useUpdateStudent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StudentInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("students")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Student;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students", data.id] });
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
    },
  });
}
