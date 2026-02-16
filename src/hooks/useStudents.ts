import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface Student {
  id: string;
  name: string;
  student_id_number: string | null;
  email: string | null;
  phone: string | null;
  enrollment_date: string;
  billing_start_month: string;
  course_start_month: string | null;
  course_end_month: string | null;
  admission_fee_total: number;
  monthly_fee_amount: number;
  status: "active" | "inactive" | "graduated" | "dropout" | "transferred";
  notes: string | null;
  user_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  // Extended fields
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  religion_category: string | null;
  nationality: string | null;
  aadhar_id_number: string | null;
  whatsapp_number: string | null;
  alt_contact_number: string | null;
  address_house: string | null;
  address_street: string | null;
  address_area: string | null;
  address_city: string | null;
  address_state: string | null;
  address_pin_zip: string | null;
  permanent_address_same: boolean | null;
  perm_address_house: string | null;
  perm_address_street: string | null;
  perm_address_area: string | null;
  perm_address_city: string | null;
  perm_address_state: string | null;
  perm_address_pin_zip: string | null;
  father_name: string | null;
  father_occupation: string | null;
  father_contact: string | null;
  father_annual_income: number | null;
  mother_name: string | null;
  mother_occupation: string | null;
  mother_contact: string | null;
  guardian_name: string | null;
  guardian_contact: string | null;
  guardian_relationship: string | null;
  previous_school: string | null;
  class_grade: string | null;
  roll_number: string | null;
  academic_year: string | null;
  section_division: string | null;
  previous_qualification: string | null;
  previous_percentage: string | null;
  board_university: string | null;
  special_needs_medical: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  transportation_mode: string | null;
  distance_from_institution: string | null;
  extracurricular_interests: string | null;
  language_proficiency: string | null;
  batch_id: string | null;
}

export interface StudentInsert {
  name: string;
  student_id_number?: string | null;
  email?: string | null;
  phone?: string | null;
  enrollment_date: string;
  billing_start_month: string;
  course_start_month?: string | null;
  course_end_month?: string | null;
  admission_fee_total?: number;
  monthly_fee_amount?: number;
  status?: "active" | "inactive" | "graduated" | "dropout" | "transferred";
  notes?: string | null;
  batch_id?: string | null;
  // Extended fields
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  religion_category?: string | null;
  nationality?: string | null;
  aadhar_id_number?: string | null;
  whatsapp_number?: string | null;
  alt_contact_number?: string | null;
  address_house?: string | null;
  address_street?: string | null;
  address_area?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_pin_zip?: string | null;
  permanent_address_same?: boolean | null;
  perm_address_house?: string | null;
  perm_address_street?: string | null;
  perm_address_area?: string | null;
  perm_address_city?: string | null;
  perm_address_state?: string | null;
  perm_address_pin_zip?: string | null;
  father_name?: string | null;
  father_occupation?: string | null;
  father_contact?: string | null;
  father_annual_income?: number | null;
  mother_name?: string | null;
  mother_occupation?: string | null;
  mother_contact?: string | null;
  guardian_name?: string | null;
  guardian_contact?: string | null;
  guardian_relationship?: string | null;
  previous_school?: string | null;
  class_grade?: string | null;
  roll_number?: string | null;
  academic_year?: string | null;
  section_division?: string | null;
  previous_qualification?: string | null;
  previous_percentage?: string | null;
  board_university?: string | null;
  special_needs_medical?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  transportation_mode?: string | null;
  distance_from_institution?: string | null;
  extracurricular_interests?: string | null;
  language_proficiency?: string | null;
}

export interface StudentFilters {
  search?: string;
  status?: "all" | "active" | "inactive" | "graduated" | "dropout" | "transferred";
  sortBy?: "name" | "enrollment_date" | "monthly_fee_amount" | "student_id_number" | "date_of_birth" | "class_grade" | "created_at";
  sortOrder?: "asc" | "desc";
  // Advanced filters
  batchId?: "all" | string;
  gender?: "all" | string;
  classGrade?: string;
  addressCity?: string;
  academicYear?: string;
  // Server-side pagination
  page?: number;
  pageSize?: number;
}

export interface PaginatedStudentsResult {
  data: Student[];
  totalCount: number;
}

export function useStudents(filters?: StudentFilters) {
  const { user } = useAuth();
  const search = filters?.search?.trim() || "";
  const status = filters?.status || "all";
  const sortBy = filters?.sortBy || "name";
  const sortOrder = (filters?.sortOrder || "asc") === "asc";
  const batchId = filters?.batchId || "all";
  const gender = filters?.gender || "all";
  const classGrade = filters?.classGrade?.trim() || "";
  const addressCity = filters?.addressCity?.trim() || "";
  const academicYear = filters?.academicYear?.trim() || "";
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;

  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["students", activeCompanyId, { search, status, sortBy, sortOrder, batchId, gender, classGrade, addressCity, academicYear, page, pageSize }],
    queryFn: async (): Promise<PaginatedStudentsResult> => {
      if (!user) return { data: [], totalCount: 0 };
      if (!activeCompanyId) return { data: [], totalCount: 0 };

      // Build base query for both count and data
      let countQuery = supabase.from("students").select("id", { count: "exact", head: true }).eq("company_id", activeCompanyId);
      let dataQuery = supabase.from("students").select("*").eq("company_id", activeCompanyId);

      // Apply filters to both queries
      if (status !== "all") {
        countQuery = countQuery.eq("status", status);
        dataQuery = dataQuery.eq("status", status);
      }

      if (batchId !== "all") {
        countQuery = countQuery.eq("batch_id", batchId);
        dataQuery = dataQuery.eq("batch_id", batchId);
      }

      if (gender !== "all") {
        countQuery = countQuery.eq("gender", gender);
        dataQuery = dataQuery.eq("gender", gender);
      }

      if (classGrade) {
        const sanitizedClass = classGrade.replace(/[%_\\]/g, '\\$&');
        countQuery = countQuery.ilike("class_grade", `%${sanitizedClass}%`);
        dataQuery = dataQuery.ilike("class_grade", `%${sanitizedClass}%`);
      }

      if (addressCity) {
        const sanitizedCity = addressCity.replace(/[%_\\]/g, '\\$&');
        countQuery = countQuery.ilike("address_city", `%${sanitizedCity}%`);
        dataQuery = dataQuery.ilike("address_city", `%${sanitizedCity}%`);
      }

      if (academicYear) {
        const sanitizedYear = academicYear.replace(/[%_\\]/g, '\\$&');
        countQuery = countQuery.ilike("academic_year", `%${sanitizedYear}%`);
        dataQuery = dataQuery.ilike("academic_year", `%${sanitizedYear}%`);
      }

      if (search) {
        const sanitized = search.replace(/[%_\\]/g, '\\$&');
        const searchFilter = `name.ilike.%${sanitized}%,student_id_number.ilike.%${sanitized}%,father_name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%,mother_name.ilike.%${sanitized}%,whatsapp_number.ilike.%${sanitized}%,alt_contact_number.ilike.%${sanitized}%,email.ilike.%${sanitized}%,address_house.ilike.%${sanitized}%,address_street.ilike.%${sanitized}%,address_area.ilike.%${sanitized}%,address_city.ilike.%${sanitized}%,address_state.ilike.%${sanitized}%,address_pin_zip.ilike.%${sanitized}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      // Sort
      dataQuery = dataQuery.order(sortBy, { ascending: sortOrder });

      // Pagination with .range()
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      dataQuery = dataQuery.range(from, to);

      // Execute both in parallel
      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);
      
      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      return {
        data: dataResult.data as Student[],
        totalCount: countResult.count || 0,
      };
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useStudent(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["students", id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Student;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateStudent() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (student: StudentInsert) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("students")
        .insert({
          ...student,
          user_id: user.id,
          company_id: activeCompanyId,
        })
        .select()
        .single();
      if (error) throw error;

      // Create initial monthly_fee_history entry if monthly fee > 0
      if ((student.monthly_fee_amount || 0) > 0) {
        await supabase.from("monthly_fee_history").insert({
          student_id: data.id,
          monthly_amount: student.monthly_fee_amount!,
          effective_from: student.billing_start_month,
          user_id: user.id,
          company_id: activeCompanyId,
        });
      }

      return data as Student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_fee_history"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StudentInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("students")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Student;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students", data.id] });
      queryClient.invalidateQueries({ queryKey: ["student_payments"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_summary"] });
      queryClient.invalidateQueries({ queryKey: ["expense_summary"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_fee_history"] });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student_payments"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
      queryClient.invalidateQueries({ queryKey: ["account_balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["revenue_summary"] });
      queryClient.invalidateQueries({ queryKey: ["expense_summary"] });
    },
  });
}

/**
 * Non-paginated hook for pages that need all students (Batches, Courses, CommandPalette, etc.)
 * Returns Student[] for backward compatibility.
 */
export function useAllStudents() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  return useQuery({
    queryKey: ["students", "all", activeCompanyId],
    queryFn: async () => {
      if (!user || !activeCompanyId) return [];
      // Fetch in batches of 1000 to handle large datasets
      let allData: Student[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .eq("company_id", activeCompanyId)
          .range(from, from + batchSize - 1);
        if (error) throw error;
        allData = allData.concat(data as Student[]);
        hasMore = data.length === batchSize;
        from += batchSize;
      }
      return allData;
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useBulkDeleteStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("students").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student_payments"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
