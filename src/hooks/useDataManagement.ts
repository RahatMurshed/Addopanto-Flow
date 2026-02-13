import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  exportUserData,
  downloadBackup,
  parseBackupFile,
  BackupData,
  BackupPreview,
  getBackupPreview,
} from "@/utils/dataBackupUtils";

export function useDataManagement() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const exportData = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      // Export functions need update to filter by company, but for now user-level export is fine
      // Ideally, exportUserData should be updated to accept companyId
      const data = await exportUserData(user.id);
      downloadBackup(data, user.email || "unknown");
      toast({ title: "Backup downloaded", description: "Your data has been exported successfully." });
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

      const userId = user.id;
      const companyId = activeCompanyId;

      // Delete data scoped to company
      await supabase.from("allocations").delete().eq("company_id", companyId);
      await supabase.from("khata_transfers").delete().eq("company_id", companyId);
      await supabase.from("expenses").delete().eq("company_id", companyId);
      await supabase.from("revenues").delete().eq("company_id", companyId);
      await supabase.from("expense_accounts").delete().eq("company_id", companyId);
      await supabase.from("revenue_sources").delete().eq("company_id", companyId);
      await supabase.from("student_payments").delete().eq("company_id", companyId);
      await supabase.from("monthly_fee_history").delete().eq("company_id", companyId);
      await supabase.from("students").delete().eq("company_id", companyId);

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
