import { supabase } from "@/integrations/supabase/client";

export interface BackupData {
  version: string;
  exportedAt: string;
  userEmail: string;
  companyName?: string;
  data: {
    expense_accounts: any[];
    revenue_sources: any[];
    revenues: any[];
    allocations: any[];
    expenses: any[];
    khata_transfers: any[];
    batches: any[];
    students: any[];
    student_payments: any[];
    monthly_fee_history: any[];
  };
}

export interface BackupPreview {
  expenseAccountsCount: number;
  revenueSourcesCount: number;
  revenuesCount: number;
  allocationsCount: number;
  expensesCount: number;
  khataTransfersCount: number;
  batchesCount: number;
  studentsCount: number;
  studentPaymentsCount: number;
  monthlyFeeHistoryCount: number;
  exportedAt: string;
  userEmail: string;
  companyName?: string;
}

export async function exportCompanyData(companyId: string): Promise<BackupData["data"]> {
  const [
    expenseAccountsRes,
    revenueSourcesRes,
    revenuesRes,
    allocationsRes,
    expensesRes,
    khataTransfersRes,
    batchesRes,
    studentsRes,
    studentPaymentsRes,
    monthlyFeeHistoryRes,
  ] = await Promise.all([
    supabase.from("expense_accounts").select("*").eq("company_id", companyId),
    supabase.from("revenue_sources").select("*").eq("company_id", companyId),
    supabase.from("revenues").select("*").eq("company_id", companyId),
    supabase.from("allocations").select("*").eq("company_id", companyId),
    supabase.from("expenses").select("*").eq("company_id", companyId),
    supabase.from("khata_transfers").select("*").eq("company_id", companyId),
    supabase.from("batches").select("*").eq("company_id", companyId),
    supabase.from("students").select("*").eq("company_id", companyId),
    supabase.from("student_payments").select("*").eq("company_id", companyId),
    supabase.from("monthly_fee_history").select("*").eq("company_id", companyId),
  ]);

  return {
    expense_accounts: expenseAccountsRes.data || [],
    revenue_sources: revenueSourcesRes.data || [],
    revenues: revenuesRes.data || [],
    allocations: allocationsRes.data || [],
    expenses: expensesRes.data || [],
    khata_transfers: khataTransfersRes.data || [],
    batches: batchesRes.data || [],
    students: studentsRes.data || [],
    student_payments: studentPaymentsRes.data || [],
    monthly_fee_history: monthlyFeeHistoryRes.data || [],
  };
}

/** @deprecated Use exportCompanyData instead */
export async function exportUserData(userId: string): Promise<BackupData["data"]> {
  return exportCompanyData(userId);
}

export function downloadBackup(data: BackupData["data"], userEmail: string, companyName?: string): void {
  const backup: BackupData = {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    userEmail,
    companyName,
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
        // Normalize v1.0 backups to include empty arrays for new tables
        if (parsed.version === "1.0") {
          parsed.data.batches = parsed.data.batches || [];
          parsed.data.students = parsed.data.students || [];
          parsed.data.student_payments = parsed.data.student_payments || [];
          parsed.data.monthly_fee_history = parsed.data.monthly_fee_history || [];
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

  if (!data.version || (data.version !== "1.0" && data.version !== "2.0")) {
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
    batchesCount: (backup.data.batches || []).length,
    studentsCount: (backup.data.students || []).length,
    studentPaymentsCount: (backup.data.student_payments || []).length,
    monthlyFeeHistoryCount: (backup.data.monthly_fee_history || []).length,
    exportedAt: backup.exportedAt,
    userEmail: backup.userEmail,
    companyName: backup.companyName,
  };
}
