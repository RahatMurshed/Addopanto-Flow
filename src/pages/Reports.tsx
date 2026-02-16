import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, TrendingUp, TrendingDown, Wallet, FileText, ArrowLeftRight, Percent, Calculator, Calendar, BarChart3 } from "lucide-react";
import { SkeletonCards, SkeletonChart, SkeletonTable } from "@/components/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";
import { format, endOfMonth, getYear, parseISO, startOfMonth, differenceInDays, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { useKhataTransfers } from "@/hooks/useKhataTransfers";
import { useAccountBalances } from "@/hooks/useExpenses";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { useCompany } from "@/contexts/CompanyContext";
import TransferHistoryCard from "@/components/TransferHistoryCard";
import AdvancedDateFilter from "@/components/AdvancedDateFilter";
import ExportButtons from "@/components/ExportButtons";
import PercentageChange from "@/components/PercentageChange";
import { type DateRange, type FilterType, type FilterValue } from "@/utils/dateRangeUtils";
import { exportAllTransactionsCSV, exportToPDF } from "@/utils/exportUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, ReferenceLine } from "recharts";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";

// Chart colors using HSL values that work with both themes
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(142, 76%, 36%)", // green
  "hsl(38, 92%, 50%)", // orange
  "hsl(262, 83%, 58%)", // purple
  "hsl(199, 89%, 48%)", // blue
  "hsl(346, 77%, 49%)", // pink
  "hsl(24, 94%, 50%)", // amber
];

export default function Reports() {
  const { user } = useAuth();
  const { activeCompany, isDataEntryOperator, isLoading: companyLoading } = useCompany();
  const { fcp, fc } = useCompanyCurrency();
  const navigate = useNavigate();

  // Redirect DEO away from reports
  useEffect(() => {
    if (!companyLoading && isDataEntryOperator) {
      navigate("/dashboard", { replace: true });
    }
  }, [companyLoading, isDataEntryOperator, navigate]);
  
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const { data: transfers = [] } = useKhataTransfers();
  const { data: accounts = [] } = useAccountBalances();

  const handleFilterChange = useCallback((range: DateRange, filterType: FilterType, filterValue: FilterValue) => {
    setDateRange(range);
  }, []);

  const activeCompanyId = activeCompany?.id ?? null;

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["reports", user?.id, activeCompanyId],
    queryFn: async () => {
      if (!user || !activeCompanyId) return null;

      const [revenuesRes, expensesRes, allocationsRes, accountsRes, sourcesRes] = await Promise.all([
        supabase.from("revenues").select("*").eq("company_id", activeCompanyId),
        supabase.from("expenses").select("*").eq("company_id", activeCompanyId),
        supabase.from("allocations").select("*").eq("company_id", activeCompanyId),
        supabase.from("expense_accounts").select("*").eq("company_id", activeCompanyId),
        supabase.from("revenue_sources").select("*").eq("company_id", activeCompanyId),
      ]);

      if (revenuesRes.error) throw revenuesRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (allocationsRes.error) throw allocationsRes.error;
      if (accountsRes.error) throw accountsRes.error;
      if (sourcesRes.error) throw sourcesRes.error;

      return {
        revenues: revenuesRes.data || [],
        expenses: expensesRes.data || [],
        allocations: allocationsRes.data || [],
        accounts: accountsRes.data || [],
        sources: sourcesRes.data || [],
      };
    },
    enabled: !!user && !!activeCompanyId,
  });

  // Get available years from data
  const availableYears = useMemo(() => {
    if (!reportData) return [new Date().getFullYear()];
    
    const years = new Set<number>();
    reportData.revenues.forEach((r) => years.add(getYear(new Date(r.date))));
    reportData.expenses.forEach((e) => years.add(getYear(new Date(e.date))));
    
    // Always include current year
    years.add(new Date().getFullYear());
    
    return Array.from(years).sort((a, b) => b - a); // Descending order
  }, [reportData]);

  // Filter data based on date range
  const filteredData = useMemo(() => {
    if (!reportData || !dateRange) return { revenues: [], expenses: [], allocations: [] };

    const filterByDate = (date: string) => {
      return date >= dateRange.start && date <= dateRange.end;
    };

    return {
      revenues: reportData.revenues.filter((r) => filterByDate(r.date)),
      expenses: reportData.expenses.filter((e) => filterByDate(e.date)),
      allocations: reportData.allocations,
    };
  }, [reportData, dateRange]);

  // Calculate summaries
  const summary = useMemo(() => {
    const totalRevenue = filteredData.revenues.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;
    const transactionCount = filteredData.revenues.length + filteredData.expenses.length;

    return { totalRevenue, totalExpenses, netProfit, transactionCount };
  }, [filteredData]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const profitMargin = summary.totalRevenue > 0 
      ? (summary.netProfit / summary.totalRevenue) * 100 
      : 0;
    
    const avgRevenue = filteredData.revenues.length > 0 
      ? summary.totalRevenue / filteredData.revenues.length 
      : 0;
    
    const avgExpense = filteredData.expenses.length > 0 
      ? summary.totalExpenses / filteredData.expenses.length 
      : 0;

    return { profitMargin, avgRevenue, avgExpense };
  }, [summary, filteredData]);

  // Dynamic breakdown based on date range
  const chartBreakdown = useMemo(() => {
    if (!reportData || !dateRange) return [];
    
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    const daysDiff = differenceInDays(end, start);

    // For ranges <= 31 days, show daily data points
    if (daysDiff <= 31) {
      const days = eachDayOfInterval({ start, end });
      return days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayRevenue = filteredData.revenues
          .filter((r) => r.date === dayStr)
          .reduce((sum, r) => sum + Number(r.amount), 0);
        const dayExpenses = filteredData.expenses
          .filter((e) => e.date === dayStr)
          .reduce((sum, e) => sum + Number(e.amount), 0);
        return {
          month: format(day, "MMM d"),
          monthShort: format(day, "d"),
          revenue: dayRevenue,
          expenses: dayExpenses,
          profit: dayRevenue - dayExpenses,
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

      const monthRevenue = filteredData.revenues
        .filter((r) => r.date >= monthStartStr && r.date <= monthEndStr)
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const monthExpenses = filteredData.expenses
        .filter((e) => e.date >= monthStartStr && e.date <= monthEndStr)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        month: format(monthDate, "MMMM"),
        monthShort: format(monthDate, "MMM"),
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      };
    });
  }, [reportData, dateRange, filteredData]);

  // Pagination for chart breakdown
  const monthlyPagination = usePagination(chartBreakdown, { defaultItemsPerPage: 6 });

  // Reset page when date range changes
  useEffect(() => {
    monthlyPagination.resetPage();
  }, [dateRange]);

  // Year-over-Year comparison
  const yoyComparison = useMemo(() => {
    if (!reportData) return null;

    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    const currentYearStart = `${currentYear}-01-01`;
    const currentYearEnd = `${currentYear}-12-31`;
    const previousYearStart = `${previousYear}-01-01`;
    const previousYearEnd = `${previousYear}-12-31`;

    const currentRevenue = reportData.revenues
      .filter((r) => r.date >= currentYearStart && r.date <= currentYearEnd)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const previousRevenue = reportData.revenues
      .filter((r) => r.date >= previousYearStart && r.date <= previousYearEnd)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const currentExpenses = reportData.expenses
      .filter((e) => e.date >= currentYearStart && e.date <= currentYearEnd)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const previousExpenses = reportData.expenses
      .filter((e) => e.date >= previousYearStart && e.date <= previousYearEnd)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      currentYear,
      previousYear,
      currentRevenue,
      previousRevenue,
      currentExpenses,
      previousExpenses,
      currentProfit: currentRevenue - currentExpenses,
      previousProfit: previousRevenue - previousExpenses,
    };
  }, [reportData]);

  // Expense breakdown by khata for pie chart
  const expenseByKhata = useMemo(() => {
    if (!reportData) return [];

    const khataExpenses = reportData.accounts.map((account) => {
      const total = filteredData.expenses
        .filter((e) => e.expense_account_id === account.id)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        name: account.name,
        value: total,
        color: account.color,
      };
    }).filter((k) => k.value > 0);

    return khataExpenses;
  }, [reportData, filteredData]);

  // Revenue breakdown by source for pie chart
  const revenueBySource = useMemo(() => {
    if (!reportData) return [];

    const sourceRevenues = reportData.sources.map((source, index) => {
      const total = filteredData.revenues
        .filter((r) => r.source_id === source.id)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      return {
        name: source.name,
        value: total,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    }).filter((s) => s.value > 0);

    // Add uncategorized revenues
    const uncategorizedRevenue = filteredData.revenues
      .filter((r) => !r.source_id)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    if (uncategorizedRevenue > 0) {
      sourceRevenues.push({
        name: "Uncategorized",
        value: uncategorizedRevenue,
        color: "hsl(var(--muted-foreground))",
      });
    }

    return sourceRevenues;
  }, [reportData, filteredData]);

  // Account-wise breakdown
  const accountBreakdown = useMemo(() => {
    if (!reportData) return [];

    return reportData.accounts.map((account) => {
      const accountExpenses = filteredData.expenses
        .filter((e) => e.expense_account_id === account.id)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const accountAllocations = reportData.allocations
        .filter((a) => a.expense_account_id === account.id)
        .reduce((sum, a) => sum + Number(a.amount), 0);

      const balance = accountAllocations - accountExpenses;

      return {
        id: account.id,
        name: account.name,
        color: account.color,
        allocated: accountAllocations,
        spent: accountExpenses,
        balance,
        percentage: account.allocation_percentage,
      };
    });
  }, [reportData, filteredData]);

  // Revenue source breakdown
  const sourceBreakdown = useMemo(() => {
    if (!reportData) return [];

    return reportData.sources.map((source) => {
      const sourceRevenue = filteredData.revenues
        .filter((r) => r.source_id === source.id)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      return {
        id: source.id,
        name: source.name,
        amount: sourceRevenue,
        count: filteredData.revenues.filter((r) => r.source_id === source.id).length,
      };
    });
  }, [reportData, filteredData]);

  const formatCurrency = fcp;

  // Export handlers
  const handleExportCSV = () => {
    if (!reportData || !dateRange) return;
    
    const revenues = filteredData.revenues.map((r) => ({
      date: r.date,
      amount: Number(r.amount),
      sourceName: reportData.sources.find((s) => s.id === r.source_id)?.name || "Uncategorized",
      description: r.description,
    }));

    const expenses = filteredData.expenses.map((e) => ({
      date: e.date,
      amount: Number(e.amount),
      accountName: reportData.accounts.find((a) => a.id === e.expense_account_id)?.name || "Uncategorized",
      description: e.description,
    }));

    exportAllTransactionsCSV(revenues, expenses, dateRange.label);
  };

  const handleExportPDF = async () => {
    if (!dateRange) return;
    await exportToPDF("reports-content", "reports", "Financial Report", dateRange.label, activeCompany?.name || undefined);
  };

  // CSV Export functions for individual tabs
  const downloadCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => `"${row[h.toLowerCase().replace(/ /g, "_")] ?? ""}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${dateRange?.label.replace(/[^a-zA-Z0-9]/g, "_") || "report"}.csv`;
    link.click();
  };

  const exportMonthlySummary = () => {
    const data = chartBreakdown.map((m) => ({
      month: m.month,
      revenue: m.revenue,
      expenses: m.expenses,
      profit: m.profit,
    }));
    downloadCSV(data, "period_summary", ["Month", "Revenue", "Expenses", "Profit"]);
  };

  const exportAccountBreakdown = () => {
    const data = accountBreakdown.map((a) => ({
      name: a.name,
      allocated: a.allocated,
      spent: a.spent,
      balance: a.balance,
      percentage: a.percentage,
    }));
    downloadCSV(data, "account_breakdown", ["Name", "Allocated", "Spent", "Balance", "Percentage"]);
  };

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for profit line chart
  const CustomProfitTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const profit = payload[0].value;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className={cn("text-sm font-medium", profit >= 0 ? "text-success" : "text-destructive")}>
            Profit: {formatCurrency(profit)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom pie label renderer
  const RADIAN = Math.PI / 180;
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
        {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  // Custom tooltip for pie chart (works for any pie chart data)
  const createPieTooltip = (chartData: { name: string; value: number }[]) => {
    return ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0];
        const total = chartData.reduce((sum, k) => sum + k.value, 0);
        const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
        
        return (
          <div className="rounded-lg border bg-background p-3 shadow-lg">
            <p className="font-medium">{data.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(data.value)} ({percentage}%)
            </p>
          </div>
        );
      }
      return null;
    };
  };

  const ExpensePieTooltip = createPieTooltip(expenseByKhata);
  const RevenuePieTooltip = createPieTooltip(revenueBySource);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <SkeletonCards count={4} />
        <SkeletonChart />
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="reports-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Financial summaries and analytics</p>
        </div>
        <ExportButtons
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          disabled={!dateRange}
        />
      </div>

      {/* Advanced Date Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <AdvancedDateFilter onFilterChange={handleFilterChange} defaultFilterType="monthly" />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(summary.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(summary.totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
            <Wallet className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-bold", summary.netProfit >= 0 ? "text-success" : "text-destructive")}>
              {formatCurrency(summary.netProfit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.transactionCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-bold", kpis.profitMargin >= 0 ? "text-success" : "text-destructive")}>
              {kpis.profitMargin.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Net profit as % of revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Revenue/Entry</CardTitle>
            <Calculator className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(kpis.avgRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{filteredData.revenues.length} revenue entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Expense/Entry</CardTitle>
            <Calculator className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(kpis.avgExpense)}</p>
            <p className="text-xs text-muted-foreground mt-1">{filteredData.expenses.length} expense entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Year-over-Year Comparison */}
      {yoyComparison && (yoyComparison.previousRevenue > 0 || yoyComparison.previousExpenses > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Year-over-Year Comparison ({yoyComparison.previousYear} vs {yoyComparison.currentYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-lg font-semibold text-success">{formatCurrency(yoyComparison.currentRevenue)}</p>
                <PercentageChange 
                  current={yoyComparison.currentRevenue} 
                  previous={yoyComparison.previousRevenue}
                  label={String(yoyComparison.previousYear)}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="text-lg font-semibold text-destructive">{formatCurrency(yoyComparison.currentExpenses)}</p>
                <PercentageChange 
                  current={yoyComparison.currentExpenses} 
                  previous={yoyComparison.previousExpenses}
                  label={String(yoyComparison.previousYear)}
                  invertColors
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={cn("text-lg font-semibold", yoyComparison.currentProfit >= 0 ? "text-success" : "text-destructive")}>
                  {formatCurrency(yoyComparison.currentProfit)}
                </p>
                <PercentageChange 
                  current={yoyComparison.currentProfit} 
                  previous={yoyComparison.previousProfit}
                  label={String(yoyComparison.previousYear)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar Chart - Revenue vs Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Overview - {dateRange?.label || "Select a period"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="monthShort" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => fc(value, { compact: true })} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <BarChart3 className="h-8 w-8" />
                  <p>No data for selected period</p>
                  <p className="text-xs">Add revenue or expenses to see trends</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Line Chart - Profit Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Profit Trend - {dateRange?.label || "Select a period"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="monthShort" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => fc(value, { compact: true })} />
                    <Tooltip content={<CustomProfitTooltip />} />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      name="Profit" 
                      stroke="hsl(142, 76%, 36%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(142, 76%, 36%)', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: 'hsl(142, 76%, 36%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-8 w-8" />
                  <p>No profit data yet</p>
                  <p className="text-xs">Revenue and expense entries will generate profit trends</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Revenue by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Revenue by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {revenueBySource.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueBySource}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {revenueBySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<RevenuePieTooltip />} />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      formatter={(value: string) => {
                        const item = revenueBySource.find(s => s.name === value);
                        return <span className="text-sm text-foreground">{value} ({item ? fc(item.value, { compact: true }) : ''})</span>;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-8 w-8" />
                  <p>No revenue data for selected period</p>
                  <p className="text-xs">Add revenue entries to see source breakdown</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Expense by Expense Source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Expense Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {expenseByKhata.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByKhata}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {expenseByKhata.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ExpensePieTooltip />} />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      formatter={(value: string) => {
                        const item = expenseByKhata.find(k => k.name === value);
                        return <span className="text-sm text-foreground">{value} ({item ? fc(item.value, { compact: true }) : ''})</span>;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <TrendingDown className="h-8 w-8" />
                  <p>No expense data for selected period</p>
                  <p className="text-xs">Add expenses to see distribution by khata</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
          <TabsTrigger value="accounts">By Expense Sources</TabsTrigger>
          <TabsTrigger value="sources">By Source</TabsTrigger>
          <TabsTrigger value="transfers">
            <ArrowLeftRight className="mr-1 h-4 w-4" />
            Transfers
          </TabsTrigger>
        </TabsList>

        {/* Period Summary Tab */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>Period Breakdown - {dateRange?.label || "Select a period"}</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={exportMonthlySummary}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyPagination.paginatedItems.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell className="font-medium">{row.month}</TableCell>
                        <TableCell className="text-right text-success">{formatCurrency(row.revenue)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatCurrency(row.expenses)}</TableCell>
                        <TableCell className={cn("text-right font-medium", row.profit >= 0 ? "text-success" : "text-destructive")}>
                          {formatCurrency(row.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right text-success">
                        {formatCurrency(chartBreakdown.reduce((sum, m) => sum + m.revenue, 0))}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(chartBreakdown.reduce((sum, m) => sum + m.expenses, 0))}
                      </TableCell>
                      <TableCell className={cn("text-right", chartBreakdown.reduce((sum, m) => sum + m.profit, 0) >= 0 ? "text-success" : "text-destructive")}>
                        {formatCurrency(chartBreakdown.reduce((sum, m) => sum + m.profit, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div data-pdf-hide>
                <TablePagination
                  currentPage={monthlyPagination.currentPage}
                  totalPages={monthlyPagination.totalPages}
                  totalItems={monthlyPagination.totalItems}
                  startIndex={monthlyPagination.startIndex}
                  endIndex={monthlyPagination.endIndex}
                  itemsPerPage={monthlyPagination.itemsPerPage}
                  onPageChange={monthlyPagination.goToPage}
                  onItemsPerPageChange={monthlyPagination.setItemsPerPage}
                  canGoNext={monthlyPagination.canGoNext}
                  canGoPrev={monthlyPagination.canGoPrev}
                  itemsPerPageOptions={[6, 12]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Breakdown Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Khata Breakdown{dateRange ? ` - ${dateRange.label}` : ""}</CardTitle>
              <Button variant="outline" size="sm" onClick={exportAccountBreakdown}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Khata</TableHead>
                      <TableHead className="text-right">Allocation %</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No khatas found
                        </TableCell>
                      </TableRow>
                    ) : (
                      accountBreakdown.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: account.color }}
                              />
                              <span className="font-medium">{account.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{account.percentage}%</TableCell>
                          <TableCell className="text-right text-success">{formatCurrency(account.allocated)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatCurrency(account.spent)}</TableCell>
                          <TableCell className={cn("text-right font-medium", account.balance >= 0 ? "text-success" : "text-destructive")}>
                            {formatCurrency(account.balance)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Source Breakdown Tab */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Source{dateRange ? ` - ${dateRange.label}` : ""}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No revenue sources found
                        </TableCell>
                      </TableRow>
                    ) : (
                      sourceBreakdown.map((source) => (
                        <TableRow key={source.id}>
                          <TableCell className="font-medium">{source.name}</TableCell>
                          <TableCell className="text-right">{source.count}</TableCell>
                          <TableCell className="text-right text-success font-medium">
                            {formatCurrency(source.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {sourceBreakdown.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">
                          {sourceBreakdown.reduce((sum, s) => sum + s.count, 0)}
                        </TableCell>
                        <TableCell className="text-right text-success">
                          {formatCurrency(sourceBreakdown.reduce((sum, s) => sum + s.amount, 0))}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers" className="space-y-4">
          <TransferHistoryCard
            transfers={transfers}
            accounts={accounts}
            onDelete={async () => {}}
            isDeleting={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
