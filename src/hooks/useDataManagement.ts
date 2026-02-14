import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  exportCompanyData,
  downloadBackup,
  parseBackupFile,
  BackupData,
  BackupPreview,
  getBackupPreview,
} from "@/utils/dataBackupUtils";

export function useDataManagement() {
  const { user } = useAuth();
  const { activeCompanyId, activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const exportData = async () => {
    if (!user || !activeCompanyId) return;
    setIsExporting(true);
    try {
      const data = await exportCompanyData(activeCompanyId);
      downloadBackup(data, user.email || "unknown", activeCompany?.name || undefined);
      toast({ title: "Backup downloaded", description: "Your company data has been exported successfully." });
    } catch (error: any) {
      toast({ title: "Export failed", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const importData = async (file: File): Promise<{ backup: BackupData; preview: BackupPreview } | null> => {
    try {
      const backup = await parseBackupFile(file);
      const preview = getBackupPreview(backup);
      return { backup, preview };
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const restoreData = async (backup: BackupData) => {
    if (!user || !activeCompanyId) {
      toast({ title: "Restore failed", description: "No active company selected", variant: "destructive" });
      return false;
    }
    
    setIsRestoring(true);
    try {
      const userId = user.id;
      const companyId = activeCompanyId;

      // Create ID mapping for expense_accounts
      const accountIdMap = new Map<string, string>();
      for (const account of backup.data.expense_accounts) {
        const { data, error } = await supabase.from("expense_accounts").insert({
          user_id: userId,
          company_id: companyId,
          name: account.name,
          color: account.color,
          allocation_percentage: account.allocation_percentage,
          expected_monthly_expense: account.expected_monthly_expense,
          is_active: account.is_active,
        }).select("id").single();
        if (error) throw error;
        accountIdMap.set(account.id, data.id);
      }

      // Create ID mapping for revenue_sources
      const sourceIdMap = new Map<string, string>();
      for (const source of backup.data.revenue_sources) {
        const { data, error } = await supabase.from("revenue_sources").insert({
          user_id: userId,
          company_id: companyId,
          name: source.name,
          is_active: source.is_active,
        }).select("id").single();
        if (error) throw error;
        sourceIdMap.set(source.id, data.id);
      }

      // Create ID mapping for batches
      const batchIdMap = new Map<string, string>();
      for (const batch of (backup.data.batches || [])) {
        const { data, error } = await supabase.from("batches").insert({
          user_id: userId,
          company_id: companyId,
          created_by: userId,
          batch_name: batch.batch_name,
          batch_code: batch.batch_code,
          description: batch.description,
          start_date: batch.start_date,
          end_date: batch.end_date,
          status: batch.status,
          default_monthly_fee: batch.default_monthly_fee,
          default_admission_fee: batch.default_admission_fee,
          course_duration_months: batch.course_duration_months,
          max_capacity: batch.max_capacity,
        }).select("id").single();
        if (error) throw error;
        batchIdMap.set(batch.id, data.id);
      }

      // Create ID mapping for revenues
      const revenueIdMap = new Map<string, string>();
      for (const revenue of backup.data.revenues) {
        const { data, error } = await supabase.from("revenues").insert({
          user_id: userId,
          company_id: companyId,
          amount: revenue.amount,
          date: revenue.date,
          description: revenue.description,
          source_id: revenue.source_id ? sourceIdMap.get(revenue.source_id) : null,
        }).select("id").single();
        if (error) throw error;
        revenueIdMap.set(revenue.id, data.id);
      }

      // Insert allocations with mapped IDs
      for (const allocation of backup.data.allocations) {
        const mappedRevenueId = revenueIdMap.get(allocation.revenue_id);
        const mappedAccountId = accountIdMap.get(allocation.expense_account_id);
        if (mappedRevenueId && mappedAccountId) {
          const { error } = await supabase.from("allocations").insert({
            user_id: userId,
            company_id: companyId,
            amount: allocation.amount,
            revenue_id: mappedRevenueId,
            expense_account_id: mappedAccountId,
          });
          if (error) throw error;
        }
      }

      // Insert expenses with mapped account IDs
      for (const expense of backup.data.expenses) {
        const mappedAccountId = accountIdMap.get(expense.expense_account_id);
        if (mappedAccountId) {
          const { error } = await supabase.from("expenses").insert({
            user_id: userId,
            company_id: companyId,
            amount: expense.amount,
            date: expense.date,
            description: expense.description,
            expense_account_id: mappedAccountId,
            receipt_url: expense.receipt_url,
          });
          if (error) throw error;
        }
      }

      // Insert khata_transfers with mapped account IDs
      for (const transfer of backup.data.khata_transfers) {
        const mappedFromId = accountIdMap.get(transfer.from_account_id);
        const mappedToId = accountIdMap.get(transfer.to_account_id);
        if (mappedFromId && mappedToId) {
          const { error } = await supabase.from("khata_transfers").insert({
            user_id: userId,
            company_id: companyId,
            amount: transfer.amount,
            description: transfer.description,
            from_account_id: mappedFromId,
            to_account_id: mappedToId,
          });
          if (error) throw error;
        }
      }

      // Create ID mapping for students (depends on batches)
      const studentIdMap = new Map<string, string>();
      for (const student of (backup.data.students || [])) {
        const mappedBatchId = student.batch_id ? batchIdMap.get(student.batch_id) : null;
        const { data, error } = await supabase.from("students").insert({
          user_id: userId,
          company_id: companyId,
          name: student.name,
          student_id_number: student.student_id_number,
          email: student.email,
          phone: student.phone,
          status: student.status,
          enrollment_date: student.enrollment_date,
          billing_start_month: student.billing_start_month,
          course_start_month: student.course_start_month,
          course_end_month: student.course_end_month,
          monthly_fee_amount: student.monthly_fee_amount,
          admission_fee_total: student.admission_fee_total,
          notes: student.notes,
          batch_id: mappedBatchId,
        }).select("id").single();
        if (error) throw error;
        studentIdMap.set(student.id, data.id);
      }

      // Insert student_payments with mapped student IDs
      for (const payment of (backup.data.student_payments || [])) {
        const mappedStudentId = studentIdMap.get(payment.student_id);
        if (mappedStudentId) {
          const { error } = await supabase.from("student_payments").insert({
            user_id: userId,
            company_id: companyId,
            student_id: mappedStudentId,
            amount: payment.amount,
            payment_date: payment.payment_date,
            payment_type: payment.payment_type,
            payment_method: payment.payment_method,
            months_covered: payment.months_covered,
            description: payment.description,
            receipt_number: payment.receipt_number,
          });
          if (error) throw error;
        }
      }

      // Insert monthly_fee_history with mapped student IDs
      for (const history of (backup.data.monthly_fee_history || [])) {
        const mappedStudentId = studentIdMap.get(history.student_id);
        if (mappedStudentId) {
          const { error } = await supabase.from("monthly_fee_history").insert({
            user_id: userId,
            company_id: companyId,
            student_id: mappedStudentId,
            monthly_amount: history.monthly_amount,
            effective_from: history.effective_from,
          });
          if (error) throw error;
        }
      }

      await queryClient.invalidateQueries();
      toast({ title: "Data restored", description: "Your backup has been restored to the current company." });
      return true;
    } catch (error: any) {
      toast({ title: "Restore failed", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setIsRestoring(false);
    }
  };

  const resetAllData = async (password: string): Promise<boolean> => {
    if (!user || !user.email || !activeCompanyId) return false;
    setIsResetting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (authError) {
        toast({ title: "Authentication failed", description: "Incorrect password", variant: "destructive" });
        return false;
      }

      const companyId = activeCompanyId;

      // Delete data scoped to company (order matters for FK constraints)
      await supabase.from("allocations").delete().eq("company_id", companyId);
      await supabase.from("khata_transfers").delete().eq("company_id", companyId);
      await supabase.from("expenses").delete().eq("company_id", companyId);
      await supabase.from("revenues").delete().eq("company_id", companyId);
      await supabase.from("expense_accounts").delete().eq("company_id", companyId);
      await supabase.from("revenue_sources").delete().eq("company_id", companyId);
      await supabase.from("student_payments").delete().eq("company_id", companyId);
      await supabase.from("monthly_fee_history").delete().eq("company_id", companyId);
      await supabase.from("students").delete().eq("company_id", companyId);
      await supabase.from("batches").delete().eq("company_id", companyId);

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
    isRestoring,
    isResetting,
  };
}
