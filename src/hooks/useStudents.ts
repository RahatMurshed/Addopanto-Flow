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
  addressState?: string;
  addressArea?: string;
  addressPinZip?: string;
  academicYear?: string;
  includeAltContact?: boolean;
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
  const addressState = filters?.addressState?.trim() || "";
  const addressArea = filters?.addressArea?.trim() || "";
  const addressPinZip = filters?.addressPinZip?.trim() || "";
  const academicYear = filters?.academicYear?.trim() || "";
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;

  const { activeCompanyId, canViewStudentPII, isDataEntryModerator } = useCompany();
  const table = canViewStudentPII ? "students" : "students_safe";

  return useQuery({
    queryKey: ["students", activeCompanyId, { search, status, sortBy, sortOrder, batchId, gender, classGrade, addressCity, addressState, addressArea, addressPinZip, academicYear, page, pageSize, table, isDataEntryModerator }],
    queryFn: async (): Promise<PaginatedStudentsResult> => {
      if (!user) return { data: [], totalCount: 0 };
      if (!activeCompanyId) return { data: [], totalCount: 0 };

      // Build base query for both count and data
      let countQuery = supabase.from(table as any).select("id", { count: "exact", head: true }).eq("company_id", activeCompanyId);
      let dataQuery = supabase.from(table as any).select("*").eq("company_id", activeCompanyId);

      // DEO moderators only see students they created
      if (isDataEntryModerator) {
        countQuery = countQuery.eq("user_id", user.id);
        dataQuery = dataQuery.eq("user_id", user.id);
      }

      // Apply filters to both queries
      if (status !== "all") {
        countQuery = countQuery.eq("status", status);
        dataQuery = dataQuery.eq("status", status);
      }

      if (batchId === "none") {
        countQuery = countQuery.is("batch_id", null);
        dataQuery = dataQuery.is("batch_id", null);
      } else if (batchId === "enrolled") {
        countQuery = countQuery.not("batch_id", "is", null);
        dataQuery = dataQuery.not("batch_id", "is", null);
      } else if (batchId !== "all") {
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

      // Address filters only apply when user can view PII (columns exist only in full table)
      if (canViewStudentPII) {
        if (addressCity) {
          const sanitizedCity = addressCity.replace(/[%_\\]/g, '\\$&');
          countQuery = countQuery.ilike("address_city", `%${sanitizedCity}%`);
          dataQuery = dataQuery.ilike("address_city", `%${sanitizedCity}%`);
        }

        if (addressState) {
          const s = addressState.replace(/[%_\\]/g, '\\$&');
          countQuery = countQuery.ilike("address_state", `%${s}%`);
          dataQuery = dataQuery.ilike("address_state", `%${s}%`);
        }

        if (addressArea) {
          const s = addressArea.replace(/[%_\\]/g, '\\$&');
          countQuery = countQuery.ilike("address_area", `%${s}%`);
          dataQuery = dataQuery.ilike("address_area", `%${s}%`);
        }

        if (addressPinZip) {
          const s = addressPinZip.replace(/[%_\\]/g, '\\$&');
          countQuery = countQuery.ilike("address_pin_zip", `%${s}%`);
          dataQuery = dataQuery.ilike("address_pin_zip", `%${s}%`);
        }
      }

      if (academicYear) {
        const sanitizedYear = academicYear.replace(/[%_\\]/g, '\\$&');
        countQuery = countQuery.ilike("academic_year", `%${sanitizedYear}%`);
        dataQuery = dataQuery.ilike("academic_year", `%${sanitizedYear}%`);
      }

      if (search) {
        const sanitized = search.replace(/[%_\\]/g, '\\$&');
        const includeAltContact = filters?.includeAltContact;
        // Only search fields available in current table
        const safeFields = ["name", "student_id_number", "class_grade"];
        const piiFields = [
          "father_name", "phone", "mother_name", "whatsapp_number",
          ...(includeAltContact !== false ? ["alt_contact_number"] : []),
          "email", "address_house", "address_street",
          "address_area", "address_city", "address_state", "address_pin_zip"
        ];
        const fields = canViewStudentPII ? [...safeFields, ...piiFields] : safeFields;
        const searchFilter = fields.map(f => `${f}.ilike.%${sanitized}%`).join(",");
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
        data: (dataResult.data as unknown) as Student[],
        totalCount: countResult.count || 0,
      };
    },
    enabled: !!user && !!activeCompanyId,
  });
}

export function useStudent(id: string | undefined) {
  const { user } = useAuth();
  const { canViewStudentPII } = useCompany();
  const table = canViewStudentPII ? "students" : "students_safe";

  return useQuery({
    queryKey: ["students", id, table],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Student;
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
      // Validate batch_id exists if provided (guards against stale/deleted batch IDs from drafts)
      let validBatchId: string | null = student.batch_id || null;
      if (validBatchId) {
        const { data: batchExists } = await supabase
          .from("batches" as any)
          .select("id")
          .eq("id", validBatchId)
          .maybeSingle();
        if (!batchExists) {
          console.warn(`Batch ${validBatchId} not found, setting batch_id to null`);
          validBatchId = null;
        }
      }
      const sanitized = {
        ...student,
        batch_id: validBatchId,
        user_id: user.id,
        company_id: activeCompanyId,
      };
      const { data, error } = await supabase
        .from("students")
        .insert(sanitized)
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
      queryClient.invalidateQueries({ queryKey: ["batches"] });
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
  const { activeCompanyId, canViewStudentPII, isDataEntryModerator } = useCompany();
  const table = canViewStudentPII ? "students" : "students_safe";

  return useQuery({
    queryKey: ["students", "all", activeCompanyId, table, isDataEntryModerator],
    queryFn: async () => {
      if (!user || !activeCompanyId) return [];
      let allData: Student[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        let query = supabase
          .from(table as any)
          .select("*")
          .eq("company_id", activeCompanyId);
        // DEO moderators only see their own students
        if (isDataEntryModerator) {
          query = query.eq("user_id", user.id);
        }
        const { data, error } = await query.range(from, from + batchSize - 1);
        if (error) throw error;
        allData = allData.concat((data as unknown) as Student[]);
        hasMore = data.length === batchSize;
        from += batchSize;
      }
      return allData;
    },
    enabled: !!user && !!activeCompanyId,
  });
}

/**
 * Fetch ALL students matching filters (no pagination) for CSV export.
 * Fetches in batches of 1000 to bypass the default Supabase limit.
 */
export async function fetchFilteredStudentsForExport(
  activeCompanyId: string,
  filters: StudentFilters,
  canViewPII: boolean = true
): Promise<Student[]> {
  let allData: Student[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;
  const table = canViewPII ? "students" : "students_safe";

  while (hasMore) {
    let query = supabase.from(table as any).select("*").eq("company_id", activeCompanyId);

    const status = filters.status || "all";
    if (status !== "all") query = query.eq("status", status);

    const batchId = filters.batchId || "all";
    if (batchId === "none") {
      query = query.is("batch_id", null);
    } else if (batchId === "enrolled") {
      query = query.not("batch_id", "is", null);
    } else if (batchId !== "all") {
      query = query.eq("batch_id", batchId);
    }

    const gender = filters.gender || "all";
    if (gender !== "all") query = query.eq("gender", gender);

    if (filters.classGrade?.trim()) {
      const s = filters.classGrade.trim().replace(/[%_\\]/g, '\\$&');
      query = query.ilike("class_grade", `%${s}%`);
    }
    if (canViewPII) {
      if (filters.addressCity?.trim()) {
        const s = filters.addressCity.trim().replace(/[%_\\]/g, '\\$&');
        query = query.ilike("address_city", `%${s}%`);
      }
      if (filters.addressState?.trim()) {
        const s = filters.addressState.trim().replace(/[%_\\]/g, '\\$&');
        query = query.ilike("address_state", `%${s}%`);
      }
      if (filters.addressArea?.trim()) {
        const s = filters.addressArea.trim().replace(/[%_\\]/g, '\\$&');
        query = query.ilike("address_area", `%${s}%`);
      }
      if (filters.addressPinZip?.trim()) {
        const s = filters.addressPinZip.trim().replace(/[%_\\]/g, '\\$&');
        query = query.ilike("address_pin_zip", `%${s}%`);
      }
    }
    if (filters.academicYear?.trim()) {
      const s = filters.academicYear.trim().replace(/[%_\\]/g, '\\$&');
      query = query.ilike("academic_year", `%${s}%`);
    }

    if (filters.search?.trim()) {
      const sanitized = filters.search.trim().replace(/[%_\\]/g, '\\$&');
      const safeFields = ["name", "student_id_number", "class_grade"];
      const piiFields = [
        "father_name", "phone", "mother_name", "whatsapp_number",
        ...(filters.includeAltContact !== false ? ["alt_contact_number"] : []),
        "email", "address_house", "address_street",
        "address_area", "address_city", "address_state", "address_pin_zip"
      ];
      const fields = canViewPII ? [...safeFields, ...piiFields] : safeFields;
      query = query.or(fields.map(f => `${f}.ilike.%${sanitized}%`).join(","));
    }

    query = query.order("name", { ascending: true }).range(from, from + batchSize - 1);

    const { data, error } = await query;
    if (error) throw error;
    allData = allData.concat((data as unknown) as Student[]);
    hasMore = data.length === batchSize;
    from += batchSize;
  }

  return allData;
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
