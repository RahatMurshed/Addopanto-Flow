import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface StudentPayment {
  id: string;
  student_id: string;
  payment_date: string;
  amount: number;
  payment_type: "admission" | "monthly";
  payment_method: string;
  months_covered: string[] | null;
  receipt_number: string | null;
  description: string | null;
  user_id: string;
  company_id: string;
  created_at: string;
}

export interface StudentPaymentInsert {
  student_id: string;
  payment_date: string;
  amount: number;
  payment_type: "admission" | "monthly";
  payment_method: string;
  months_covered?: string[] | null;
  receipt_number?: string | null;
  description?: string | null;
}

export function useStudentPayments(studentId?: string) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["student_payments", activeCompanyId, studentId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("student_payments")
        .select("*")
        .order("payment_date", { ascending: false });
      if (studentId) {
        query = query.eq("student_id", studentId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as StudentPayment[];
    },
    enabled: !!user,
  });
}

export function useCreateStudentPayment() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: StudentPaymentInsert & { studentName?: string }) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { studentName, ...paymentData } = payment;

      // Insert student payment — the database trigger automatically creates
      // the linked revenue entry and allocations
      const { data, error } = await supabase
        .from("student_payments")
        .insert({ ...paymentData, user_id: user.id, company_id: activeCompanyId } as any)
        .select()
        .single();
      if (error) throw error;

      return data as StudentPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student_payments"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
    },
  });
}

export function useUpdateStudentPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<StudentPaymentInsert> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from("student_payments")
        .update(data as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return updated as StudentPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student_payments"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
    },
  });
}

export function useDeleteStudentPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("student_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student_payments"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
    },
  });
}

// Monthly fee history
export interface MonthlyFeeHistory {
  id: string;
  student_id: string;
  monthly_amount: number;
  effective_from: string;
  user_id: string;
  created_at: string;
}

export function useMonthlyFeeHistory(studentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["monthly_fee_history", studentId],
    queryFn: async () => {
      if (!user || !studentId) return [];
      const { data, error } = await supabase
        .from("monthly_fee_history")
        .select("*")
        .eq("student_id", studentId)
        .order("effective_from", { ascending: true });
      if (error) throw error;
      return data as MonthlyFeeHistory[];
    },
    enabled: !!user && !!studentId,
  });
}

// Helper: compute student payment summary
export interface StudentSummary {
  admissionPaid: number;
  admissionTotal: number;
  admissionPending: number;
  admissionStatus: "paid" | "partial" | "pending";
  monthlyPaidMonths: string[];
  monthlyPartialMonths: string[];
  monthlyOverdueMonths: string[];
  monthlyPendingMonths: string[];
  monthlyPaymentsByMonth: Map<string, number>;
  monthlyPaidTotal: number;
  monthlyPendingTotal: number;
  totalPaid: number;
  totalPending: number;
  totalExpected: number;
  overallPercent: number;
}

export function computeStudentSummary(
  student: { admission_fee_total: number; monthly_fee_amount: number; billing_start_month: string; status: string; course_start_month?: string | null; course_end_month?: string | null },
  payments: StudentPayment[],
  feeHistory: MonthlyFeeHistory[] = []
): StudentSummary {
  const admissionPayments = payments.filter((p) => p.payment_type === "admission");
  const admissionPaid = admissionPayments.reduce((s, p) => s + Number(p.amount), 0);
  const admissionTotal = Number(student.admission_fee_total);
  const admissionStatus: "paid" | "partial" | "pending" =
    admissionPaid >= admissionTotal && admissionTotal > 0
      ? "paid"
      : admissionPaid > 0
      ? "partial"
      : admissionTotal > 0
      ? "pending"
      : "paid";

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const billingStart = student.billing_start_month;

  const allMonths: string[] = [];
  if (billingStart && student.monthly_fee_amount > 0) {
    let [year, month] = billingStart.split("-").map(Number);
    const courseEnd = student.course_end_month || currentMonth;
    const endBound = courseEnd > currentMonth ? courseEnd : currentMonth;
    let cursor = billingStart;
    while (cursor <= endBound) {
      allMonths.push(cursor);
      month++;
      if (month > 12) { month = 1; year++; }
      cursor = `${year}-${String(month).padStart(2, "0")}`;
    }
  }

  const monthlyPayments = payments.filter((p) => p.payment_type === "monthly");
  const paidMonthsSet = new Set<string>();
  
  const monthPaymentTotals = new Map<string, number>();
  for (const p of monthlyPayments) {
    if (p.months_covered) {
      for (const m of p.months_covered) {
        monthPaymentTotals.set(m, (monthPaymentTotals.get(m) || 0) + Number(p.amount) / p.months_covered.length);
      }
    }
  }

  const getFeeForMonth = (month: string): number => {
    if (feeHistory.length === 0) return Number(student.monthly_fee_amount);
    let fee = Number(student.monthly_fee_amount);
    for (const h of feeHistory) {
      if (h.effective_from <= month) {
        fee = Number(h.monthly_amount);
      }
    }
    return fee;
  };

  const monthlyPaidMonths: string[] = [];
  const monthlyPartialMonths: string[] = [];
  const monthlyOverdueMonths: string[] = [];
  const monthlyPendingMonths: string[] = [];
  const monthlyPaymentsByMonth = new Map<string, number>();

  for (const m of allMonths) {
    const fee = getFeeForMonth(m);
    const paid = monthPaymentTotals.get(m) || 0;
    monthlyPaymentsByMonth.set(m, paid);
    if (paid >= fee) {
      monthlyPaidMonths.push(m);
      paidMonthsSet.add(m);
    } else if (paid > 0) {
      monthlyPartialMonths.push(m);
    } else if (m < currentMonth) {
      monthlyOverdueMonths.push(m);
    } else {
      monthlyPendingMonths.push(m);
    }
  }

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const monthlyPaidTotal = monthlyPayments.reduce((s, p) => s + Number(p.amount), 0);
  let monthlyPendingTotal = 0;
  for (const m of [...monthlyPartialMonths, ...monthlyOverdueMonths, ...monthlyPendingMonths]) {
    const fee = getFeeForMonth(m);
    const paid = monthlyPaymentsByMonth.get(m) || 0;
    monthlyPendingTotal += (fee - paid);
  }

  const admissionPending = Math.max(0, admissionTotal - admissionPaid);
  const totalPending = admissionPending + monthlyPendingTotal;

  let totalExpectedMonthly = 0;
  for (const m of allMonths) {
    totalExpectedMonthly += getFeeForMonth(m);
  }
  const totalExpected = admissionTotal + totalExpectedMonthly;
  const overallPercent = totalExpected > 0 ? Math.min(100, (totalPaid / totalExpected) * 100) : 0;

  return {
    admissionPaid,
    admissionTotal,
    admissionPending,
    admissionStatus,
    monthlyPaidMonths,
    monthlyPartialMonths,
    monthlyOverdueMonths,
    monthlyPendingMonths,
    monthlyPaymentsByMonth,
    monthlyPaidTotal,
    monthlyPendingTotal,
    totalPaid,
    totalPending,
    totalExpected,
    overallPercent,
  };
}
