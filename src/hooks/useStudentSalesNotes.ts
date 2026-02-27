import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface StudentSalesNote {
  id: string;
  company_id: string;
  student_id: string;
  note_text: string;
  category: string;
  note_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StudentSalesNoteInsert {
  student_id: string;
  note_text: string;
  category: string;
  note_date: string;
}

export const NOTE_CATEGORIES = [
  { value: "follow_up_call", label: "Follow-up Call", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "meeting", label: "Meeting", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "demo_given", label: "Demo Given", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "enrolled", label: "Enrolled", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "declined", label: "Declined", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  { value: "general", label: "General Note", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
] as const;

export function getCategoryInfo(category: string) {
  return NOTE_CATEGORIES.find((c) => c.value === category) || NOTE_CATEGORIES[5];
}

export function useStudentSalesNotes(studentId?: string) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["student_sales_notes", activeCompanyId, studentId],
    queryFn: async () => {
      if (!user || !activeCompanyId || !studentId) return [];
      const { data, error } = await supabase
        .from("student_sales_notes" as any)
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("student_id", studentId)
        .order("note_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StudentSalesNote[];
    },
    enabled: !!user && !!activeCompanyId && !!studentId,
  });
}

export function useCreateSalesNote() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: StudentSalesNoteInsert) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("student_sales_notes" as any)
        .insert({
          ...note,
          company_id: activeCompanyId,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs" as any).insert({
        company_id: activeCompanyId,
        user_id: user.id,
        user_email: user.email,
        table_name: "student_sales_notes",
        record_id: (data as any).id,
        action: "INSERT",
        new_data: data,
      });

      return data as unknown as StudentSalesNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student_sales_notes"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
    },
  });
}

export function useUpdateSalesNote() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, note_text, category }: { id: string; note_text: string; category: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Fetch old data for audit
      const { data: oldData } = await supabase
        .from("student_sales_notes" as any)
        .select("*")
        .eq("id", id)
        .single();

      const { data, error } = await supabase
        .from("student_sales_notes" as any)
        .update({ note_text, category })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Audit log
      if (activeCompanyId) {
        await supabase.from("audit_logs" as any).insert({
          company_id: activeCompanyId,
          user_id: user.id,
          user_email: user.email,
          table_name: "student_sales_notes",
          record_id: id,
          action: "UPDATE",
          old_data: oldData,
          new_data: data,
        });
      }

      return data as unknown as StudentSalesNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student_sales_notes"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
    },
  });
}

export function useDeleteSalesNote() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");

      // Fetch old data for audit
      const { data: oldData } = await supabase
        .from("student_sales_notes" as any)
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("student_sales_notes" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;

      // Audit log
      if (activeCompanyId) {
        await supabase.from("audit_logs" as any).insert({
          company_id: activeCompanyId,
          user_id: user.id,
          user_email: user.email,
          table_name: "student_sales_notes",
          record_id: id,
          action: "DELETE",
          old_data: oldData,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student_sales_notes"] });
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
    },
  });
}
