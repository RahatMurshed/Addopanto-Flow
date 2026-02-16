import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface StudentSibling {
  id: string;
  student_id: string;
  company_id: string;
  name: string | null;
  age: number | null;
  occupation_school: string | null;
  contact: string | null;
  created_at: string;
}

export interface SiblingInput {
  name: string;
  age?: number | null;
  occupation_school?: string | null;
  contact?: string | null;
}

export function useStudentSiblings(studentId: string | undefined) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["student_siblings", studentId],
    queryFn: async () => {
      if (!user || !studentId || !activeCompanyId) return [];
      const { data, error } = await supabase
        .from("student_siblings")
        .select("*")
        .eq("student_id", studentId)
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as StudentSibling[];
    },
    enabled: !!user && !!studentId && !!activeCompanyId,
  });
}

export function useSaveSiblings() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, siblings }: { studentId: string; siblings: SiblingInput[] }) => {
      if (!user || !activeCompanyId) throw new Error("Not authenticated");

      // Delete existing siblings for this student
      await supabase
        .from("student_siblings")
        .delete()
        .eq("student_id", studentId)
        .eq("company_id", activeCompanyId);

      // Insert new siblings if any
      if (siblings.length > 0) {
        const rows = siblings.map((s) => ({
          student_id: studentId,
          company_id: activeCompanyId,
          name: s.name || null,
          age: s.age || null,
          occupation_school: s.occupation_school || null,
          contact: s.contact || null,
        }));
        const { error } = await supabase.from("student_siblings").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["student_siblings", vars.studentId] });
    },
  });
}
