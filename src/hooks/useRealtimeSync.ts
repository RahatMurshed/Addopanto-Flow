import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

/**
 * Subscribes to Supabase Realtime changes on all financial tables.
 * When ANY user modifies data, the relevant query caches are invalidated
 * so every open tab/browser sees fresh data automatically.
 */

const TABLE_INVALIDATION_MAP: Record<string, string[]> = {
  revenues: ["revenues", "dashboard", "reports", "revenue_summary"],
  expenses: ["expenses", "account_balances", "dashboard", "reports", "expense_summary"],
  students: ["students", "dashboard", "reports"],
  student_payments: [
    "student_payments",
    "students",
    "revenues",
    "allocations",
    "account_balances",
    "dashboard",
    "reports",
    "revenue_summary",
    "expense_summary",
  ],
  allocations: ["allocations", "account_balances", "dashboard", "reports"],
  expense_accounts: ["expense_accounts", "account_balances", "dashboard", "reports"],
  khata_transfers: ["khata_transfers", "account_balances", "dashboard", "reports"],
  monthly_fee_history: ["monthly_fee_history", "students", "dashboard", "reports"],
  batches: ["batches", "students", "dashboard"],
  companies: ["user-companies", "dashboard", "reports"],
};

const TABLE_LABELS: Record<string, string> = {
  revenues: "Revenue",
  expenses: "Expenses",
  students: "Students",
  student_payments: "Payments",
  allocations: "Allocations",
  expense_accounts: "Expense sources",
  khata_transfers: "Transfers",
  monthly_fee_history: "Fee history",
  batches: "Batches",
  companies: "Company settings",
};

export function useRealtimeSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTables = useRef<Set<string>>(new Set());

  const flushNotification = useCallback(() => {
    const tables = Array.from(pendingTables.current);
    pendingTables.current.clear();
    if (tables.length === 0) return;

    const labels = tables.map((t) => TABLE_LABELS[t] || t);
    const summary = labels.length <= 2 ? labels.join(" & ") : `${labels.length} sections`;

    toast({
      description: `${summary} updated by another user`,
      duration: 3000,
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    function handleChange(table: string, payload: any) {
      // Invalidate caches regardless of who made the change
      const keys = TABLE_INVALIDATION_MAP[table] || [];
      for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }

      // Only show toast for changes made by OTHER users
      const recordUserId = payload?.new?.user_id ?? payload?.old?.user_id;
      if (recordUserId && recordUserId === user?.id) return;

      // Debounce toast: batch rapid changes into one notification
      pendingTables.current.add(table);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(flushNotification, 1500);
    }

    const channel = supabase
      .channel("global-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "revenues" }, (p) => handleChange("revenues", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, (p) => handleChange("expenses", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, (p) => handleChange("students", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "student_payments" }, (p) => handleChange("student_payments", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "allocations" }, (p) => handleChange("allocations", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "expense_accounts" }, (p) => handleChange("expense_accounts", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "khata_transfers" }, (p) => handleChange("khata_transfers", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "monthly_fee_history" }, (p) => handleChange("monthly_fee_history", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "batches" }, (p) => handleChange("batches", p))
      .on("postgres_changes", { event: "*", schema: "public", table: "companies" }, (p) => handleChange("companies", p))
      .subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, flushNotification]);
}
