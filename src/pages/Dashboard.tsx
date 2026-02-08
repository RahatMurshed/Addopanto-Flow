import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Wallet, DollarSign, PiggyBank, Loader2, ArrowUpRight, ArrowDownRight, Receipt, Plus, ArrowLeftRight } from "lucide-react";
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
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, differenceInDays, parseISO, isWithinInterval } from "date-fns";
import AdvancedDateFilter from "@/components/AdvancedDateFilter";
import ExportButtons from "@/components/ExportButtons";
import RevenueDialog from "@/components/RevenueDialog";
import ExpenseDialog from "@/components/ExpenseDialog";
import TransferDialog from "@/components/TransferDialog";
import { useCreateKhataTransfer } from "@/hooks/useKhataTransfers";
import { type DateRange, type FilterType, type FilterValue, getPreviousPeriodRange } from "@/utils/dateRangeUtils";
import { exportAllTransactionsCSV, exportToPDF } from "@/utils/exportUtils";
import PercentageChange from "@/components/PercentageChange";
import { useRevenueSources, useCreateRevenueSource } from "@/hooks/useRevenueSources";
import { useAccountBalances, useCreateExpense } from "@/hooks/useExpenses";
import { useCreateRevenue } from "@/hooks/useRevenues";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatCurrency as formatCurrencyUtil, formatCurrencyPrecise } from "@/utils/currencyUtils";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";
import { PermissionGuard } from "@/components/RoleGuard";

const CHART_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();
  const currency = userProfile?.currency || "BDT";
  
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("monthly");
  const [filterValue, setFilterValue] = useState<FilterValue>({});
  const [previousRange, setPreviousRange] = useState<DateRange | null>(null);
  
  // Quick action dialog states
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  // Hooks for quick actions
  const { data: revenueSources } = useRevenueSources();
  const { data: accountBalances } = useAccountBalances();
  const createRevenue = useCreateRevenue();
  const createExpense = useCreateExpense();
  const createRevenueSource = useCreateRevenueSource();
  const createTransfer = useCreateKhataTransfer();

  const handleFilterChange = useCallback((range: DateRange, type: FilterType, value: FilterValue) => {
    setDateRange(range);
    setFilterType(type);
    setFilterValue(value);
    setPreviousRange(getPreviousPeriodRange(type, value));
  }, []);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const now = new Date();

      const [revenuesRes, expensesRes, allocationsRes, accountsRes, sourcesRes, recentRevenuesRes, recentExpensesRes] = await Promise.all([
        supabase.from("revenues").select("amount, date").eq("user_id", user.id),
        supabase.from("expenses").select("amount, date, expense_account_id").eq("user_id", user.id),
        supabase.from("allocations").select("amount").eq("user_id", user.id),
        supabase.from("expense_accounts").select("id, name, color, allocation_percentage, is_active").eq("user_id", user.id),
        supabase.from("revenue_sources").select("id, name").eq("user_id", user.id),
        supabase.from("revenues").select("id, amount, date, description, source_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("expenses").select("id, amount, date, description, expense_account_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
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
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
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
        totalExpenses,
        allocatedProfit,
        actualProfit,
        totalBalance,
        accounts,
        sources,
        revenues,
        expenses,
        revenueTrend,
        expenseBreakdown,
        recentTransactions,
      };
    },
    enabled: !!user,
  });

  // Calculate filtered data based on date range
  const filteredData = useMemo((): {
    revenue: number;
    expenses: number;
    expenseBreakdown: { name: string; value: number; color: string }[];
    filteredRevenues?: any[];
    filteredExpenses?: any[];
  } => {
    if (!dashboardData || !dateRange) return { revenue: 0, expenses: 0, expenseBreakdown: [] };
    
    const filteredRevenues = (dashboardData.revenues || []).filter(
      (r: any) => r.date >= dateRange.start && r.date <= dateRange.end
    );
    const filteredExpenses = (dashboardData.expenses || []).filter(
      (e: any) => e.date >= dateRange.start && e.date <= dateRange.end
    );

    const revenue = filteredRevenues.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
    const expenses = filteredExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    const expenseBreakdown = (dashboardData.accounts || [])
      .map((account: any, index: number) => {
        const accountExpenses = filteredExpenses
          .filter((e: any) => e.expense_account_id === account.id)
          .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        return {
          name: account.name as string,
          value: accountExpenses,
          color: (account.color || CHART_COLORS[index % CHART_COLORS.length]) as string,
        };
      })
      .filter((item) => item.value > 0);

    return { revenue, expenses, expenseBreakdown, filteredRevenues, filteredExpenses };
  }, [dashboardData, dateRange]);

  // Calculate filtered revenue trend based on date range
  const filteredRevenueTrend = useMemo(() => {
    if (!dateRange || !filteredData.filteredRevenues || !filteredData.filteredExpenses) {
      return [];
    }

    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    const daysDiff = differenceInDays(end, start);

    // For ranges <= 31 days, show daily data points
    if (daysDiff <= 31) {
      const days = eachDayOfInterval({ start, end });
      return days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayRevenue = (filteredData.filteredRevenues || [])
          .filter((r: any) => r.date === dayStr)
          .reduce((sum: number, r: any) => sum + Number(r.amount), 0);
        const dayExpenses = (filteredData.filteredExpenses || [])
          .filter((e: any) => e.date === dayStr)
          .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        return {
          month: format(day, "MMM d"),
          revenue: dayRevenue,
          expenses: dayExpenses,
        };
      });
    }

    // For longer ranges, aggregate by month
    const months = eachMonthOfInterval({ start, end });
    return months.map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthStartStr = format(monthStart, "yyyy-MM-dd");
      const monthEndStr = format(monthEnd, "yyyy-MM-dd");

      const monthRevenue = (filteredData.filteredRevenues || [])
        .filter((r: any) => r.date >= monthStartStr && r.date <= monthEndStr)
        .reduce((sum: number, r: any) => sum + Number(r.amount), 0);
      const monthExpenses = (filteredData.filteredExpenses || [])
        .filter((e: any) => e.date >= monthStartStr && e.date <= monthEndStr)
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      return {
        month: format(monthDate, "MMM yyyy"),
        revenue: monthRevenue,
        expenses: monthExpenses,
      };
    });
  }, [dateRange, filteredData.filteredRevenues, filteredData.filteredExpenses]);

  // Calculate previous period data for comparison
  const previousData = useMemo((): { revenue: number; expenses: number } => {
    if (!dashboardData || !previousRange) return { revenue: 0, expenses: 0 };

    const prevRevenues = (dashboardData.revenues || []).filter(
      (r: any) => r.date >= previousRange.start && r.date <= previousRange.end
    );
    const prevExpenses = (dashboardData.expenses || []).filter(
      (e: any) => e.date >= previousRange.start && e.date <= previousRange.end
    );

    return {
      revenue: prevRevenues.reduce((sum: number, r: any) => sum + Number(r.amount), 0),
      expenses: prevExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0),
    };
  }, [dashboardData, previousRange]);

  // Export handlers
  const handleExportCSV = () => {
    if (!dashboardData || !dateRange) return;
    
    const revenues = (filteredData.filteredRevenues || []).map((r: any) => ({
      date: r.date,
      amount: Number(r.amount),
      sourceName: dashboardData.sources?.find((s: any) => s.id === r.source_id)?.name || "Uncategorized",
      description: r.description,
    }));
    
    const expenses = (filteredData.filteredExpenses || []).map((e: any) => ({
      date: e.date,
      amount: Number(e.amount),
      accountName: dashboardData.accounts?.find((a: any) => a.id === e.expense_account_id)?.name || "Uncategorized",
      description: e.description,
    }));
    
    exportAllTransactionsCSV(revenues, expenses, dateRange.label);
  };

  const handleExportPDF = async () => {
    if (!dateRange) return;
    await exportToPDF("dashboard-content", "dashboard", "Dashboard Report", dateRange.label, userProfile?.business_name || undefined);
  };

  // Define data object before any conditional returns (required for hooks)
  const data = dashboardData || {
    totalRevenue: 0,
    totalExpenses: 0,
    allocatedProfit: 0,
    actualProfit: 0,
    totalBalance: 0,
    accounts: [],
    sources: [],
    revenues: [],
    expenses: [],
    revenueTrend: [],
    expenseBreakdown: [],
    recentTransactions: [],
  };

  // Pagination for recent transactions (must be called before conditional returns)
  const transactionsPagination = usePagination(data.recentTransactions);

  const formatCurrency = (amount: number) => {
    return formatCurrencyPrecise(amount, currency);
  };

  const formatCompact = (value: number) => {
    return formatCurrencyUtil(value, currency, { compact: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  const metrics = [
    { label: "Total Revenue", value: formatCurrency(data.totalRevenue), icon: TrendingUp, color: "text-primary" },
    { label: "Total Expenses", value: formatCurrency(data.totalExpenses), icon: TrendingDown, color: "text-destructive" },
    { label: "Allocated Profit", value: formatCurrency(data.allocatedProfit), icon: PiggyBank, color: data.allocatedProfit >= 0 ? "text-success" : "text-destructive" },
    { label: "Actual Profit", value: formatCurrency(data.actualProfit), icon: DollarSign, color: data.actualProfit >= 0 ? "text-success" : "text-destructive" },
    { label: "Total Balance", value: formatCurrency(data.totalBalance), icon: Wallet, color: data.totalBalance >= 0 ? "text-primary" : "text-destructive" },
  ];

  const hasRevenueTrendData = filteredRevenueTrend.length > 0 && filteredRevenueTrend.some((d) => d.revenue > 0 || d.expenses > 0);
  const hasFilteredBreakdown = filteredData.expenseBreakdown.length > 0;
  const totalFilteredExpense = filteredData.expenseBreakdown.reduce((sum, item) => sum + item.value, 0);
  const hasExpenseBreakdownData = filteredData.expenseBreakdown.length > 0;

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
      const percent = totalFilteredExpense > 0 ? ((item.value / totalFilteredExpense) * 100).toFixed(1) : "0";
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
    <div className="space-y-6" id="dashboard-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your financial overview at a glance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Action Buttons - Only visible with proper permissions */}
          <PermissionGuard permission="canAddRevenue">
            <Button
              size="sm"
              onClick={() => setRevenueDialogOpen(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Revenue
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="canAddExpense">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpenseDialogOpen(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="canAddExpense">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTransferDialogOpen(true)}
              disabled={(accountBalances?.length || 0) < 2}
              className="gap-1"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </Button>
          </PermissionGuard>
          <ExportButtons
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            disabled={!dateRange}
          />
        </div>
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

      {/* Filtered Period Summary */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2">
          <CardTitle className="text-base font-semibold">Period Overview</CardTitle>
          <AdvancedDateFilter onFilterChange={handleFilterChange} defaultFilterType="monthly" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(filteredData.revenue)}</p>
              {previousRange && (
                <PercentageChange
                  current={filteredData.revenue}
                  previous={previousData.revenue}
                  label={previousRange.label}
                  className="mt-1"
                />
              )}
            </div>
            <div className="rounded-lg bg-gradient-to-br from-destructive/5 to-destructive/10 border border-destructive/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">Expenses</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(filteredData.expenses)}</p>
              {previousRange && (
                <PercentageChange
                  current={filteredData.expenses}
                  previous={previousData.expenses}
                  label={previousRange.label}
                  invertColors
                  className="mt-1"
                />
              )}
            </div>
            <div className={cn(
              "rounded-lg border p-4",
              filteredData.revenue - filteredData.expenses >= 0
                ? "bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20"
                : "bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20"
            )}>
              <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
              <p className={cn(
                "text-2xl font-bold",
                filteredData.revenue - filteredData.expenses >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
              )}>
                {formatCurrency(filteredData.revenue - filteredData.expenses)}
              </p>
              {previousRange && (
                <PercentageChange
                  current={filteredData.revenue - filteredData.expenses}
                  previous={previousData.revenue - previousData.expenses}
                  label={previousRange.label}
                  className="mt-1"
                />
              )}
            </div>
          </div>
          
          {/* Filtered Period Expense Breakdown */}
          {hasFilteredBreakdown && dateRange && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-3">Expense Breakdown for {dateRange.label}</p>
              <div className="space-y-2">
                {filteredData.expenseBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                      <span className="text-xs text-muted-foreground">
                        ({((item.value / totalFilteredExpense) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Trend Area Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue vs Expenses</CardTitle>
            <p className="text-sm text-muted-foreground">{dateRange?.label || "Select a date range"}</p>
          </CardHeader>
          <CardContent className="pt-4">
            {hasRevenueTrendData ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={filteredRevenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                No transaction data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Expense Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Spending by category - {dateRange?.label || "Select a date range"}</p>
          </CardHeader>
          <CardContent className="pt-4">
            {hasExpenseBreakdownData ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={filteredData.expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {filteredData.expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid w-full grid-cols-2 gap-2">
                  {filteredData.expenseBreakdown.slice(0, 6).map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                No expense data for selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
          <p className="text-sm text-muted-foreground">Latest income and expenses</p>
        </CardHeader>
        <CardContent>
          {data.recentTransactions.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Expense Source</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsPagination.paginatedItems.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(tx.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                              tx.type === "revenue"
                                ? "bg-primary/10 text-primary"
                                : "bg-destructive/10 text-destructive"
                            )}
                          >
                            {tx.type === "revenue" ? (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span className="font-medium">{tx.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tx.type === "expense" && tx.category ? (
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                            style={{ 
                              backgroundColor: tx.color ? `${tx.color}20` : undefined,
                              color: tx.color || undefined,
                              borderColor: tx.color ? `${tx.color}40` : undefined
                            }}
                          >
                            {tx.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.type === "revenue" && tx.category ? (
                          <Badge variant="outline" className="text-xs text-primary border-primary/30">
                            {tx.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "font-bold",
                            tx.type === "revenue" ? "text-primary" : "text-destructive"
                          )}
                        >
                          {tx.type === "revenue" ? "+" : "-"}{formatCurrency(tx.amount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={transactionsPagination.currentPage}
                totalPages={transactionsPagination.totalPages}
                totalItems={transactionsPagination.totalItems}
                startIndex={transactionsPagination.startIndex}
                endIndex={transactionsPagination.endIndex}
                itemsPerPage={transactionsPagination.itemsPerPage}
                onPageChange={transactionsPagination.goToPage}
                onItemsPerPageChange={transactionsPagination.setItemsPerPage}
                canGoNext={transactionsPagination.canGoNext}
                canGoPrev={transactionsPagination.canGoPrev}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Receipt className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No transactions yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Action Dialogs */}
      <RevenueDialog
        open={revenueDialogOpen}
        onOpenChange={setRevenueDialogOpen}
        sources={revenueSources || []}
        onSave={async (data) => {
          await createRevenue.mutateAsync({
            amount: data.amount,
            date: data.date,
            source_id: data.source_id,
            description: data.description,
          });
        }}
        onCreateSource={async (name) => {
          await createRevenueSource.mutateAsync(name);
        }}
      />

      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        accounts={accountBalances || []}
        onSave={async (data) => {
          await createExpense.mutateAsync({
            amount: data.amount,
            date: data.date,
            expense_account_id: data.expense_account_id,
            description: data.description,
          });
        }}
      />

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        accounts={accountBalances || []}
        onTransfer={async (data) => {
          await createTransfer.mutateAsync(data);
        }}
        isPending={createTransfer.isPending}
      />
    </div>
  );
}
