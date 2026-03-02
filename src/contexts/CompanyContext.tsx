import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, setForcedLogoutInProgress } from "@/contexts/AuthContext";
import { logger } from "@/utils/logger";

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
  role: "admin" | "moderator";
  data_entry_mode: boolean;
  // Legacy fields kept for backward compat
  can_add_revenue: boolean;
  can_add_expense: boolean;
  can_add_expense_source: boolean;
  can_transfer: boolean;
  can_view_reports: boolean;
  can_manage_students: boolean;
  can_view_employees: boolean;
  // Data Entry Mode category permissions
  deo_students: boolean;
  deo_payments: boolean;
  deo_batches: boolean;
  deo_finance: boolean;
  // Granular mod_* permissions (for traditional moderator)
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
  // NEW: Employee permissions
  mod_employees_add: boolean;
  mod_employees_edit: boolean;
  mod_employees_delete: boolean;
  mod_employees_salary: boolean;
  // NEW: View permissions
  mod_view_courses: boolean;
  mod_view_batches: boolean;
  mod_view_revenue: boolean;
  mod_view_expenses: boolean;
  mod_view_employees: boolean;
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
  companyLoading: boolean;
  hasCompanies: boolean;

  // Platform-level
  isCipher: boolean;

  // Company-level role checks
  isCompanyAdmin: boolean;
  isModerator: boolean;
  isDataEntryModerator: boolean;
  isTraditionalModerator: boolean;

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

  // Data Entry Mode category permissions
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
  canAddCourse: boolean;
  canEditCourse: boolean;
  canDeleteCourse: boolean;
  canEditRevenue: boolean;
  canDeleteRevenue: boolean;
  canEditExpense: boolean;
  canDeleteExpense: boolean;
  canViewRevenue: boolean;
  canViewExpense: boolean;
  canViewStudentPII: boolean;
  canViewEmployees: boolean;
  canManageEmployees: boolean;

  // NEW: Employee granular permissions
  canAddEmployee: boolean;
  canEditEmployee: boolean;
  canDeleteEmployee: boolean;
  canManageSalary: boolean;

  // NEW: View permissions
  canViewCourses: boolean;
  canViewBatches: boolean;

  // Data entry mode specific
  canViewDashboardMetrics: boolean;
  canViewPaymentHistory: boolean;
  canViewFinancialData: boolean;

  // Actions
  switchCompany: (companyId: string) => Promise<void>;
  refetch: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user has ANY role in user_roles (deletion fallback)
  const { data: userRoleExists, isFetched: userRoleFetched } = useQuery({
    queryKey: ["check-user-exists", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
    refetchInterval: 10 * 1000,
  });

  // Fallback: if user has no role at all, they were deleted — force logout
  useEffect(() => {
    if (userRoleFetched && !userRoleExists && user) {
      setForcedLogoutInProgress(true);
      supabase.auth.signOut({ scope: 'local' }).then(() => {
        window.location.replace('/auth');
      });
    }
  }, [userRoleFetched, userRoleExists, user]);

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
  const isModerator = membership?.role === "moderator" && !isCompanyAdmin;
  const isDataEntryModerator = isModerator && (membership?.data_entry_mode ?? false);
  const isTraditionalModerator = isModerator && !(membership?.data_entry_mode ?? false);

  // Data Entry Mode category permissions
  const deoStudents = membership?.deo_students ?? false;
  const deoPayments = membership?.deo_payments ?? false;
  const deoBatches = membership?.deo_batches ?? false;
  const deoFinance = membership?.deo_finance ?? false;

  // Derived granular permissions
  const canAddStudent = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_students_add ?? false)) || (isDataEntryModerator && deoStudents);
  const canEditStudent = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_students_edit ?? false)) || (isDataEntryModerator && deoStudents);
  const canDeleteStudent = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_students_delete ?? false)) || (isDataEntryModerator && deoStudents);

  const canAddPayment = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_payments_add ?? false));
  const canEditPayment = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_payments_edit ?? false));
  const canDeletePayment = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_payments_delete ?? false));

  const canAddBatch = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_batches_add ?? false)) || (isDataEntryModerator && deoBatches);
  const canEditBatch = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_batches_edit ?? false)) || (isDataEntryModerator && deoBatches);
  const canDeleteBatch = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_batches_delete ?? false)) || (isDataEntryModerator && deoBatches);

  // Courses are Admin/Cipher only
  const canAddCourse = isCompanyAdmin;
  const canEditCourse = isCompanyAdmin;
  const canDeleteCourse = isCompanyAdmin;

  const canAddRevenue = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_revenue_add ?? false)) || (isDataEntryModerator && deoFinance);
  const canEditRevenue = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_revenue_edit ?? false)) || (isDataEntryModerator && deoFinance);
  const canDeleteRevenue = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_revenue_delete ?? false)) || (isDataEntryModerator && deoFinance);

  const canAddExpense = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_expenses_add ?? false)) || (isDataEntryModerator && deoFinance);
  const canEditExpense = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_expenses_edit ?? false)) || (isDataEntryModerator && deoFinance);
  const canDeleteExpense = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_expenses_delete ?? false)) || (isDataEntryModerator && deoFinance);

  const canAddExpenseSource = isCompanyAdmin;
  const canTransfer = isCompanyAdmin || (isTraditionalModerator && (membership?.can_transfer ?? false));
  const canViewReports = isCompanyAdmin;
  const canManageStudents = isCompanyAdmin || canAddStudent || canEditStudent;
  const canEdit = isCompanyAdmin;
  const canDelete = isCompanyAdmin;
  const canManageMembers = isCompanyAdmin;
  const canViewMembers = isCompanyAdmin || isTraditionalModerator;

  // NEW: View permissions
  const canViewRevenue = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_view_revenue ?? false)) || (isDataEntryModerator && deoFinance);
  const canViewExpense = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_view_expenses ?? false)) || (isDataEntryModerator && deoFinance);

  // Payment view auto-grants course/batch view
  const hasAnyPaymentPerm = isTraditionalModerator && ((membership?.mod_payments_add ?? false) || (membership?.mod_payments_edit ?? false) || (membership?.mod_payments_delete ?? false));
  const canViewCourses = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_view_courses ?? false)) || hasAnyPaymentPerm;
  const canViewBatches = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_view_batches ?? false)) || hasAnyPaymentPerm;

  const canViewStudentPII = isCompanyAdmin;
  const canManageEmployees = isCompanyAdmin;
  const canViewEmployees = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_view_employees ?? false)) || (isModerator && (membership?.can_view_employees ?? false));

  // NEW: Employee granular permissions
  const canAddEmployee = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_employees_add ?? false));
  const canEditEmployee = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_employees_edit ?? false));
  const canDeleteEmployee = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_employees_delete ?? false));
  const canManageSalary = isCompanyAdmin || (isTraditionalModerator && (membership?.mod_employees_salary ?? false));

  // Data entry mode specific visibility
  const canViewDashboardMetrics = isCompanyAdmin;
  const canViewPaymentHistory = !isDataEntryModerator;
  const canViewFinancialData = !isDataEntryModerator;

  const isLoading = cipherLoading || profileLoading || membershipsLoading || companiesLoading;

  const switchCompany = useCallback(async (companyId: string) => {
    if (!user?.id) return;
    const isMember = memberships.some(m => m.company_id === companyId && m.status === "active");
    if (!isMember && !isCipher) {
      logger.error("Cannot switch to company: not a member");
      return;
    }
    const { error } = await supabase
      .from("user_profiles")
      .update({ active_company_id: companyId })
      .eq("user_id", user.id);
    if (error) {
      logger.error("Failed to switch company:", error.message);
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
      companyLoading: isLoading,
      hasCompanies: companies.length > 0,
      isCipher,
      isCompanyAdmin,
      isModerator,
      isDataEntryModerator,
      isTraditionalModerator,

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
      canAddCourse,
      canEditCourse,
      canDeleteCourse,
      canEditRevenue,
      canDeleteRevenue,
      canEditExpense,
      canDeleteExpense,
      canViewRevenue,
      canViewExpense,
      canViewStudentPII,
      canViewEmployees,
      canManageEmployees,
      canAddEmployee,
      canEditEmployee,
      canDeleteEmployee,
      canManageSalary,
      canViewCourses,
      canViewBatches,
      canViewDashboardMetrics,
      canViewPaymentHistory,
      canViewFinancialData,
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