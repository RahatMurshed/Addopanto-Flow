import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
};

export function useRealtimeSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("global-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "revenues" },
        () => invalidate("revenues")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => invalidate("expenses")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => invalidate("students")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_payments" },
        () => invalidate("student_payments")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "allocations" },
        () => invalidate("allocations")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expense_accounts" },
        () => invalidate("expense_accounts")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "khata_transfers" },
        () => invalidate("khata_transfers")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "monthly_fee_history" },
        () => invalidate("monthly_fee_history")
      )
      .subscribe();

    function invalidate(table: string) {
      const keys = TABLE_INVALIDATION_MAP[table] || [];
      for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
