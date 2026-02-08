import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, DollarSign, PiggyBank, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      // Fetch all data in parallel
      const [revenuesRes, expensesRes, allocationsRes, accountsRes] = await Promise.all([
        supabase.from("revenues").select("amount, date").eq("user_id", user.id),
        supabase.from("expenses").select("amount, date").eq("user_id", user.id),
        supabase.from("allocations").select("amount").eq("user_id", user.id),
        supabase.from("expense_accounts").select("id, name, color, allocation_percentage, is_active").eq("user_id", user.id),
      ]);

      if (revenuesRes.error) throw revenuesRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (allocationsRes.error) throw allocationsRes.error;
      if (accountsRes.error) throw accountsRes.error;

      const revenues = revenuesRes.data || [];
      const expenses = expensesRes.data || [];
      const allocations = allocationsRes.data || [];
      const accounts = accountsRes.data || [];

      // Calculate totals
      const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
      const thisMonthRevenue = revenues
        .filter((r) => r.date >= startOfMonth)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const thisMonthExpenses = expenses
        .filter((e) => e.date >= startOfMonth)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const totalAllocations = allocations.reduce((sum, a) => sum + Number(a.amount), 0);

      // Allocated Profit = Total Revenue - Total Allocations
      const allocatedProfit = totalRevenue - totalAllocations;

      // Actual Profit = Total Revenue - Total Expenses
      const actualProfit = totalRevenue - totalExpenses;

      // Total Balance = Total Allocations - Total Expenses (what's left in khatas)
      const totalBalance = totalAllocations - totalExpenses;

      return {
        totalRevenue,
        thisMonthRevenue,
        totalExpenses,
        thisMonthExpenses,
        allocatedProfit,
        actualProfit,
        totalBalance,
        accounts,
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const data = dashboardData || {
    totalRevenue: 0,
    thisMonthRevenue: 0,
    totalExpenses: 0,
    thisMonthExpenses: 0,
    allocatedProfit: 0,
    actualProfit: 0,
    totalBalance: 0,
    accounts: [],
  };

  const metrics = [
    { label: "Total Revenue", value: formatCurrency(data.totalRevenue), icon: TrendingUp, color: "text-primary" },
    { label: "Total Expenses", value: formatCurrency(data.totalExpenses), icon: TrendingDown, color: "text-destructive" },
    { label: "Allocated Profit", value: formatCurrency(data.allocatedProfit), icon: PiggyBank, color: data.allocatedProfit >= 0 ? "text-success" : "text-destructive" },
    { label: "Actual Profit", value: formatCurrency(data.actualProfit), icon: DollarSign, color: data.actualProfit >= 0 ? "text-success" : "text-destructive" },
    { label: "Total Balance", value: formatCurrency(data.totalBalance), icon: Wallet, color: data.totalBalance >= 0 ? "text-primary" : "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your financial overview at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
              <m.icon className={cn("h-4 w-4", m.color)} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* This Month Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCurrency(data.thisMonthRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{formatCurrency(data.thisMonthExpenses)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              {data.totalRevenue > 0 ? "Charts coming in Phase 3" : "Charts will appear once you add revenue"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              {data.totalExpenses > 0 ? "Charts coming in Phase 3" : "Charts will appear once you add expenses"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
