import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { endOfMonth, format as fnsFormat } from "date-fns";

export interface Employee {
  id: string;
  company_id: string;
  employee_id_number: string;
  full_name: string;
  profile_picture_url: string | null;
  designation: string | null;
  department: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  contact_number: string;
  whatsapp_number: string | null;
  email: string | null;
  current_address: string | null;
  permanent_address: string | null;
  permanent_address_same: boolean | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  join_date: string;
  employment_type: string;
  employment_status: string;
  monthly_salary: number;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  aadhar_national_id: string | null;
  previous_experience: string | null;
  qualifications: string | null;
  notes: string | null;
  created_by: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeInsert {
  employee_id_number: string;
  full_name: string;
  profile_picture_url?: string | null;
  designation?: string | null;
  department?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  contact_number: string;
  whatsapp_number?: string | null;
  email?: string | null;
  current_address?: string | null;
  permanent_address?: string | null;
  permanent_address_same?: boolean | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  join_date: string;
  employment_type?: string;
  employment_status?: string;
  monthly_salary?: number;
  bank_account_number?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  aadhar_national_id?: string | null;
  previous_experience?: string | null;
  qualifications?: string | null;
  notes?: string | null;
}

export interface SalaryPayment {
  id: string;
  company_id: string;
  employee_id: string;
  amount: number;
  month: string;
  payment_date: string;
  payment_method: string;
  deductions: number;
  net_amount: number;
  description: string | null;
  user_id: string;
  created_at: string;
}

export interface EmployeeAttendance {
  id: string;
  company_id: string;
  employee_id: string;
  date: string;
  status: string;
  marked_by: string;
  created_at: string;
}

export interface EmployeeLeave {
  id: string;
  company_id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  approval_status: string;
  approved_by: string | null;
  user_id: string;
  created_at: string;
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  designation?: string;
  status?: string;
  employmentType?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export function useEmployees(filters?: EmployeeFilters) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const search = filters?.search?.trim() || "";
  const department = filters?.department || "all";
  const designation = filters?.designation || "all";
  const status = filters?.status || "all";
  const employmentType = filters?.employmentType || "all";
  const sortBy = filters?.sortBy || "full_name";
  const sortOrder = (filters?.sortOrder || "asc") === "asc";
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;

  return useQuery({
    queryKey: ["employees", activeCompanyId, { search, department, designation, status, employmentType, sortBy, sortOrder, page, pageSize }],
    queryFn: async () => {
      if (!user || !activeCompanyId) return { data: [], totalCount: 0 };

      let countQuery = supabase.from("employees" as any).select("id", { count: "exact", head: true }).eq("company_id", activeCompanyId);
      let dataQuery = supabase.from("employees" as any).select("*").eq("company_id", activeCompanyId);

      if (status !== "all") {
        countQuery = countQuery.eq("employment_status", status);
        dataQuery = dataQuery.eq("employment_status", status);
      }
      if (department !== "all") {
        countQuery = countQuery.eq("department", department);
        dataQuery = dataQuery.eq("department", department);
      }
      if (designation !== "all") {
        countQuery = countQuery.eq("designation", designation);
        dataQuery = dataQuery.eq("designation", designation);
      }
      if (employmentType !== "all") {
        countQuery = countQuery.eq("employment_type", employmentType);
        dataQuery = dataQuery.eq("employment_type", employmentType);
      }
      if (search) {
        const s = search.replace(/[%_\\]/g, "\\$&");
        const searchFilter = `full_name.ilike.%${s}%,employee_id_number.ilike.%${s}%,contact_number.ilike.%${s}%,email.ilike.%${s}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      dataQuery = dataQuery.order(sortBy, { ascending: sortOrder });
      const from = (page - 1) * pageSize;
      dataQuery = dataQuery.range(from, from + pageSize - 1);

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);
      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      return { data: (dataResult.data as unknown) as Employee[], totalCount: countResult.count || 0 };
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useEmployee(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employees", id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data, error } = await supabase.from("employees" as any).select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as Employee;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateEmployee() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (emp: EmployeeInsert) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase.from("employees" as any).insert({ ...emp, company_id: activeCompanyId, user_id: user.id, created_by: user.id }).select().single();
      if (error) throw error;
      return data as unknown as Employee;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployeeInsert> & { id: string }) => {
      const { data, error } = await supabase.from("employees" as any).update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as unknown as Employee;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employees", data.id] });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); },
  });
}

// Next employee ID
export function useNextEmployeeId() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["employees", "next-id", activeCompanyId],
    queryFn: async () => {
      if (!user || !activeCompanyId) return "EMP-001";
      const { data, error } = await supabase.from("employees" as any).select("employee_id_number").eq("company_id", activeCompanyId).order("created_at", { ascending: false }).limit(1);
      if (error || !data || data.length === 0) return "EMP-001";
      const last = (data[0] as any).employee_id_number as string;
      const match = last.match(/^EMP-(\d+)$/);
      if (match) {
        const next = parseInt(match[1], 10) + 1;
        return `EMP-${String(next).padStart(3, "0")}`;
      }
      return `EMP-${String((data.length || 0) + 1).padStart(3, "0")}`;
    },
    enabled: !!user && !!activeCompanyId,
  });
}

// Salary payments
export function useEmployeeSalaryPayments(employeeId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employee-salary", employeeId],
    queryFn: async () => {
      if (!user || !employeeId) return [];
      const { data, error } = await supabase.from("employee_salary_payments" as any).select("*").eq("employee_id", employeeId).order("month", { ascending: false });
      if (error) throw error;
      return (data as unknown) as SalaryPayment[];
    },
    enabled: !!user && !!employeeId,
  });
}

export function useCreateSalaryPayment() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: { employee_id: string; amount: number; month: string; payment_date: string; payment_method: string; deductions?: number; net_amount: number; description?: string }) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase.from("employee_salary_payments" as any).insert({ ...payment, company_id: activeCompanyId, user_id: user.id }).select().single();
      if (error) throw error;
      return data as unknown as SalaryPayment;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["employee-salary", vars.employee_id] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useDeleteSalaryPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { error } = await supabase.from("employee_salary_payments" as any).delete().eq("id", id);
      if (error) throw error;
      return employeeId;
    },
    onSuccess: (employeeId) => {
      qc.invalidateQueries({ queryKey: ["employee-salary", employeeId] });
    },
  });
}

// Attendance
export function useEmployeeAttendance(employeeId: string | undefined, month?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employee-attendance", employeeId, month],
    queryFn: async () => {
      if (!user || !employeeId) return [];
      let query = supabase.from("employee_attendance" as any).select("*").eq("employee_id", employeeId);
      if (month) {
        const lastDay = fnsFormat(endOfMonth(new Date(`${month}-01`)), "yyyy-MM-dd");
        query = query.gte("date", `${month}-01`).lte("date", lastDay);
      }
      const { data, error } = await query.order("date", { ascending: true });
      if (error) throw error;
      return (data as unknown) as EmployeeAttendance[];
    },
    enabled: !!user && !!employeeId,
  });
}

export function useMarkAttendance() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: { employee_id: string; date: string; status: string }) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase.from("employee_attendance" as any).upsert({ ...record, company_id: activeCompanyId, marked_by: user.id }, { onConflict: "company_id,employee_id,date" }).select().single();
      if (error) throw error;
      return data as unknown as EmployeeAttendance;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["employee-attendance", vars.employee_id] });
    },
  });
}

// Leaves
export function useEmployeeLeaves(employeeId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["employee-leaves", employeeId],
    queryFn: async () => {
      if (!user || !employeeId) return [];
      const { data, error } = await supabase.from("employee_leaves" as any).select("*").eq("employee_id", employeeId).order("start_date", { ascending: false });
      if (error) throw error;
      return (data as unknown) as EmployeeLeave[];
    },
    enabled: !!user && !!employeeId,
  });
}

export function useCreateLeave() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leave: { employee_id: string; leave_type: string; start_date: string; end_date: string; reason?: string }) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase.from("employee_leaves" as any).insert({ ...leave, company_id: activeCompanyId, user_id: user.id, approved_by: user.id, approval_status: "approved" }).select().single();
      if (error) throw error;
      return data as unknown as EmployeeLeave;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["employee-leaves", vars.employee_id] });
    },
  });
}

export function useDeleteLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { error } = await supabase.from("employee_leaves" as any).delete().eq("id", id);
      if (error) throw error;
      return employeeId;
    },
    onSuccess: (employeeId) => {
      qc.invalidateQueries({ queryKey: ["employee-leaves", employeeId] });
    },
  });
}
