import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, DollarSign, PiggyBank, Loader2, ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const CHART_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

export default function Dashboard() {
  const { user } = useAuth();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      const [revenuesRes, expensesRes, allocationsRes, accountsRes, sourcesRes, recentRevenuesRes, recentExpensesRes] = await Promise.all([
        supabase.from("revenues").select("amount, date").eq("user_id", user.id),
        supabase.from("expenses").select("amount, date, expense_account_id").eq("user_id", user.id),
        supabase.from("allocations").select("amount").eq("user_id", user.id),
        supabase.from("expense_accounts").select("id, name, color, allocation_percentage, is_active").eq("user_id", user.id),
        supabase.from("revenue_sources").select("id, name").eq("user_id", user.id),
        supabase.from("revenues").select("id, amount, date, description, source_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("expenses").select("id, amount, date, description, expense_account_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);

      if (revenuesRes.error) throw revenuesRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (allocationsRes.error) throw allocationsRes.error;
      if (accountsRes.error) throw accountsRes.error;
      if (sourcesRes.error) throw sourcesRes.error;
      if (recentRevenuesRes.error) throw recentRevenuesRes.error;
      if (recentExpensesRes.error) throw recentExpensesRes.error;

      const revenues = revenuesRes.data || [];
      const expenses = expensesRes.data || [];
      const allocations = allocationsRes.data || [];
      const accounts = accountsRes.data || [];
      const sources = sourcesRes.data || [];
      const recentRevenues = recentRevenuesRes.data || [];
      const recentExpenses = recentExpensesRes.data || [];

      // Build recent transactions list
      const recentTransactions = [
        ...recentRevenues.map((r) => ({
          id: r.id,
          type: "revenue" as const,
          amount: Number(r.amount),
          date: r.date,
          description: r.description || sources.find((s) => s.id === r.source_id)?.name || "Revenue",
          category: sources.find((s) => s.id === r.source_id)?.name || "Uncategorized",
          createdAt: r.created_at,
        })),
        ...recentExpenses.map((e) => ({
          id: e.id,
          type: "expense" as const,
          amount: Number(e.amount),
          date: e.date,
          description: e.description || accounts.find((a) => a.id === e.expense_account_id)?.name || "Expense",
          category: accounts.find((a) => a.id === e.expense_account_id)?.name || "",
          color: accounts.find((a) => a.id === e.expense_account_id)?.color || "#6B7280",
          createdAt: e.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
      const thisMonthRevenue = revenues
        .filter((r) => r.date >= startOfCurrentMonth)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const thisMonthExpenses = expenses
        .filter((e) => e.date >= startOfCurrentMonth)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const totalAllocations = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
      const allocatedProfit = totalRevenue - totalAllocations;
      const actualProfit = totalRevenue - totalExpenses;
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
        .map((account, index) => {
          const accountExpenses = expenses
            .filter((e) => e.expense_account_id === account.id)
            .reduce((sum, e) => sum + Number(e.amount), 0);
          return {
            name: account.name,
            value: accountExpenses,
            color: account.color || CHART_COLORS[index % CHART_COLORS.length],
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
        recentTransactions,
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
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return `${value}`;
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
    recentTransactions: [],
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
  const totalExpenseValue = data.expenseBreakdown.reduce((sum, item) => sum + item.value, 0);

  // Custom tooltip for area chart
  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="mb-2 font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {entry.dataKey === "revenue" ? "Revenue" : "Expenses"}:
              </span>
              <span className="font-medium text-foreground">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percent = ((item.value / totalExpenseValue) * 100).toFixed(1);
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.payload.color }}
            />
            <span className="font-medium text-foreground">{item.name}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCurrency(item.value)} ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your financial overview at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((m) => (
          <Card key={m.label} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
              <m.icon className={cn("h-4 w-4", m.color)} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{m.value}</p>
            </CardContent>
            <div className={cn("absolute bottom-0 left-0 h-1 w-full", m.color.replace("text-", "bg-"))} />
          </Card>
        ))}
      </div>

      {/* This Month Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCurrency(data.thisMonthRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{formatCurrency(data.thisMonthExpenses)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Trend Area Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue vs Expenses</CardTitle>
            <p className="text-sm text-muted-foreground">Last 6 months comparison</p>
          </CardHeader>
          <CardContent className="pt-4">
            {hasRevenueTrendData ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.revenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompact}
                  />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fill="url(#expenseGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>Add revenue or expenses to see trends</p>
                </div>
              </div>
            )}
            {hasRevenueTrendData && (
              <div className="mt-4 flex justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#3B82F6]" />
                  <span className="text-sm text-muted-foreground">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#EF4444]" />
                  <span className="text-sm text-muted-foreground">Expenses</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Expense Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">Spending by khata</p>
          </CardHeader>
          <CardContent className="pt-4">
            {hasExpenseBreakdownData ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {data.expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                  {data.expenseBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                      <span className="text-sm font-medium">
                        {((item.value / totalExpenseValue) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PiggyBank className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>Add expenses to see breakdown</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
          <p className="text-sm text-muted-foreground">Last 10 revenue & expense entries</p>
        </CardHeader>
        <CardContent className="pt-4">
          {data.recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {data.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        tx.type === "revenue" ? "bg-primary/10" : "bg-destructive/10"
                      )}
                    >
                      {tx.type === "revenue" ? (
                        <ArrowUpRight className="h-4 w-4 text-primary" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(tx.date), "MMM d, yyyy")}</span>
                        {tx.category && (
                          <>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              {tx.category}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "font-semibold",
                      tx.type === "revenue" ? "text-primary" : "text-destructive"
                    )}
                  >
                    {tx.type === "revenue" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Receipt className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No transactions yet</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
