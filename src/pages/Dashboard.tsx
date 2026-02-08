import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, DollarSign, PiggyBank, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      // Fetch all data in parallel
      const [revenuesRes, expensesRes, allocationsRes, accountsRes] = await Promise.all([
        supabase.from("revenues").select("amount, date").eq("user_id", user.id),
        supabase.from("expenses").select("amount, date, expense_account_id").eq("user_id", user.id),
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
        .filter((r) => r.date >= startOfCurrentMonth)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const thisMonthExpenses = expenses
        .filter((e) => e.date >= startOfCurrentMonth)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const totalAllocations = allocations.reduce((sum, a) => sum + Number(a.amount), 0);

      // Allocated Profit = Total Revenue - Total Allocations
      const allocatedProfit = totalRevenue - totalAllocations;

      // Actual Profit = Total Revenue - Total Expenses
      const actualProfit = totalRevenue - totalExpenses;

      // Total Balance = Total Allocations - Total Expenses (what's left in khatas)
      const totalBalance = totalAllocations - totalExpenses;

      // Revenue trend data (last 6 months)
      const revenueTrend: { month: string; revenue: number; expenses: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
        const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
        const monthLabel = format(monthDate, "MMM");

        const monthRevenue = revenues
          .filter((r) => r.date >= monthStart && r.date <= monthEnd)
          .reduce((sum, r) => sum + Number(r.amount), 0);

        const monthExpenses = expenses
          .filter((e) => e.date >= monthStart && e.date <= monthEnd)
          .reduce((sum, e) => sum + Number(e.amount), 0);

        revenueTrend.push({ month: monthLabel, revenue: monthRevenue, expenses: monthExpenses });
      }

      // Expense breakdown by account
      const expenseBreakdown = accounts
        .map((account) => {
          const accountExpenses = expenses
            .filter((e) => e.expense_account_id === account.id)
            .reduce((sum, e) => sum + Number(e.amount), 0);
          return {
            name: account.name,
            value: accountExpenses,
            color: account.color,
          };
        })
        .filter((item) => item.value > 0);

      return {
        totalRevenue,
        thisMonthRevenue,
        totalExpenses,
        thisMonthExpenses,
        allocatedProfit,
        actualProfit,
        totalBalance,
        accounts,
        revenueTrend,
        expenseBreakdown,
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

  const formatCompact = (value: number) => {
    if (value >= 1000000) return `৳${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `৳${(value / 1000).toFixed(0)}K`;
    return `৳${value}`;
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
    revenueTrend: [],
    expenseBreakdown: [],
  };

  const metrics = [
    { label: "Total Revenue", value: formatCurrency(data.totalRevenue), icon: TrendingUp, color: "text-primary" },
    { label: "Total Expenses", value: formatCurrency(data.totalExpenses), icon: TrendingDown, color: "text-destructive" },
    { label: "Allocated Profit", value: formatCurrency(data.allocatedProfit), icon: PiggyBank, color: data.allocatedProfit >= 0 ? "text-success" : "text-destructive" },
    { label: "Actual Profit", value: formatCurrency(data.actualProfit), icon: DollarSign, color: data.actualProfit >= 0 ? "text-success" : "text-destructive" },
    { label: "Total Balance", value: formatCurrency(data.totalBalance), icon: Wallet, color: data.totalBalance >= 0 ? "text-primary" : "text-destructive" },
  ];

  const hasRevenueTrendData = data.revenueTrend.some((d) => d.revenue > 0 || d.expenses > 0);
  const hasExpenseBreakdownData = data.expenseBreakdown.length > 0;

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
        {/* Revenue Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue vs Expenses Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {hasRevenueTrendData ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.revenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={formatCompact}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "revenue" ? "Revenue" : "Expenses",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Legend
                    formatter={(value) => (value === "revenue" ? "Revenue" : "Expenses")}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-60 items-center justify-center text-muted-foreground">
                Add revenue or expenses to see the trend chart
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Breakdown by Khata</CardTitle>
          </CardHeader>
          <CardContent>
            {hasExpenseBreakdownData ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
                  >
                    {data.expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Spent"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-60 items-center justify-center text-muted-foreground">
                Add expenses to see the breakdown chart
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
