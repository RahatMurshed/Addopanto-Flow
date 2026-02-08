import { supabase } from "@/integrations/supabase/client";

export interface BackupData {
  version: string;
  exportedAt: string;
  userEmail: string;
  data: {
    expense_accounts: any[];
    revenue_sources: any[];
    revenues: any[];
    allocations: any[];
    expenses: any[];
    khata_transfers: any[];
  };
}

export interface BackupPreview {
  expenseAccountsCount: number;
  revenueSourcesCount: number;
  revenuesCount: number;
  allocationsCount: number;
  expensesCount: number;
  khataTransfersCount: number;
  exportedAt: string;
  userEmail: string;
}

export async function exportUserData(userId: string): Promise<BackupData["data"]> {
  const [
    expenseAccountsRes,
    revenueSourcesRes,
    revenuesRes,
    allocationsRes,
    expensesRes,
    khataTransfersRes,
  ] = await Promise.all([
    supabase.from("expense_accounts").select("*").eq("user_id", userId),
    supabase.from("revenue_sources").select("*").eq("user_id", userId),
    supabase.from("revenues").select("*").eq("user_id", userId),
    supabase.from("allocations").select("*").eq("user_id", userId),
    supabase.from("expenses").select("*").eq("user_id", userId),
    supabase.from("khata_transfers").select("*").eq("user_id", userId),
  ]);

  return {
    expense_accounts: expenseAccountsRes.data || [],
    revenue_sources: revenueSourcesRes.data || [],
    revenues: revenuesRes.data || [],
    allocations: allocationsRes.data || [],
    expenses: expensesRes.data || [],
    khata_transfers: khataTransfersRes.data || [],
  };
}

export function downloadBackup(data: BackupData["data"], userEmail: string): void {
  const backup: BackupData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    userEmail,
    data,
  };

  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split("T")[0];
  const filename = `khata-backup-${date}.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        const validation = validateBackupData(parsed);
        if (!validation.valid) {
          reject(new Error(validation.error));
          return;
        }
        resolve(parsed as BackupData);
      } catch (err) {
        reject(new Error("Invalid JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function validateBackupData(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid backup format" };
  }

  if (!data.version || data.version !== "1.0") {
    return { valid: false, error: "Unsupported backup version" };
  }

  if (!data.exportedAt || !data.userEmail) {
    return { valid: false, error: "Missing backup metadata" };
  }

  if (!data.data || typeof data.data !== "object") {
    return { valid: false, error: "Missing data section" };
  }

  const requiredTables = [
    "expense_accounts",
    "revenue_sources",
    "revenues",
    "allocations",
    "expenses",
    "khata_transfers",
  ];

  for (const table of requiredTables) {
    if (!Array.isArray(data.data[table])) {
      return { valid: false, error: `Missing or invalid ${table} data` };
    }
  }

  return { valid: true };
}

export function getBackupPreview(backup: BackupData): BackupPreview {
  return {
    expenseAccountsCount: backup.data.expense_accounts.length,
    revenueSourcesCount: backup.data.revenue_sources.length,
    revenuesCount: backup.data.revenues.length,
    allocationsCount: backup.data.allocations.length,
    expensesCount: backup.data.expenses.length,
    khataTransfersCount: backup.data.khata_transfers.length,
    exportedAt: backup.exportedAt,
    userEmail: backup.userEmail,
  };
}
