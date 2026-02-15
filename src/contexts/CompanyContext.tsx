import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  currency: string;
  exchange_rate: number;
  base_currency: string;
  fiscal_year_start_month: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyMembership {
  id: string;
  user_id: string;
  company_id: string;
  role: "admin" | "moderator" | "viewer" | "data_entry_operator";
  // Moderator-level permissions (shared between moderator & admin)
  can_add_revenue: boolean;
  can_add_expense: boolean;
  can_add_expense_source: boolean;
  can_transfer: boolean;
  can_view_reports: boolean;
  can_manage_students: boolean;
  // DEO category permissions
  deo_students: boolean;
  deo_payments: boolean;
  deo_batches: boolean;
  deo_finance: boolean;
  status: string;
  joined_at: string;
  approved_by: string | null;
}

interface CompanyContextType {
  // Company data
  activeCompany: Company | null;
  activeCompanyId: string | null;
  membership: CompanyMembership | null;
  companies: Company[];
  memberships: CompanyMembership[];
  isLoading: boolean;
  hasCompanies: boolean;

  // Platform-level
  isCipher: boolean;

  // Company-level role checks
  isCompanyAdmin: boolean;
  isCompanyModerator: boolean;
  isCompanyViewer: boolean;
  isDataEntryOperator: boolean;

  // Granular permissions (admin always has all)
  canAddRevenue: boolean;
  canAddExpense: boolean;
  canAddExpenseSource: boolean;
  canTransfer: boolean;
  canViewReports: boolean;
  canManageStudents: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
  canViewMembers: boolean;

  // DEO category permissions
  deoStudents: boolean;
  deoPayments: boolean;
  deoBatches: boolean;
  deoFinance: boolean;

  // Derived granular permissions (backward compat)
  canAddStudent: boolean;
  canEditStudent: boolean;
  canDeleteStudent: boolean;
  canAddPayment: boolean;
  canEditPayment: boolean;
  canDeletePayment: boolean;
  canAddBatch: boolean;
  canEditBatch: boolean;
  canDeleteBatch: boolean;
  canEditRevenue: boolean;
  canDeleteRevenue: boolean;
  canEditExpense: boolean;
  canDeleteExpense: boolean;
  canViewRevenue: boolean;
  canViewExpense: boolean;

  // Actions
  switchCompany: (companyId: string) => Promise<void>;
  refetch: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user is cipher (platform-level)
  const { data: isCipher = false, isLoading: cipherLoading } = useQuery({
    queryKey: ["is-cipher", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "cipher")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's active_company_id
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("user_profiles")
        .select("active_company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  // Fetch all memberships for the user
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ["company-memberships", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("company_memberships")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (error) throw error;
      return data as CompanyMembership[];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  // Fetch all companies the user is a member of (using public view to hide passwords)
  const companyIds = memberships.map((m) => m.company_id);
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ["user-companies", companyIds],
    queryFn: async () => {
      if (companyIds.length === 0) return [];
      const { data, error } = await (supabase
        .from("companies_public" as any)
        .select("*")
        .in("id", companyIds) as any);
      if (error) throw error;
      return (data ?? []) as Company[];
    },
    enabled: companyIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const activeCompanyId = profileData?.active_company_id ?? null;
  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? null;
  const membership = memberships.find((m) => m.company_id === activeCompanyId) ?? null;

  const isCompanyAdmin = membership?.role === "admin" || isCipher;
  const isCompanyModerator = membership?.role === "moderator";
  const isCompanyViewer = membership?.role === "viewer";
  const isDataEntryOperator = membership?.role === "data_entry_operator";

  // Moderator-level permissions: admin and cipher get everything
  const canAddRevenue = isCompanyAdmin || (membership?.can_add_revenue ?? false) || (isDataEntryOperator && (membership?.deo_finance ?? false));
  const canAddExpense = isCompanyAdmin || (membership?.can_add_expense ?? false) || (isDataEntryOperator && (membership?.deo_finance ?? false));
  const canAddExpenseSource = isCompanyAdmin || (membership?.can_add_expense_source ?? false);
  const canTransfer = isCompanyAdmin || (membership?.can_transfer ?? false);
  const canViewReports = isCompanyAdmin || (membership?.can_view_reports ?? false);
  const canManageStudents = isCompanyAdmin || (membership?.can_manage_students ?? false);
  const canEdit = isCompanyAdmin;
  const canDelete = isCompanyAdmin;
  const canManageMembers = isCompanyAdmin;
  const canViewMembers = isCompanyAdmin || isCompanyModerator;

  // DEO category permissions
  const deoStudents = membership?.deo_students ?? false;
  const deoPayments = membership?.deo_payments ?? false;
  const deoBatches = membership?.deo_batches ?? false;
  const deoFinance = membership?.deo_finance ?? false;

  // Derived granular permissions from DEO categories (backward compat)
  const canAddStudent = isCompanyAdmin || deoStudents;
  const canEditStudent = isCompanyAdmin || deoStudents;
  const canDeleteStudent = isCompanyAdmin || deoStudents;
  const canAddPayment = isCompanyAdmin || deoPayments;
  const canEditPayment = isCompanyAdmin || deoPayments;
  const canDeletePayment = isCompanyAdmin || deoPayments;
  const canAddBatch = isCompanyAdmin || deoBatches;
  const canEditBatch = isCompanyAdmin || deoBatches;
  const canDeleteBatch = isCompanyAdmin || deoBatches;
  const canEditRevenue = isCompanyAdmin || deoFinance;
  const canDeleteRevenue = isCompanyAdmin || deoFinance;
  const canEditExpense = isCompanyAdmin || deoFinance;
  const canDeleteExpense = isCompanyAdmin || deoFinance;
  const canViewRevenue = isCompanyAdmin || deoFinance;
  const canViewExpense = isCompanyAdmin || deoFinance;

  const isLoading = cipherLoading || profileLoading || membershipsLoading || companiesLoading;

  const switchCompany = useCallback(async (companyId: string) => {
    if (!user?.id) return;
    const isMember = memberships.some(m => m.company_id === companyId && m.status === "active");
    if (!isMember && !isCipher) {
      console.error("Cannot switch to company: not a member");
      return;
    }
    const { error } = await supabase
      .from("user_profiles")
      .update({ active_company_id: companyId })
      .eq("user_id", user.id);
    if (error) {
      console.error("Failed to switch company:", error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["user-profile-company"] });
    queryClient.invalidateQueries();
  }, [user?.id, memberships, isCipher, queryClient]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["company-memberships"] });
    queryClient.invalidateQueries({ queryKey: ["user-companies"] });
    queryClient.invalidateQueries({ queryKey: ["user-profile-company"] });
    queryClient.invalidateQueries({ queryKey: ["is-cipher"] });
  }, [queryClient]);

  return (
    <CompanyContext.Provider value={{
      activeCompany,
      activeCompanyId,
      membership,
      companies,
      memberships,
      isLoading,
      hasCompanies: companies.length > 0,
      isCipher,
      isCompanyAdmin,
      isCompanyModerator,
      isCompanyViewer,
      isDataEntryOperator,
      canAddRevenue,
      canAddExpense,
      canAddExpenseSource,
      canTransfer,
      canViewReports,
      canManageStudents,
      canEdit,
      canDelete,
      canManageMembers,
      canViewMembers,
      deoStudents,
      deoPayments,
      deoBatches,
      deoFinance,
      canAddStudent,
      canEditStudent,
      canDeleteStudent,
      canAddPayment,
      canEditPayment,
      canDeletePayment,
      canAddBatch,
      canEditBatch,
      canDeleteBatch,
      canEditRevenue,
      canDeleteRevenue,
      canEditExpense,
      canDeleteExpense,
      canViewRevenue,
      canViewExpense,
      switchCompany,
      refetch,
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within CompanyProvider");
  }
  return context;
}
