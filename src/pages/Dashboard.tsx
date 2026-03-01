import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Wallet, DollarSign, PiggyBank, ArrowUpRight, ArrowDownRight, Receipt, Plus, ArrowLeftRight, GraduationCap, CreditCard, Layers, BookOpen, Landmark, HandCoins, ShieldAlert } from "lucide-react";
import { SkeletonCards, SkeletonChart, SkeletonTable } from "@/components/shared/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { getSourceBadgeStyle } from "@/utils/sourceColors";
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
  Legend,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, differenceInDays, parseISO, isWithinInterval } from "date-fns";
import AdvancedDateFilter from "@/components/shared/AdvancedDateFilter";
import ExportButtons from "@/components/shared/ExportButtons";
import RevenueDialog from "@/components/dialogs/RevenueDialog";
import ExpenseDialog from "@/components/dialogs/ExpenseDialog";
import TransferDialog from "@/components/dialogs/TransferDialog";
import StudentDialog from "@/components/dialogs/StudentDialog";
import BatchDialog from "@/components/dialogs/BatchDialog";
import { useCreateKhataTransfer } from "@/hooks/useKhataTransfers";
import { type DateRange, type FilterType, type FilterValue, getPreviousPeriodRange } from "@/utils/dateRangeUtils";
import { exportAllTransactionsCSV, exportToPDF } from "@/utils/exportUtils";
import PercentageChange from "@/components/finance/PercentageChange";
import { useRevenueSources, useCreateRevenueSource } from "@/hooks/useRevenueSources";
import { useAccountBalances, useCreateExpense } from "@/hooks/useExpenses";
import { useCreateRevenue } from "@/hooks/useRevenues";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/shared/TablePagination";
import { useCompany } from "@/contexts/CompanyContext";
import { PermissionGuard } from "@/components/auth/RoleGuard";
import { useCreateStudent } from "@/hooks/useStudents";
import { useCreateBatch } from "@/hooks/useBatches";


const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)", "hsl(346, 77%, 49%)", "hsl(24, 94%, 50%)", "hsl(var(--destructive))",
  "hsl(180, 60%, 40%)", "hsl(290, 60%, 50%)",
];

export default function Dashboard() {
  const { user } = useAuth();
  const {
    activeCompanyId, activeCompany, isModerator, isCipher, isCompanyAdmin, membership,
    isDataEntryModerator, isTraditionalModerator,
    canAddStudent, canAddPayment, canAddBatch, canAddRevenue, canAddExpense, canAddCourse,
    
    canViewDashboardMetrics,
  } = useCompany();

  const { fc: formatCurrencyFn, fcp: formatCurrencyPreciseFn } = useCompanyCurrency();
  
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("monthly");
  const [filterValue, setFilterValue] = useState<FilterValue>({});
  const [previousRange, setPreviousRange] = useState<DateRange | null>(null);
  const [allTimeView, setAllTimeView] = useState(false);
  
  const navigate = useNavigate();

  // Quick action dialog states
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  
  // DEO dialog states
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

  // Hooks for quick actions
  const { data: revenueSources } = useRevenueSources();
  const { data: accountBalances } = useAccountBalances();
  const createRevenue = useCreateRevenue();
  const createExpense = useCreateExpense();
  const createRevenueSource = useCreateRevenueSource();
  const createTransfer = useCreateKhataTransfer();
  const createStudent = useCreateStudent();
  const createBatch = useCreateBatch();

  const handleFilterChange = useCallback((range: DateRange, type: FilterType, value: FilterValue) => {
    setDateRange(range);
    setFilterType(type);
    setFilterValue(value);
    setPreviousRange(getPreviousPeriodRange(type, value));
  }, []);

  // Cipher-only: Financial obligations (investments + loans)
  const { data: obligationsData } = useQuery({
    queryKey: ["financial-obligations", activeCompanyId],
    queryFn: async () => {
      const [investmentsRes, loansRes] = await Promise.all([
        supabase
          .from("investments")
          .select("investment_amount, status")
          .eq("company_id", activeCompanyId!)
          .in("status", ["active", "exited"]),
        supabase
          .from("loans")
          .select("loan_amount, remaining_balance, status")
          .eq("company_id", activeCompanyId!)
          .in("status", ["active", "overdue", "restructured"]),
      ]);
      if (investmentsRes.error) throw investmentsRes.error;
      if (loansRes.error) throw loansRes.error;

      const investments = investmentsRes.data || [];
      const loans = loansRes.data || [];

      const totalInvested = investments.reduce((s, i) => s + Number(i.investment_amount), 0);
      const activeInvestors = investments.filter(i => i.status === "active").length;
      const totalLoanOriginal = loans.reduce((s, l) => s + Number(l.loan_amount), 0);
      const totalLoanOutstanding = loans.reduce((s, l) => s + Number(l.remaining_balance), 0);
      const activeLoans = loans.length;

      return { totalInvested, activeInvestors, totalLoanOriginal, totalLoanOutstanding, activeLoans };
    },
    enabled: !!user && !!activeCompanyId && isCipher,
  });

  // All-time totals via RPC (no 1000-row limit)
  const { data: totalsData, isLoading: totalsLoading } = useQuery({
    queryKey: ["dashboard-totals", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_totals", {
        _company_id: activeCompanyId!,
      });
      if (error) throw error;
      const row = data?.[0] || { total_revenue: 0, total_expenses: 0, total_allocations: 0 };
      return {
        totalRevenue: Number(row.total_revenue),
        totalExpenses: Number(row.total_expenses),
        totalAllocations: Number(row.total_allocations),
      };
    },
    enabled: !!user && !!activeCompanyId,
  });

  // Metadata + recent transactions (bounded queries)
  const { data: dashboardMeta, isLoading: metaLoading } = useQuery({
    queryKey: ["dashboard-meta", activeCompanyId],
    queryFn: async () => {
      if (!user || !activeCompanyId) return null;

      const [accountsRes, sourcesRes, recentRevenuesRes, recentExpensesRes] = await Promise.all([
        supabase.from("expense_accounts").select("id, name, color, allocation_percentage, is_active").eq("company_id", activeCompanyId),
        supabase.from("revenue_sources").select("id, name").eq("company_id", activeCompanyId),
        supabase.from("revenues").select("id, amount, date, description, source_id, created_at").eq("company_id", activeCompanyId).order("created_at", { ascending: false }).limit(50),
        supabase.from("expenses").select("id, amount, date, description, expense_account_id, created_at").eq("company_id", activeCompanyId).order("created_at", { ascending: false }).limit(50),
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (sourcesRes.error) throw sourcesRes.error;
      if (recentRevenuesRes.error) throw recentRevenuesRes.error;
      if (recentExpensesRes.error) throw recentExpensesRes.error;

      const accounts = accountsRes.data || [];
      const sources = sourcesRes.data || [];
      const recentRevenues = recentRevenuesRes.data || [];
      const recentExpenses = recentExpensesRes.data || [];

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
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return { accounts, sources, recentTransactions };
    },
    enabled: !!user && !!activeCompanyId,
  });

  // Date-filtered revenue/expense summaries via RPC
  const { data: filteredRevenueSummary } = useQuery({
    queryKey: ["dashboard-revenue-summary", activeCompanyId, dateRange?.start, dateRange?.end],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_revenue_summary", {
        _company_id: activeCompanyId!,
        _start_date: dateRange!.start,
        _end_date: dateRange!.end,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!activeCompanyId && !!dateRange,
  });

  const { data: filteredExpenseSummary } = useQuery({
    queryKey: ["dashboard-expense-summary", activeCompanyId, dateRange?.start, dateRange?.end],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_expense_summary", {
        _company_id: activeCompanyId!,
        _start_date: dateRange!.start,
        _end_date: dateRange!.end,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!activeCompanyId && !!dateRange,
  });

  // Previous period summaries for comparison
  const { data: prevRevenueSummary } = useQuery({
    queryKey: ["dashboard-prev-revenue-summary", activeCompanyId, previousRange?.start, previousRange?.end],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_revenue_summary", {
        _company_id: activeCompanyId!,
        _start_date: previousRange!.start,
        _end_date: previousRange!.end,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!activeCompanyId && !!previousRange,
  });

  const { data: prevExpenseSummary } = useQuery({
    queryKey: ["dashboard-prev-expense-summary", activeCompanyId, previousRange?.start, previousRange?.end],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_expense_summary", {
        _company_id: activeCompanyId!,
        _start_date: previousRange!.start,
        _end_date: previousRange!.end,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!activeCompanyId && !!previousRange,
  });

  const isLoading = totalsLoading || metaLoading;

  // Calculate filtered data from RPC summaries
  const filteredData = useMemo((): {
    revenue: number;
    expenses: number;
    expenseBreakdown: { name: string; value: number; color: string }[];
  } => {
    if (!dateRange) return { revenue: 0, expenses: 0, expenseBreakdown: [] };

    const revenue = (filteredRevenueSummary || []).reduce((sum: number, r: any) => sum + Number(r.total_amount), 0);
    const expenses = (filteredExpenseSummary || []).reduce((sum: number, e: any) => sum + Number(e.total_amount), 0);

    const expenseBreakdown = (filteredExpenseSummary || [])
      .reduce((acc: { name: string; value: number; color: string }[], row: any) => {
        const existing = acc.find(a => a.name === row.account_name);
        if (existing) {
          existing.value += Number(row.total_amount);
        } else {
          acc.push({
            name: row.account_name || "Uncategorized",
            value: Number(row.total_amount),
            color: row.account_color || CHART_COLORS[acc.length % CHART_COLORS.length],
          });
        }
        return acc;
      }, [])
      .filter((item: any) => item.value > 0);

    return { revenue, expenses, expenseBreakdown };
  }, [dateRange, filteredRevenueSummary, filteredExpenseSummary]);

  // Calculate filtered revenue trend from RPC summaries
  const filteredRevenueTrend = useMemo(() => {
    if (!dateRange || !filteredRevenueSummary || !filteredExpenseSummary) return [];

    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    const daysDiff = differenceInDays(end, start);

    // Build month-keyed maps from RPC results
    const revenueByMonth: Record<string, number> = {};
    for (const row of filteredRevenueSummary) {
      const key = row.month;
      revenueByMonth[key] = (revenueByMonth[key] || 0) + Number(row.total_amount);
    }
    const expenseByMonth: Record<string, number> = {};
    for (const row of filteredExpenseSummary) {
      const key = row.month;
      expenseByMonth[key] = (expenseByMonth[key] || 0) + Number(row.total_amount);
    }

    if (daysDiff <= 31) {
      // For short ranges, show daily — but RPC gives monthly data, so show monthly points
      const days = eachDayOfInterval({ start, end });
      // Group by day from monthly data — since RPC aggregates by month, we show per-month
      const months = eachMonthOfInterval({ start, end });
      return months.map((monthDate) => {
        const monthKey = format(monthDate, "yyyy-MM");
        return {
          month: format(monthDate, "MMM yyyy"),
          revenue: revenueByMonth[monthKey] || 0,
          expenses: expenseByMonth[monthKey] || 0,
        };
      });
    }

    const months = eachMonthOfInterval({ start, end });
    return months.map((monthDate) => {
      const monthKey = format(monthDate, "yyyy-MM");
      return {
        month: format(monthDate, "MMM yyyy"),
        revenue: revenueByMonth[monthKey] || 0,
        expenses: expenseByMonth[monthKey] || 0,
      };
    });
  }, [dateRange, filteredRevenueSummary, filteredExpenseSummary]);

  // Calculate previous period data from RPC summaries
  const previousData = useMemo((): { revenue: number; expenses: number } => {
    if (!previousRange) return { revenue: 0, expenses: 0 };
    return {
      revenue: (prevRevenueSummary || []).reduce((sum: number, r: any) => sum + Number(r.total_amount), 0),
      expenses: (prevExpenseSummary || []).reduce((sum: number, e: any) => sum + Number(e.total_amount), 0),
    };
  }, [previousRange, prevRevenueSummary, prevExpenseSummary]);

  // Export handlers
  const handleExportCSV = () => {
    if (!dateRange || !filteredRevenueSummary || !filteredExpenseSummary) return;
    
    const revenues = (filteredRevenueSummary || []).map((r: any) => ({
      date: r.month,
      amount: Number(r.total_amount),
      sourceName: r.source_name || "Uncategorized",
      description: `${r.entry_count} entries`,
    }));
    
    const expenses = (filteredExpenseSummary || []).map((e: any) => ({
      date: e.month,
      amount: Number(e.total_amount),
      accountName: e.account_name || "Uncategorized",
      description: `${e.entry_count} entries`,
    }));
    
    exportAllTransactionsCSV(revenues, expenses, dateRange.label);
  };

  const handleExportPDF = async () => {
    if (!dateRange) return;
    await exportToPDF("dashboard-content", "dashboard", "Dashboard Report", dateRange.label, activeCompany?.name || undefined);
  };

  // Derive computed values from RPC totals and metadata
  const totalRevenue = totalsData?.totalRevenue || 0;
  const totalExpenses = totalsData?.totalExpenses || 0;
  const totalAllocations = totalsData?.totalAllocations || 0;
  const allocatedProfit = totalRevenue - totalAllocations;
  const actualProfit = totalRevenue - totalExpenses;
  const totalBalance = totalAllocations - totalExpenses;

  const accounts = dashboardMeta?.accounts || [];
  const sources = dashboardMeta?.sources || [];
  const recentTransactions = dashboardMeta?.recentTransactions || [];

  // Pagination for recent transactions (must be called before conditional returns)
  const transactionsPagination = usePagination(recentTransactions);

  const formatCurrency = formatCurrencyPreciseFn;

  const formatCompact = (value: number) => {
    return formatCurrencyFn(value, { compact: true });
  };

  // Compute date-filtered top stat values (before conditional returns to satisfy hook rules)
  const topCardValues = useMemo(() => {
    if (allTimeView || !dateRange || !totalsData) {
      return {
        totalRevenue,
        totalExpenses,
        allocatedProfit,
        actualProfit,
        totalBalance,
        label: "All Time",
      };
    }
    const fRevenue = filteredData.revenue;
    const fExpenses = filteredData.expenses;
    return {
      totalRevenue: fRevenue,
      totalExpenses: fExpenses,
      allocatedProfit: fRevenue - fExpenses,
      actualProfit: fRevenue - fExpenses,
      totalBalance: fRevenue - fExpenses,
      label: dateRange.label,
    };
  }, [allTimeView, dateRange, totalsData, totalRevenue, totalExpenses, allocatedProfit, actualProfit, totalBalance, filteredData]);

  const periodPill = topCardValues.label;

  const metrics = [
    { label: "Total Revenue", value: formatCurrency(topCardValues.totalRevenue), icon: TrendingUp, color: "text-success" },
    { label: "Total Expenses", value: formatCurrency(topCardValues.totalExpenses), icon: TrendingDown, color: "text-destructive" },
    { label: "Allocated Profit", value: formatCurrency(topCardValues.allocatedProfit), icon: PiggyBank, color: topCardValues.allocatedProfit >= 0 ? "text-success" : "text-destructive" },
    { label: "Actual Profit", value: formatCurrency(topCardValues.actualProfit), icon: DollarSign, color: topCardValues.actualProfit >= 0 ? "text-success" : "text-destructive" },
    { label: "Total Balance", value: formatCurrency(topCardValues.totalBalance), icon: Wallet, color: topCardValues.totalBalance >= 0 ? "text-success" : "text-destructive" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-7 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <SkeletonCards count={5} />
        <SkeletonChart />
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  }

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

  // Data Entry Moderator: show quick actions only, no financial metrics
  if (isDataEntryModerator) {
    const quickActions = [
      { label: "Add Student", icon: GraduationCap, allowed: canAddStudent, desc: "Create a new student profile", onClick: () => setStudentDialogOpen(true) },
      { label: "Record Payment", icon: CreditCard, allowed: canAddPayment, desc: "Record a student payment", onClick: () => navigate("/students") },
      { label: "Create Batch", icon: Layers, allowed: canAddBatch, desc: "Create a new batch", onClick: () => setBatchDialogOpen(true) },
      { label: "Add Course", icon: BookOpen, allowed: canAddCourse, desc: "Create a new course", onClick: () => navigate("/courses") },
      { label: "Add Revenue", icon: TrendingUp, allowed: canAddRevenue, desc: "Record a revenue entry", onClick: () => setRevenueDialogOpen(true) },
      { label: "Add Expense", icon: Receipt, allowed: canAddExpense, desc: "Record an expense", onClick: () => setExpenseDialogOpen(true) },
    ].filter((a) => a.allowed);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Quick actions for data entry</p>
        </div>
        {quickActions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Wallet className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No permissions assigned</h3>
              <p className="max-w-sm text-muted-foreground">
                Your admin hasn't assigned any permissions yet. Please contact your business administrator.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Card key={action.label} className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30" onClick={action.onClick}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <action.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{action.label}</p>
                    <p className="text-sm text-muted-foreground">{action.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* DEO Quick Action Dialogs */}
        <StudentDialog
          open={studentDialogOpen}
          onOpenChange={setStudentDialogOpen}
          onSave={async (data) => {
            await createStudent.mutateAsync(data);
          }}
        />

        <BatchDialog
          open={batchDialogOpen}
          onOpenChange={setBatchDialogOpen}
          onSave={async (data) => {
            await createBatch.mutateAsync(data);
          }}
        />

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
              funded_by_type: data.funded_by_type || null,
              funded_by_id: data.funded_by_id || null,
              funded_by_reference: data.funded_by_reference || null,
              matches_loan_purpose: data.matches_loan_purpose ?? null,
              purpose_notes: data.purpose_notes || null,
              invoice_number: data.invoice_number || null,
              vendor_name: data.vendor_name || null,
            });
          }}
        />
      </div>
    );
  }

  // Fix 4: Traditional Moderator sees restricted dashboard
  if (!canViewDashboardMetrics) {
    return (
      <div className="space-y-6" id="dashboard-content">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Your workspace overview</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Financial Metrics Restricted</h3>
            <p className="max-w-sm text-muted-foreground">
              Financial metrics are visible to Company Admins only. Contact your administrator for access.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {canAddStudent && (
                <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => setStudentDialogOpen(true)}>
                  <GraduationCap className="h-4 w-4" /> Add Student
                </Button>
              )}
              {canAddBatch && (
                <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => setBatchDialogOpen(true)}>
                  <Layers className="h-4 w-4" /> Create Batch
                </Button>
              )}
              {canAddPayment && (
                <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => navigate("/students")}>
                  <CreditCard className="h-4 w-4" /> Record Payment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <StudentDialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen} onSave={async (d) => { await createStudent.mutateAsync(d); }} />
        <BatchDialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen} onSave={async (d) => { await createBatch.mutateAsync(d); }} />
      </div>
    );
  }

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
          <PermissionGuard permission="canTransfer">
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

      {/* All Time toggle for stat cards */}
      <div className="flex items-center gap-2">
        <Switch id="alltime-toggle" checked={allTimeView} onCheckedChange={setAllTimeView} />
        <Label htmlFor="alltime-toggle" className="text-sm text-muted-foreground cursor-pointer">
          All Time
        </Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((m) => (
          <Card key={m.label} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                  {periodPill}
                </Badge>
              </div>
              <m.icon className={cn("h-4 w-4", m.color)} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{m.value}</p>
            </CardContent>
            <div className={cn("absolute bottom-0 left-0 h-1 w-full", m.color.replace("text-", "bg-"))} />
          </Card>
        ))}
      </div>

      {/* Cipher-only: Financial Obligations Summary */}
      {isCipher && obligationsData && (obligationsData.totalInvested > 0 || obligationsData.totalLoanOutstanding > 0) && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Landmark className="h-4 w-4 text-primary" />
              Financial Obligations
              <Badge variant="outline" className="ml-auto text-xs font-normal">Cipher Only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {obligationsData.totalInvested > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                    <HandCoins className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Total Investments</p>
                    <p className="text-lg font-bold">{formatCurrency(obligationsData.totalInvested)}</p>
                    <p className="text-xs text-muted-foreground">{obligationsData.activeInvestors} active investor{obligationsData.activeInvestors !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}
              {obligationsData.totalLoanOutstanding > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                    <CreditCard className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Outstanding Loans</p>
                    <p className="text-lg font-bold">{formatCurrency(obligationsData.totalLoanOutstanding)}</p>
                    <p className="text-xs text-muted-foreground">
                      {obligationsData.activeLoans} active loan{obligationsData.activeLoans !== 1 ? 's' : ''} · Originally {formatCurrency(obligationsData.totalLoanOriginal)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtered Period Summary */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2">
          <CardTitle className="text-base font-semibold">Period Overview</CardTitle>
          <AdvancedDateFilter onFilterChange={handleFilterChange} defaultFilterType="monthly" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gradient-to-br from-green-500/5 to-green-500/10 border border-green-500/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(filteredData.revenue)}</p>
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
                     <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
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
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{value === "revenue" ? "Revenue" : "Expenses"}</span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="revenue"
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="expenses"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    fill="url(#expenseGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-muted-foreground">
                <TrendingUp className="h-8 w-8" />
                <p>No transaction data for selected period</p>
                <p className="text-xs">Add revenue or expenses to see trends here</p>
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
                  {filteredData.expenseBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-muted-foreground">{item.name}</span>
                      <span className="ml-auto text-xs font-medium shrink-0">{formatCompact(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-muted-foreground">
                <PiggyBank className="h-8 w-8" />
                <p>No expense data for selected period</p>
                <p className="text-xs">Add expenses to see spending breakdown</p>
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
          {recentTransactions.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Expense Source</TableHead>
                    <TableHead>Revenue Source</TableHead>
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
                                ? "bg-green-500/10 text-success"
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
                            variant="outline" 
                            className="text-xs"
                            style={getSourceBadgeStyle(tx.category)}
                          >
                            {tx.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.type === "revenue" && tx.category ? (
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={getSourceBadgeStyle(tx.category)}
                          >
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
                            tx.type === "revenue" ? "text-success" : "text-destructive"
                          )}
                        >
                          {tx.type === "revenue" ? "+" : "-"}{formatCurrency(tx.amount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div data-pdf-hide>
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
              </div>
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
            funded_by_type: data.funded_by_type || null,
            funded_by_id: data.funded_by_id || null,
            funded_by_reference: data.funded_by_reference || null,
            matches_loan_purpose: data.matches_loan_purpose ?? null,
            purpose_notes: data.purpose_notes || null,
            invoice_number: data.invoice_number || null,
            vendor_name: data.vendor_name || null,
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
