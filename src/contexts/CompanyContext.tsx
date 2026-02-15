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
  // Legacy moderator permissions (kept for backward compat on can_transfer/can_view_reports)
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
  // Moderator granular permissions (5 categories x 3 actions)
  mod_students_add: boolean;
  mod_students_edit: boolean;
  mod_students_delete: boolean;
  mod_payments_add: boolean;
  mod_payments_edit: boolean;
  mod_payments_delete: boolean;
  mod_batches_add: boolean;
  mod_batches_edit: boolean;
  mod_batches_delete: boolean;
  mod_revenue_add: boolean;
  mod_revenue_edit: boolean;
  mod_revenue_delete: boolean;
  mod_expenses_add: boolean;
  mod_expenses_edit: boolean;
  mod_expenses_delete: boolean;
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

  // Granular permissions
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

  // Derived granular permissions
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

  // Fetch all companies the user is a member of
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

  // Moderator granular permissions
  const modStudents = isCompanyModerator ? {
    add: membership?.mod_students_add ?? false,
    edit: membership?.mod_students_edit ?? false,
    del: membership?.mod_students_delete ?? false,
  } : { add: false, edit: false, del: false };

  const modPayments = isCompanyModerator ? {
    add: membership?.mod_payments_add ?? false,
    edit: membership?.mod_payments_edit ?? false,
    del: membership?.mod_payments_delete ?? false,
  } : { add: false, edit: false, del: false };

  const modBatches = isCompanyModerator ? {
    add: membership?.mod_batches_add ?? false,
    edit: membership?.mod_batches_edit ?? false,
    del: membership?.mod_batches_delete ?? false,
  } : { add: false, edit: false, del: false };

  const modRevenue = isCompanyModerator ? {
    add: membership?.mod_revenue_add ?? false,
    edit: membership?.mod_revenue_edit ?? false,
    del: membership?.mod_revenue_delete ?? false,
  } : { add: false, edit: false, del: false };

  const modExpenses = isCompanyModerator ? {
    add: membership?.mod_expenses_add ?? false,
    edit: membership?.mod_expenses_edit ?? false,
    del: membership?.mod_expenses_delete ?? false,
  } : { add: false, edit: false, del: false };

  // DEO category permissions
  const deoStudents = membership?.deo_students ?? false;
  const deoPayments = membership?.deo_payments ?? false;
  const deoBatches = membership?.deo_batches ?? false;
  const deoFinance = membership?.deo_finance ?? false;

  // Viewer has no mutation permissions
  const viewerBlock = isCompanyViewer;

  // Derived granular permissions
  const canAddStudent = !viewerBlock && (isCompanyAdmin || modStudents.add || (isDataEntryOperator && deoStudents));
  const canEditStudent = !viewerBlock && (isCompanyAdmin || modStudents.edit || (isDataEntryOperator && deoStudents));
  const canDeleteStudent = !viewerBlock && (isCompanyAdmin || modStudents.del || (isDataEntryOperator && deoStudents));

  const canAddPayment = !viewerBlock && (isCompanyAdmin || modPayments.add || (isDataEntryOperator && deoPayments));
  const canEditPayment = !viewerBlock && (isCompanyAdmin || modPayments.edit || (isDataEntryOperator && deoPayments));
  const canDeletePayment = !viewerBlock && (isCompanyAdmin || modPayments.del || (isDataEntryOperator && deoPayments));

  const canAddBatch = !viewerBlock && (isCompanyAdmin || modBatches.add || (isDataEntryOperator && deoBatches));
  const canEditBatch = !viewerBlock && (isCompanyAdmin || modBatches.edit || (isDataEntryOperator && deoBatches));
  const canDeleteBatch = !viewerBlock && (isCompanyAdmin || modBatches.del || (isDataEntryOperator && deoBatches));

  const canAddRevenue = !viewerBlock && (isCompanyAdmin || modRevenue.add || (isDataEntryOperator && deoFinance));
  const canEditRevenue = !viewerBlock && (isCompanyAdmin || modRevenue.edit || (isDataEntryOperator && deoFinance));
  const canDeleteRevenue = !viewerBlock && (isCompanyAdmin || modRevenue.del || (isDataEntryOperator && deoFinance));

  const canAddExpense = !viewerBlock && (isCompanyAdmin || modExpenses.add || (isDataEntryOperator && deoFinance));
  const canEditExpense = !viewerBlock && (isCompanyAdmin || modExpenses.edit || (isDataEntryOperator && deoFinance));
  const canDeleteExpense = !viewerBlock && (isCompanyAdmin || modExpenses.del || (isDataEntryOperator && deoFinance));

  const canAddExpenseSource = !viewerBlock && (isCompanyAdmin || modExpenses.add);
  const canTransfer = !viewerBlock && (isCompanyAdmin || (isCompanyModerator && (membership?.can_transfer ?? false)));
  const canViewReports = isCompanyAdmin || isCompanyModerator || isCompanyViewer;
  const canManageStudents = !viewerBlock && (isCompanyAdmin || modStudents.add);
  const canEdit = isCompanyAdmin;
  const canDelete = isCompanyAdmin;
  const canManageMembers = isCompanyAdmin;
  const canViewMembers = isCompanyAdmin || isCompanyModerator;
  const canViewRevenue = isCompanyAdmin || isCompanyModerator || isCompanyViewer || (isDataEntryOperator && deoFinance);
  const canViewExpense = isCompanyAdmin || isCompanyModerator || isCompanyViewer || (isDataEntryOperator && deoFinance);

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
