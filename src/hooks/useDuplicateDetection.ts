import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useState, useEffect, useRef } from "react";

// Normalization utils (mirror DB logic)
export function normalizePhone(phone: string): string {
  const stripped = phone.replace(/[\s\-\(\)\.]/g, "");
  return stripped.replace(/^(\+91|0091|91|0)/, "");
}

export function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function normalizeAadhar(aadhar: string): string {
  return aadhar.replace(/[\s\-]/g, "");
}

export interface DuplicateGroup {
  groupId: number;
  matchCriteria: string;
  students: DuplicateStudent[];
}

export interface DuplicateStudent {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  aadhar_id_number: string | null;
  enrollment_date: string;
  status: string;
  batch_id: string | null;
  isPrimary: boolean;
  paymentCount?: number;
}

interface RawDuplicateRow {
  student_id: string;
  group_id: number;
  match_criteria: string;
  is_primary: boolean;
}

export function useFindDuplicates() {
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["duplicate-students", activeCompanyId],
    enabled: false, // Only run on demand
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase.rpc("find_duplicate_students", {
        _company_id: activeCompanyId,
      });

      if (error) throw error;

      const rows = (data as unknown as RawDuplicateRow[]) || [];
      if (rows.length === 0) return [];

      // Fetch student details
      const studentIds = [...new Set(rows.map((r) => r.student_id))];
      const { data: students, error: sErr } = await supabase
        .from("students")
        .select("id, name, phone, email, aadhar_id_number, enrollment_date, status, batch_id")
        .in("id", studentIds);

      if (sErr) throw sErr;

      // Fetch payment counts
      const { data: payments } = await supabase
        .from("student_payments")
        .select("student_id")
        .in("student_id", studentIds);

      const paymentCounts = new Map<string, number>();
      (payments || []).forEach((p) => {
        paymentCounts.set(p.student_id, (paymentCounts.get(p.student_id) || 0) + 1);
      });

      const studentMap = new Map(
        (students || []).map((s) => [s.id, s])
      );

      // Group by group_id
      const groupMap = new Map<number, DuplicateGroup>();
      for (const row of rows) {
        const student = studentMap.get(row.student_id);
        if (!student) continue;

        if (!groupMap.has(row.group_id)) {
          groupMap.set(row.group_id, {
            groupId: row.group_id,
            matchCriteria: row.match_criteria,
            students: [],
          });
        }

        groupMap.get(row.group_id)!.students.push({
          ...student,
          isPrimary: row.is_primary,
          paymentCount: paymentCounts.get(student.id) || 0,
        });
      }

      return Array.from(groupMap.values());
    },
  });
}

export interface SingleDuplicateResult {
  student_id: string;
  student_name: string;
  match_criteria: string;
}

export function useCheckSingleDuplicate(
  phone: string,
  name: string,
  email: string,
  aadhar: string,
  excludeStudentId?: string
) {
  const { activeCompanyId } = useCompany();
  const [results, setResults] = useState<SingleDuplicateResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Only check when all three fields are provided
    const hasInput = phone.trim() && name.trim() && email.trim();

    if (!hasInput || !activeCompanyId) {
      setResults([]);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setIsChecking(true);
      try {
        const { data, error } = await supabase.rpc(
          "check_student_duplicates_single",
          {
            _company_id: activeCompanyId,
            _phone: phone || null,
            _name: name || null,
            _email: email || null,
            _aadhar: aadhar || null,
            _exclude_student_id: excludeStudentId || null,
          }
        );
        if (!error && data) {
          setResults(data as unknown as SingleDuplicateResult[]);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setIsChecking(false);
      }
    }, 800);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [phone, name, email, aadhar, activeCompanyId, excludeStudentId]);

  return { results, isChecking };
}

export function useDismissDuplicate() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  return useMutation({
    mutationFn: async ({
      studentIdA,
      studentIdB,
    }: {
      studentIdA: string;
      studentIdB: string;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      // Sort IDs to ensure consistent storage
      const [a, b] = [studentIdA, studentIdB].sort();
      const { error } = await supabase.from("duplicate_dismissals").insert({
        company_id: activeCompanyId,
        student_id_a: a,
        student_id_b: b,
        dismissed_by: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["duplicate-students"],
      });
    },
  });
}

export function useMergeStudents() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  return useMutation({
    mutationFn: async ({
      primaryStudentId,
      duplicateStudentId,
    }: {
      primaryStudentId: string;
      duplicateStudentId: string;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data, error } = await supabase.functions.invoke(
        "merge-students",
        {
          body: {
            primary_student_id: primaryStudentId,
            duplicate_student_id: duplicateStudentId,
            company_id: activeCompanyId,
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["duplicate-students"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
