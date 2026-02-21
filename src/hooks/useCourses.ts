import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface Course {
  id: string;
  company_id: string;
  course_name: string;
  course_code: string;
  description: string | null;
  duration_months: number | null;
  category: string | null;
  cover_image_url: string | null;
  status: string;
  created_by: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CourseInsert {
  course_name: string;
  course_code: string;
  description?: string | null;
  duration_months?: number | null;
  category?: string | null;
  cover_image_url?: string | null;
  status?: string;
}

export interface CourseFilters {
  search?: string;
  status?: "all" | "active" | "inactive";
}

export function useCourses(filters?: CourseFilters) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const search = filters?.search?.trim() || "";
  const status = filters?.status || "all";

  return useQuery({
    queryKey: ["courses", activeCompanyId, { search, status }],
    queryFn: async () => {
      if (!user || !activeCompanyId) return [];
      let query = supabase
        .from("courses" as any)
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (status !== "all") {
        query = query.eq("status", status);
      }

      if (search) {
        const sanitized = search.replace(/[%_\\]/g, "\\$&");
        query = query.or(`course_name.ilike.%${sanitized}%,course_code.ilike.%${sanitized}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Course[];
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useCourse(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["courses", id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from("courses" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Course;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateCourse() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (course: CourseInsert) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("courses" as any)
        .insert({
          ...course,
          company_id: activeCompanyId,
          user_id: user.id,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CourseInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("courses" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Course update failed — you may not have permission.");
      return data as unknown as Course;
    },
    onSuccess: (data: Course) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses", data.id] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
  });
}
