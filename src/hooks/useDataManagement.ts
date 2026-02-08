import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const exportData = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
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
    if (!user) return false;
    setIsRestoring(true);
    try {
      const userId = user.id;

      // Create ID mapping for expense_accounts
      const accountIdMap = new Map<string, string>();
      for (const account of backup.data.expense_accounts) {
        const { data, error } = await supabase.from("expense_accounts").insert({
          user_id: userId,
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
            amount: transfer.amount,
            description: transfer.description,
            from_account_id: mappedFromId,
            to_account_id: mappedToId,
          });
          if (error) throw error;
        }
      }

      // Invalidate all queries to refresh UI
      await queryClient.invalidateQueries();
      toast({ title: "Data restored", description: "Your backup has been restored successfully." });
      return true;
    } catch (error: any) {
      toast({ title: "Restore failed", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setIsRestoring(false);
    }
  };

  const resetAllData = async (password: string): Promise<boolean> => {
    if (!user || !user.email) return false;
    setIsResetting(true);
    try {
      // Re-authenticate user with password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (authError) {
        toast({ title: "Authentication failed", description: "Incorrect password", variant: "destructive" });
        return false;
      }

      // Delete in correct order due to foreign key constraints
      const userId = user.id;

      // 1. Delete allocations (references revenues and expense_accounts)
      const { error: allocError } = await supabase.from("allocations").delete().eq("user_id", userId);
      if (allocError) throw allocError;

      // 2. Delete khata_transfers (references expense_accounts)
      const { error: transferError } = await supabase.from("khata_transfers").delete().eq("user_id", userId);
      if (transferError) throw transferError;

      // 3. Delete expenses (references expense_accounts)
      const { error: expenseError } = await supabase.from("expenses").delete().eq("user_id", userId);
      if (expenseError) throw expenseError;

      // 4. Delete revenues (references revenue_sources)
      const { error: revenueError } = await supabase.from("revenues").delete().eq("user_id", userId);
      if (revenueError) throw revenueError;

      // 5. Delete expense_accounts
      const { error: accountError } = await supabase.from("expense_accounts").delete().eq("user_id", userId);
      if (accountError) throw accountError;

      // 6. Delete revenue_sources
      const { error: sourceError } = await supabase.from("revenue_sources").delete().eq("user_id", userId);
      if (sourceError) throw sourceError;

      // Invalidate all queries to refresh UI
      await queryClient.invalidateQueries();
      toast({ title: "Data reset complete", description: "All your data has been permanently deleted." });
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
