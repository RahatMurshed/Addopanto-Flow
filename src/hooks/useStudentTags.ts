import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Tag {
  id: string;
  label: string;
  color_class: string;
  company_id: string;
  created_by: string;
  created_at: string;
}

interface TagAssignment {
  id: string;
  tag_id: string;
  student_id: string;
  company_id: string;
  assigned_by: string;
  created_at: string;
}

export function useCompanyTags(companyId: string | null) {
  return useQuery({
    queryKey: ["company-tags", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("student_tags")
        .select("*")
        .eq("company_id", companyId)
        .order("label");
      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!companyId,
  });
}

export function useStudentTagAssignments(studentId: string | null, companyId: string | null) {
  return useQuery({
    queryKey: ["student-tag-assignments", studentId],
    queryFn: async () => {
      if (!studentId || !companyId) return [];
      const { data, error } = await supabase
        .from("student_tag_assignments")
        .select("*")
        .eq("student_id", studentId)
        .eq("company_id", companyId);
      if (error) throw error;
      return data as TagAssignment[];
    },
    enabled: !!studentId && !!companyId,
  });
}

export function useCreateTag(companyId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ label, colorClass }: { label: string; colorClass: string }) => {
      if (!companyId || !user?.id) throw new Error("Missing company or user");
      const { data, error } = await supabase
        .from("student_tags")
        .insert({ company_id: companyId, label, color_class: colorClass, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-tags", companyId] });
    },
  });
}

export function useAssignTag(companyId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ studentId, tagId }: { studentId: string; tagId: string }) => {
      if (!companyId || !user?.id) throw new Error("Missing company or user");
      const { error } = await supabase
        .from("student_tag_assignments")
        .insert({ company_id: companyId, student_id: studentId, tag_id: tagId, assigned_by: user.id });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["student-tag-assignments", vars.studentId] });
    },
  });
}

export function useUnassignTag(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, tagId }: { studentId: string; tagId: string }) => {
      if (!companyId) throw new Error("Missing company");
      const { error } = await supabase
        .from("student_tag_assignments")
        .delete()
        .eq("company_id", companyId)
        .eq("student_id", studentId)
        .eq("tag_id", tagId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["student-tag-assignments", vars.studentId] });
    },
  });
}
