import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  BackupData,
  BackupPreview,
  getBackupPreview,
  parseBackupFile,
} from "@/utils/dataBackupUtils";

const BACKUP_TABLES = [
  "courses",
  "batches",
  "students",
  "student_payments",
  "monthly_fee_history",
  "student_siblings",
  "student_batch_history",
  "expense_accounts",
  "revenue_sources",
  "revenues",
  "allocations",
  "expenses",
  "khata_transfers",
  "company_memberships",
  "audit_logs",
  "currency_change_logs",
] as const;

const TABLE_LABELS: Record<string, string> = {
  courses: "Backing up courses...",
  batches: "Backing up batches...",
  students: "Backing up students...",
  student_payments: "Backing up payments...",
  monthly_fee_history: "Backing up fee history...",
  student_siblings: "Backing up student siblings...",
  student_batch_history: "Backing up batch history...",
  expense_accounts: "Backing up expense categories...",
  revenue_sources: "Backing up revenue sources...",
  revenues: "Backing up revenues...",
  allocations: "Backing up allocations...",
  expenses: "Backing up expenses...",
  khata_transfers: "Backing up transfers...",
  company_memberships: "Backing up members...",
  audit_logs: "Backing up audit logs...",
  currency_change_logs: "Backing up currency logs...",
};

async function fetchAllRows(table: string, companyId: string) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table as any)
      .select("*")
      .eq("company_id", companyId)
      .range(from, from + PAGE_SIZE - 1);
    
    if (error) throw error;
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allData = allData.concat(data);
      if (data.length < PAGE_SIZE) hasMore = false;
      else from += PAGE_SIZE;
    }
  }
  return allData;
}

export function useDataManagement() {
  const { user } = useAuth();
  const { activeCompanyId, activeCompany, isCipher } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStep, setExportStep] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStep, setRestoreStep] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const exportData = async () => {
    if (!user || !activeCompanyId) return;
    if (!isCipher) {
      toast({ title: "Access denied", description: "Only platform administrators can perform backups.", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStep("Starting backup...");

    try {
      const backupData: Record<string, any[]> = {};
      const total = BACKUP_TABLES.length;

      for (let i = 0; i < total; i++) {
        const table = BACKUP_TABLES[i];
        setExportStep(TABLE_LABELS[table] || `Backing up ${table}...`);
        setExportProgress(((i) / total) * 90);
        
        backupData[table] = await fetchAllRows(table, activeCompanyId);
      }

      // Also fetch company settings
      setExportStep("Backing up company settings...");
      setExportProgress(92);
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", activeCompanyId)
        .single();

      const recordCounts: Record<string, number> = {};
      for (const [key, val] of Object.entries(backupData)) {
        recordCounts[key] = val.length;
      }

      const backup: BackupData = {
        version: "3.0",
        exportedAt: new Date().toISOString(),
        userEmail: user.email || "unknown",
        companyName: activeCompany?.name,
        metadata: {
          companyId: activeCompanyId,
          companyName: activeCompany?.name || "",
          backupDate: new Date().toISOString(),
          recordCounts,
          totalRecords: Object.values(recordCounts).reduce((s, c) => s + c, 0),
        },
        data: {
          company_settings: companyData ? [companyData] : [],
          ...backupData,
          // Ensure backwards compat keys
          expense_accounts: backupData.expense_accounts || [],
          revenue_sources: backupData.revenue_sources || [],
          revenues: backupData.revenues || [],
          allocations: backupData.allocations || [],
          expenses: backupData.expenses || [],
          khata_transfers: backupData.khata_transfers || [],
          batches: backupData.batches || [],
          students: backupData.students || [],
          student_payments: backupData.student_payments || [],
          monthly_fee_history: backupData.monthly_fee_history || [],
        },
      };

      setExportStep("Compressing backup...");
      setExportProgress(95);

      const jsonString = JSON.stringify(backup);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const date = new Date().toISOString().split("T")[0];
      const companySlug = (activeCompany?.name || "company").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
      const filename = `backup-${companySlug}-${date}.json`;

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setExportStep("Backup complete!");
      toast({ title: "Backup downloaded", description: `${backup.metadata!.totalRecords} records exported successfully.` });
    } catch (error: any) {
      toast({ title: "Export failed", description: error.message, variant: "destructive" });
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStep("");
      }, 1000);
    }
  };

  const importData = async (file: File): Promise<{ backup: BackupData; preview: BackupPreview } | null> => {
    if (!isCipher) {
      toast({ title: "Access denied", description: "Only platform administrators can restore data.", variant: "destructive" });
      return null;
    }
    try {
      const backup = await parseBackupFile(file);
      const preview = getBackupPreview(backup);
      return { backup, preview };
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const restoreData = async (backup: BackupData, onProgress?: (pct: number, step: string) => void) => {
    if (!user || !activeCompanyId) {
      toast({ title: "Restore failed", description: "No active company selected", variant: "destructive" });
      return false;
    }
    if (!isCipher) {
      toast({ title: "Access denied", description: "Only platform administrators can restore data.", variant: "destructive" });
      return false;
    }

    setIsRestoring(true);
    setRestoreProgress(0);
    setRestoreStep("Preparing restore...");

    const report = (pct: number, step: string) => {
      setRestoreProgress(pct);
      setRestoreStep(step);
      onProgress?.(pct, step);
    };

    try {
      const userId = user.id;
      const companyId = activeCompanyId;

      report(5, "Restoring expense categories...");
      const accountIdMap = new Map<string, string>();
      for (const account of backup.data.expense_accounts || []) {
        const { data, error } = await supabase.from("expense_accounts").insert({
          user_id: userId, company_id: companyId,
          name: account.name, color: account.color,
          allocation_percentage: account.allocation_percentage,
          expected_monthly_expense: account.expected_monthly_expense,
          is_active: account.is_active,
        }).select("id").single();
        if (error) throw error;
        accountIdMap.set(account.id, data.id);
      }

      report(15, "Restoring revenue sources...");
      const sourceIdMap = new Map<string, string>();
      for (const source of backup.data.revenue_sources || []) {
        const { data, error } = await supabase.from("revenue_sources").insert({
          user_id: userId, company_id: companyId,
          name: source.name, is_active: source.is_active,
        }).select("id").single();
        if (error) throw error;
        sourceIdMap.set(source.id, data.id);
      }

      report(20, "Restoring courses...");
      const courseIdMap = new Map<string, string>();
      for (const course of backup.data.courses || []) {
        const { data, error } = await supabase.from("courses").insert({
          user_id: userId, company_id: companyId, created_by: userId,
          course_name: course.course_name, course_code: course.course_code,
          description: course.description, category: course.category,
          duration_months: course.duration_months, status: course.status,
          cover_image_url: course.cover_image_url,
        }).select("id").single();
        if (error) throw error;
        courseIdMap.set(course.id, data.id);
      }

      report(30, "Restoring batches...");
      const batchIdMap = new Map<string, string>();
      for (const batch of backup.data.batches || []) {
        const mappedCourseId = batch.course_id ? courseIdMap.get(batch.course_id) : null;
        const { data, error } = await supabase.from("batches").insert({
          user_id: userId, company_id: companyId, created_by: userId,
          batch_name: batch.batch_name, batch_code: batch.batch_code,
          description: batch.description, start_date: batch.start_date,
          end_date: batch.end_date, status: batch.status,
          default_monthly_fee: batch.default_monthly_fee,
          default_admission_fee: batch.default_admission_fee,
          course_duration_months: batch.course_duration_months,
          max_capacity: batch.max_capacity,
          course_id: mappedCourseId,
        }).select("id").single();
        if (error) throw error;
        batchIdMap.set(batch.id, data.id);
      }

      report(40, "Restoring revenues...");
      const revenueIdMap = new Map<string, string>();
      for (const revenue of backup.data.revenues || []) {
        const { data, error } = await supabase.from("revenues").insert({
          user_id: userId, company_id: companyId,
          amount: revenue.amount, date: revenue.date,
          description: revenue.description,
          source_id: revenue.source_id ? sourceIdMap.get(revenue.source_id) : null,
        }).select("id").single();
        if (error) throw error;
        revenueIdMap.set(revenue.id, data.id);
      }

      report(50, "Restoring allocations...");
      for (const allocation of backup.data.allocations || []) {
        const mappedRevenueId = revenueIdMap.get(allocation.revenue_id);
        const mappedAccountId = accountIdMap.get(allocation.expense_account_id);
        if (mappedRevenueId && mappedAccountId) {
          const { error } = await supabase.from("allocations").insert({
            user_id: userId, company_id: companyId,
            amount: allocation.amount,
            revenue_id: mappedRevenueId, expense_account_id: mappedAccountId,
          });
          if (error) throw error;
        }
      }

      report(55, "Restoring expenses...");
      for (const expense of backup.data.expenses || []) {
        const mappedAccountId = accountIdMap.get(expense.expense_account_id);
        if (mappedAccountId) {
          const { error } = await supabase.from("expenses").insert({
            user_id: userId, company_id: companyId,
            amount: expense.amount, date: expense.date,
            description: expense.description,
            expense_account_id: mappedAccountId,
            receipt_url: expense.receipt_url,
          });
          if (error) throw error;
        }
      }

      report(60, "Restoring transfers...");
      for (const transfer of backup.data.khata_transfers || []) {
        const mappedFromId = accountIdMap.get(transfer.from_account_id);
        const mappedToId = accountIdMap.get(transfer.to_account_id);
        if (mappedFromId && mappedToId) {
          const { error } = await supabase.from("khata_transfers").insert({
            user_id: userId, company_id: companyId,
            amount: transfer.amount, description: transfer.description,
            from_account_id: mappedFromId, to_account_id: mappedToId,
          });
          if (error) throw error;
        }
      }

      report(70, "Restoring students...");
      const studentIdMap = new Map<string, string>();
      for (const student of backup.data.students || []) {
        const mappedBatchId = student.batch_id ? batchIdMap.get(student.batch_id) : null;
        const { data, error } = await supabase.from("students").insert({
          user_id: userId, company_id: companyId,
          name: student.name, student_id_number: student.student_id_number,
          email: student.email, phone: student.phone,
          status: student.status, enrollment_date: student.enrollment_date,
          billing_start_month: student.billing_start_month,
          course_start_month: student.course_start_month,
          course_end_month: student.course_end_month,
          monthly_fee_amount: student.monthly_fee_amount,
          admission_fee_total: student.admission_fee_total,
          notes: student.notes, batch_id: mappedBatchId,
          date_of_birth: student.date_of_birth, gender: student.gender,
          roll_number: student.roll_number, whatsapp_number: student.whatsapp_number,
          alt_contact_number: student.alt_contact_number,
          father_name: student.father_name, father_contact: student.father_contact,
          mother_name: student.mother_name, mother_contact: student.mother_contact,
          guardian_name: student.guardian_name, guardian_contact: student.guardian_contact,
          address_house: student.address_house, address_street: student.address_street,
          address_area: student.address_area, address_city: student.address_city,
          address_state: student.address_state, address_pin_zip: student.address_pin_zip,
          academic_year: student.academic_year, class_grade: student.class_grade,
          section_division: student.section_division,
        }).select("id").single();
        if (error) throw error;
        studentIdMap.set(student.id, data.id);
      }

      report(80, "Restoring student payments...");
      for (const payment of backup.data.student_payments || []) {
        const mappedStudentId = studentIdMap.get(payment.student_id);
        if (mappedStudentId) {
          const { error } = await supabase.from("student_payments").insert({
            user_id: userId, company_id: companyId,
            student_id: mappedStudentId, amount: payment.amount,
            payment_date: payment.payment_date, payment_type: payment.payment_type,
            payment_method: payment.payment_method,
            months_covered: payment.months_covered,
            description: payment.description, receipt_number: payment.receipt_number,
            source_id: payment.source_id ? sourceIdMap.get(payment.source_id) : null,
          });
          if (error) throw error;
        }
      }

      report(88, "Restoring fee history...");
      for (const history of backup.data.monthly_fee_history || []) {
        const mappedStudentId = studentIdMap.get(history.student_id);
        if (mappedStudentId) {
          const { error } = await supabase.from("monthly_fee_history").insert({
            user_id: userId, company_id: companyId,
            student_id: mappedStudentId,
            monthly_amount: history.monthly_amount,
            effective_from: history.effective_from,
          });
          if (error) throw error;
        }
      }

      report(93, "Restoring student siblings...");
      for (const sibling of backup.data.student_siblings || []) {
        const mappedStudentId = studentIdMap.get(sibling.student_id);
        if (mappedStudentId) {
          const { error } = await supabase.from("student_siblings").insert({
            company_id: companyId, student_id: mappedStudentId,
            name: sibling.name, age: sibling.age,
            contact: sibling.contact,
            occupation_school: sibling.occupation_school,
          });
          if (error) throw error;
        }
      }

      report(100, "Restore complete!");
      await queryClient.invalidateQueries();
      toast({ title: "Data restored", description: "Backup has been restored to the current company." });
      return true;
    } catch (error: any) {
      toast({ title: "Restore failed", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setTimeout(() => {
        setIsRestoring(false);
        setRestoreProgress(0);
        setRestoreStep("");
      }, 1000);
    }
  };

  const resetAllData = async (password: string): Promise<boolean> => {
    if (!user || !user.email || !activeCompanyId) return false;
    if (!isCipher) {
      toast({ title: "Access denied", description: "Only platform administrators can reset data.", variant: "destructive" });
      return false;
    }

    setIsResetting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast({ title: "Reset failed", description: "No active session", variant: "destructive" });
        return false;
      }

      const response = await supabase.functions.invoke("reset-company-data", {
        body: { companyId: activeCompanyId, password },
      });

      if (response.error) {
        const msg = response.error.message || "Reset failed";
        toast({ title: "Reset failed", description: msg, variant: "destructive" });
        return false;
      }

      const result = response.data;
      if (!result?.success) {
        toast({ title: "Reset failed", description: result?.error || "Incorrect password", variant: "destructive" });
        return false;
      }

      await queryClient.invalidateQueries();
      toast({ title: "Data reset complete", description: "All company data has been deleted." });
      return true;
    } catch (error: any) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setIsResetting(false);
    }
  };

  return {
    exportData,
    importData,
    restoreData,
    resetAllData,
    isExporting,
    exportProgress,
    exportStep,
    isRestoring,
    restoreProgress,
    restoreStep,
    isResetting,
  };
}
