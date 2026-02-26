import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import type { Stakeholder, Investment, ProfitDistribution, Loan, LoanRepayment } from "@/types/stakeholders";

const TABLES = {
  stakeholders: "stakeholders" as const,
  investments: "investments" as const,
  profit_distributions: "profit_distributions" as const,
  loans: "loans" as const,
  loan_repayments: "loan_repayments" as const,
};

// ─── Stakeholders ─────────────────────────────────────────────
export function useStakeholders(typeFilter?: "investor" | "lender") {
  const { user } = useAuth();
  const { activeCompanyId, isCipher } = useCompany();

  return useQuery({
    queryKey: ["stakeholders", activeCompanyId, typeFilter],
    queryFn: async () => {
      let q = supabase
        .from(TABLES.stakeholders)
        .select("*")
        .eq("company_id", activeCompanyId!)
        .order("created_at", { ascending: false });
      if (typeFilter) q = q.eq("stakeholder_type", typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Stakeholder[];
    },
    enabled: !!user && !!activeCompanyId && isCipher,
  });
}

export function useStakeholder(id: string | undefined) {
  const { user } = useAuth();
  const { activeCompanyId, isCipher } = useCompany();

  return useQuery({
    queryKey: ["stakeholder", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.stakeholders)
        .select("*")
        .eq("id", id!)
        .eq("company_id", activeCompanyId!)
        .single();
      if (error) throw error;
      return data as unknown as Stakeholder;
    },
    enabled: !!user && !!id && !!activeCompanyId && isCipher,
  });
}

export function useSaveStakeholder() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Record<string, any> }) => {
      if (id) {
        const { error } = await supabase.from(TABLES.stakeholders).update(data as any).eq("id", id);
        if (error) throw error;
      } else {
        const row = { ...data, company_id: activeCompanyId, user_id: user!.id } as any;
        const { error } = await supabase.from(TABLES.stakeholders).insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stakeholders"] }),
  });
}

export function useDeleteStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.stakeholders).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stakeholders"] }),
  });
}

// ─── Investments ──────────────────────────────────────────────
export function useInvestments(stakeholderId?: string) {
  const { user } = useAuth();
  const { activeCompanyId, isCipher } = useCompany();

  return useQuery({
    queryKey: ["investments", activeCompanyId, stakeholderId],
    queryFn: async () => {
      let q = supabase.from(TABLES.investments).select("*").eq("company_id", activeCompanyId!).order("investment_date", { ascending: false });
      if (stakeholderId) q = q.eq("stakeholder_id", stakeholderId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Investment[];
    },
    enabled: !!user && !!activeCompanyId && isCipher,
  });
}

export function useSaveInvestment() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Record<string, any> }) => {
      if (id) {
        const { error } = await supabase.from(TABLES.investments).update(data as any).eq("id", id);
        if (error) throw error;
      } else {
        const row = { ...data, company_id: activeCompanyId, user_id: user!.id } as any;
        const { error } = await supabase.from(TABLES.investments).insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["investments"] });
      qc.invalidateQueries({ queryKey: ["stakeholders"] });
    },
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.investments).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investments"] }),
  });
}

// ─── Profit Distributions ─────────────────────────────────────
export function useProfitDistributions(investmentId?: string) {
  const { user } = useAuth();
  const { activeCompanyId, isCipher } = useCompany();

  return useQuery({
    queryKey: ["profit_distributions", activeCompanyId, investmentId],
    queryFn: async () => {
      let q = supabase.from(TABLES.profit_distributions).select("*").eq("company_id", activeCompanyId!).order("distribution_date", { ascending: false });
      if (investmentId) q = q.eq("investment_id", investmentId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as ProfitDistribution[];
    },
    enabled: !!user && !!activeCompanyId && isCipher,
  });
}

export function useSaveProfitDistribution() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const row = { ...data, company_id: activeCompanyId, distributed_by: user!.id } as any;
      const { error } = await supabase.from(TABLES.profit_distributions).insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profit_distributions"] });
      qc.invalidateQueries({ queryKey: ["investments"] });
    },
  });
}

// ─── Loans ────────────────────────────────────────────────────
export function useLoans(stakeholderId?: string) {
  const { user } = useAuth();
  const { activeCompanyId, isCipher } = useCompany();

  return useQuery({
    queryKey: ["loans", activeCompanyId, stakeholderId],
    queryFn: async () => {
      let q = supabase.from(TABLES.loans).select("*").eq("company_id", activeCompanyId!).order("loan_date", { ascending: false });
      if (stakeholderId) q = q.eq("stakeholder_id", stakeholderId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Loan[];
    },
    enabled: !!user && !!activeCompanyId && isCipher,
  });
}

export function useSaveLoan() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Record<string, any> }) => {
      if (id) {
        const { error } = await supabase.from(TABLES.loans).update(data as any).eq("id", id);
        if (error) throw error;
      } else {
        const row = { ...data, company_id: activeCompanyId, user_id: user!.id } as any;
        const { error } = await supabase.from(TABLES.loans).insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["stakeholders"] });
    },
  });
}

export function useDeleteLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.loans).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loans"] }),
  });
}

// ─── Loan Repayments ──────────────────────────────────────────
export function useLoanRepayments(loanId?: string) {
  const { user } = useAuth();
  const { activeCompanyId, isCipher } = useCompany();

  return useQuery({
    queryKey: ["loan_repayments", activeCompanyId, loanId],
    queryFn: async () => {
      let q = supabase.from(TABLES.loan_repayments).select("*").eq("company_id", activeCompanyId!).order("repayment_date", { ascending: false });
      if (loanId) q = q.eq("loan_id", loanId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as LoanRepayment[];
    },
    enabled: !!user && !!activeCompanyId && isCipher,
  });
}

export function useSaveLoanRepayment() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const row = { ...data, company_id: activeCompanyId, recorded_by: user!.id } as any;
      const { error: repError } = await supabase.from(TABLES.loan_repayments).insert(row);
      if (repError) throw repError;

      // Update loan remaining_balance
      const newBalance = data.remaining_balance as number;
      const updateData: Record<string, any> = { remaining_balance: newBalance };
      if (newBalance <= 0) updateData.status = "paid_off";
      
      const { error: loanErr } = await supabase.from(TABLES.loans).update(updateData).eq("id", data.loan_id);
      if (loanErr) throw loanErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loan_repayments"] });
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["stakeholders"] });
    },
  });
}
