import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Wallet, DollarSign, PiggyBank, ArrowLeftRight, GraduationCap, CreditCard, Layers, BookOpen, Receipt, Plus, ShieldAlert } from "lucide-react";
import { SkeletonCards, SkeletonChart, SkeletonTable } from "@/components/shared/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";

import { format, differenceInDays, parseISO, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import ExportButtons from "@/components/shared/ExportButtons";
import RevenueDialog from "@/components/dialogs/RevenueDialog";
import ExpenseDialog from "@/components/dialogs/ExpenseDialog";
import TransferDialog from "@/components/dialogs/TransferDialog";
import StudentDialog from "@/components/dialogs/StudentDialog";
import BatchDialog from "@/components/dialogs/BatchDialog";
import { useCreateKhataTransfer } from "@/hooks/useKhataTransfers";
import { type DateRange, type FilterType, type FilterValue, getPreviousPeriodRange } from "@/utils/dateRangeUtils";
import { exportAllTransactionsCSV, exportToPDF } from "@/utils/exportUtils";
import { useRevenueSources, useCreateRevenueSource } from "@/hooks/useRevenueSources";
import { useAccountBalances, useCreateExpense } from "@/hooks/useExpenses";
import { useCreateRevenue } from "@/hooks/useRevenues";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { usePagination } from "@/hooks/usePagination";
import { useCompany } from "@/contexts/CompanyContext";
import { PermissionGuard } from "@/components/auth/RoleGuard";
import { useCreateStudent } from "@/hooks/useStudents";
import { useCreateBatch } from "@/hooks/useBatches";
import { cleanSalaryTag } from "@/utils/sourceColors";

import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import DashboardTransactions from "@/components/dashboard/DashboardTransactions";
import DashboardObligations from "@/components/dashboard/DashboardObligations";
import DashboardPeriodOverview from "@/components/dashboard/DashboardPeriodOverview";

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
        supabase.from("investments").select("investment_amount, status").eq("company_id", activeCompanyId!).in("status", ["active", "exited"]),
        supabase.from("loans").select("loan_amount, remaining_balance, status").eq("company_id", activeCompanyId!).in("status", ["active", "overdue", "restructured"]),
      ]);
      if (investmentsRes.error) throw investmentsRes.error;
      if (loansRes.error) throw loansRes.error;
      const investments = investmentsRes.data || [];
      const loans = loansRes.data || [];
      return {
        totalInvested: investments.reduce((s, i) => s + Number(i.investment_amount), 0),
        activeInvestors: investments.filter(i => i.status === "active").length,
        totalLoanOriginal: loans.reduce((s, l) => s + Number(l.loan_amount), 0),
        totalLoanOutstanding: loans.reduce((s, l) => s + Number(l.remaining_balance), 0),
        activeLoans: loans.length,
      };
    },
    enabled: !!user && !!activeCompanyId && isCipher,
  });

  // All-time totals via RPC
  const { data: totalsData, isLoading: totalsLoading } = useQuery({
    queryKey: ["dashboard-totals", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_totals", { _company_id: activeCompanyId! });
      if (error) throw error;
      const row = data?.[0] || { total_revenue: 0, total_expenses: 0, total_allocations: 0 };
      return { totalRevenue: Number(row.total_revenue), totalExpenses: Number(row.total_expenses), totalAllocations: Number(row.total_allocations) };
    },
    enabled: !!user && !!activeCompanyId,
  });

  // Metadata + recent transactions (bounded)
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
          id: r.id, type: "revenue" as const, amount: Number(r.amount), date: r.date,
          description: r.description || sources.find((s) => s.id === r.source_id)?.name || "Revenue",
          category: sources.find((s) => s.id === r.source_id)?.name || "Uncategorized", createdAt: r.created_at,
        })),
        ...recentExpenses.map((e) => ({
          id: e.id, type: "expense" as const, amount: Number(e.amount), date: e.date,
          description: cleanSalaryTag(e.description) || accounts.find((a) => a.id === e.expense_account_id)?.name || "Expense",
          category: accounts.find((a) => a.id === e.expense_account_id)?.name || "",
          color: accounts.find((a) => a.id === e.expense_account_id)?.color || "#6B7280", createdAt: e.created_at,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return { accounts, sources, recentTransactions };
    },
    enabled: !!user && !!activeCompanyId,
  });

  // Date-filtered summaries via RPC
  const { data: filteredRevenueSummary } = useQuery({
    queryKey: ["dashboard-revenue-summary", activeCompanyId, dateRange?.start, dateRange?.end],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_revenue_summary", { _company_id: activeCompanyId!, _start_date: dateRange!.start, _end_date: dateRange!.end });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!activeCompanyId && !!dateRange,
  });

  const { data: filteredExpenseSummary } = useQuery({
    queryKey: ["dashboard-expense-summary", activeCompanyId, dateRange?.start, dateRange?.end],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_expense_summary", { _company_id: activeCompanyId!, _start_date: dateRange!.start, _end_date: dateRange!.end });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!activeCompanyId && !!dateRange,
  });

  const { data: prevRevenueSummary } = useQuery({
    queryKey: ["dashboard-prev-revenue-summary", activeCompanyId, previousRange?.start, previousRange?.end],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_revenue_summary", { _company_id: activeCompanyId!, _start_date: previousRange!.start, _end_date: previousRange!.end });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!activeCompanyId && !!previousRange,
  });

  const { data: prevExpenseSummary } = useQuery({
    queryKey: ["dashboard-prev-expense-summary", activeCompanyId, previousRange?.start, previousRange?.end],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_expense_summary", { _company_id: activeCompanyId!, _start_date: previousRange!.start, _end_date: previousRange!.end });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!activeCompanyId && !!previousRange,
  });

  const isLoading = totalsLoading || metaLoading;

  const CHART_COLORS = [
    "hsl(var(--primary))", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(262, 83%, 58%)",
    "hsl(199, 89%, 48%)", "hsl(346, 77%, 49%)", "hsl(24, 94%, 50%)", "hsl(var(--destructive))",
    "hsl(180, 60%, 40%)", "hsl(290, 60%, 50%)",
  ];

  // Calculate filtered data
  const filteredData = useMemo(() => {
    if (!dateRange) return { revenue: 0, expenses: 0, expenseBreakdown: [] as { name: string; value: number; color: string }[] };
    const revenue = (filteredRevenueSummary || []).reduce((sum: number, r: any) => sum + Number(r.total_amount), 0);
    const expenses = (filteredExpenseSummary || []).reduce((sum: number, e: any) => sum + Number(e.total_amount), 0);
    const expenseBreakdown = (filteredExpenseSummary || [])
      .reduce((acc: { name: string; value: number; color: string }[], row: any) => {
        const existing = acc.find(a => a.name === row.account_name);
        if (existing) existing.value += Number(row.total_amount);
        else acc.push({ name: row.account_name || "Uncategorized", value: Number(row.total_amount), color: row.account_color || CHART_COLORS[acc.length % CHART_COLORS.length] });
        return acc;
      }, [])
      .filter((item: any) => item.value > 0);
    return { revenue, expenses, expenseBreakdown };
  }, [dateRange, filteredRevenueSummary, filteredExpenseSummary]);

  // Revenue trend
  const filteredRevenueTrend = useMemo(() => {
    if (!dateRange || !filteredRevenueSummary || !filteredExpenseSummary) return [];
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    const revenueByMonth: Record<string, number> = {};
    for (const row of filteredRevenueSummary) revenueByMonth[row.month] = (revenueByMonth[row.month] || 0) + Number(row.total_amount);
    const expenseByMonth: Record<string, number> = {};
    for (const row of filteredExpenseSummary) expenseByMonth[row.month] = (expenseByMonth[row.month] || 0) + Number(row.total_amount);
    const months = eachMonthOfInterval({ start, end });
    return months.map((monthDate) => {
      const monthKey = format(monthDate, "yyyy-MM");
      return { month: format(monthDate, "MMM yyyy"), revenue: revenueByMonth[monthKey] || 0, expenses: expenseByMonth[monthKey] || 0 };
    });
  }, [dateRange, filteredRevenueSummary, filteredExpenseSummary]);

  const previousData = useMemo(() => {
    if (!previousRange) return { revenue: 0, expenses: 0 };
    return {
      revenue: (prevRevenueSummary || []).reduce((sum: number, r: any) => sum + Number(r.total_amount), 0),
      expenses: (prevExpenseSummary || []).reduce((sum: number, e: any) => sum + Number(e.total_amount), 0),
    };
  }, [previousRange, prevRevenueSummary, prevExpenseSummary]);

  // Export handlers
  const handleExportCSV = () => {
    if (!dateRange || !filteredRevenueSummary || !filteredExpenseSummary) return;
    const revenues = (filteredRevenueSummary || []).map((r: any) => ({ date: r.month, amount: Number(r.total_amount), sourceName: r.source_name || "Uncategorized", description: `${r.entry_count} entries` }));
    const expenses = (filteredExpenseSummary || []).map((e: any) => ({ date: e.month, amount: Number(e.total_amount), accountName: e.account_name || "Uncategorized", description: `${e.entry_count} entries` }));
    exportAllTransactionsCSV(revenues, expenses, dateRange.label);
  };

  const handleExportPDF = async () => {
    if (!dateRange) return;
    await exportToPDF("dashboard-content", "dashboard", "Dashboard Report", dateRange.label, activeCompany?.name || undefined);
  };

  // Derive computed values
  const totalRevenue = totalsData?.totalRevenue || 0;
  const totalExpenses = totalsData?.totalExpenses || 0;
  const totalAllocations = totalsData?.totalAllocations || 0;
  const allocatedProfit = totalRevenue - totalAllocations;
  const actualProfit = totalRevenue - totalExpenses;
  const totalBalance = totalAllocations - totalExpenses;

  const recentTransactions = dashboardMeta?.recentTransactions || [];
  const transactionsPagination = usePagination(recentTransactions);
  const formatCurrency = formatCurrencyPreciseFn;
  const formatCompact = (value: number) => formatCurrencyFn(value, { compact: true });

  const topCardValues = useMemo(() => {
    if (allTimeView || !dateRange || !totalsData) {
      return { totalRevenue, totalExpenses, allocatedProfit, actualProfit, totalBalance, label: "All Time" };
    }
    const fRevenue = filteredData.revenue;
    const fExpenses = filteredData.expenses;
    return { totalRevenue: fRevenue, totalExpenses: fExpenses, allocatedProfit: fRevenue - fExpenses, actualProfit: fRevenue - fExpenses, totalBalance: fRevenue - fExpenses, label: dateRange.label };
  }, [allTimeView, dateRange, totalsData, totalRevenue, totalExpenses, allocatedProfit, actualProfit, totalBalance, filteredData]);

  const periodPill = topCardValues.label;

  const metrics = [
    { label: "Total Revenue", value: formatCurrency(topCardValues.totalRevenue), icon: TrendingUp, color: "text-success" },
    { label: "Total Expenses", value: formatCurrency(topCardValues.totalExpenses), icon: TrendingDown, color: "text-destructive" },
    { label: "Allocated Profit", value: formatCurrency(topCardValues.allocatedProfit), icon: PiggyBank, color: topCardValues.allocatedProfit >= 0 ? "text-success" : "text-destructive" },
    { label: "Actual Profit", value: formatCurrency(topCardValues.actualProfit), icon: DollarSign, color: topCardValues.actualProfit >= 0 ? "text-success" : "text-destructive" },
    { label: "Total Balance", value: formatCurrency(topCardValues.totalBalance), icon: Wallet, color: topCardValues.totalBalance >= 0 ? "text-success" : "text-destructive" },
  ];

  const totalFilteredExpense = filteredData.expenseBreakdown.reduce((sum, item) => sum + item.value, 0);

  // Shared dialog handlers
  const handleRevenueSave = async (data: any) => {
    await createRevenue.mutateAsync({ amount: data.amount, date: data.date, source_id: data.source_id, description: data.description });
  };
  const handleExpenseSave = async (data: any) => {
    await createExpense.mutateAsync({
      amount: data.amount, date: data.date, expense_account_id: data.expense_account_id, description: data.description,
      funded_by_type: data.funded_by_type || null, funded_by_id: data.funded_by_id || null, funded_by_reference: data.funded_by_reference || null,
      matches_loan_purpose: data.matches_loan_purpose ?? null, purpose_notes: data.purpose_notes || null,
      invoice_number: data.invoice_number || null, vendor_name: data.vendor_name || null,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><Skeleton className="h-7 w-40 mb-2" /><Skeleton className="h-4 w-64" /></div>
        </div>
        <SkeletonCards count={5} />
        <SkeletonChart />
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  }

  // Data Entry Moderator: show quick actions only
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
        <div><h1 className="text-2xl font-bold tracking-tight">Dashboard</h1><p className="text-muted-foreground">Quick actions for data entry</p></div>
        {quickActions.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4"><Wallet className="h-8 w-8 text-muted-foreground" /></div>
            <h3 className="mb-2 text-lg font-semibold">No permissions assigned</h3>
            <p className="max-w-sm text-muted-foreground">Your admin hasn't assigned any permissions yet. Please contact your business administrator.</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Card key={action.label} className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30" onClick={action.onClick}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10"><action.icon className="h-6 w-6 text-primary" /></div>
                  <div><p className="font-semibold">{action.label}</p><p className="text-sm text-muted-foreground">{action.desc}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <StudentDialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen} onSave={async (data) => { await createStudent.mutateAsync(data); }} />
        <BatchDialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen} onSave={async (data) => { await createBatch.mutateAsync(data); }} />
        <RevenueDialog open={revenueDialogOpen} onOpenChange={setRevenueDialogOpen} sources={revenueSources || []} onSave={handleRevenueSave} onCreateSource={async (name) => { await createRevenueSource.mutateAsync(name); }} />
        <ExpenseDialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen} accounts={accountBalances || []} onSave={handleExpenseSave} />
      </div>
    );
  }

  // Traditional Moderator: restricted dashboard
  if (!canViewDashboardMetrics) {
    return (
      <div className="space-y-6" id="dashboard-content">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-2xl font-bold tracking-tight">Dashboard</h1><p className="text-muted-foreground">Your workspace overview</p></div>
        </div>
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4"><ShieldAlert className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="mb-2 text-lg font-semibold">Financial Metrics Restricted</h3>
          <p className="max-w-sm text-muted-foreground">Financial metrics are visible to Company Admins only. Contact your administrator for access.</p>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base font-semibold">Quick Actions</CardTitle></CardHeader>
          <CardContent><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {canAddStudent && <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => setStudentDialogOpen(true)}><GraduationCap className="h-4 w-4" /> Add Student</Button>}
            {canAddBatch && <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => setBatchDialogOpen(true)}><Layers className="h-4 w-4" /> Create Batch</Button>}
            {canAddPayment && <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => navigate("/students")}><CreditCard className="h-4 w-4" /> Record Payment</Button>}
          </div></CardContent>
        </Card>
        <StudentDialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen} onSave={async (d) => { await createStudent.mutateAsync(d); }} />
        <BatchDialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen} onSave={async (d) => { await createBatch.mutateAsync(d); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="dashboard-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Dashboard</h1><p className="text-muted-foreground">Your financial overview at a glance</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGuard permission="canAddRevenue">
            <Button size="sm" onClick={() => setRevenueDialogOpen(true)} className="gap-1"><Plus className="h-4 w-4" />Add Revenue</Button>
          </PermissionGuard>
          <PermissionGuard permission="canAddExpense">
            <Button size="sm" variant="outline" onClick={() => setExpenseDialogOpen(true)} className="gap-1"><Plus className="h-4 w-4" />Add Expense</Button>
          </PermissionGuard>
          <PermissionGuard permission="canTransfer">
            <Button size="sm" variant="outline" onClick={() => setTransferDialogOpen(true)} disabled={(accountBalances?.length || 0) < 2} className="gap-1"><ArrowLeftRight className="h-4 w-4" />Transfer</Button>
          </PermissionGuard>
          <ExportButtons onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} disabled={!dateRange} />
        </div>
      </div>

      {/* All Time toggle */}
      <div className="flex items-center gap-2">
        <Switch id="alltime-toggle" checked={allTimeView} onCheckedChange={setAllTimeView} />
        <Label htmlFor="alltime-toggle" className="text-sm text-muted-foreground cursor-pointer">All Time</Label>
      </div>

      <DashboardStats metrics={metrics} periodPill={periodPill} />

      {isCipher && obligationsData && <DashboardObligations data={obligationsData} formatCurrency={formatCurrency} />}

      <DashboardPeriodOverview
        filteredData={filteredData}
        previousData={previousData}
        previousRange={previousRange}
        dateRange={dateRange}
        onFilterChange={handleFilterChange}
        formatCurrency={formatCurrency}
      />

      <DashboardCharts
        revenueTrend={filteredRevenueTrend}
        expenseBreakdown={filteredData.expenseBreakdown}
        totalFilteredExpense={totalFilteredExpense}
        dateRangeLabel={dateRange?.label}
        formatCurrency={formatCurrency}
        formatCompact={formatCompact}
      />

      <DashboardTransactions transactions={recentTransactions} pagination={transactionsPagination} formatCurrency={formatCurrency} />

      {/* Quick Action Dialogs */}
      <RevenueDialog open={revenueDialogOpen} onOpenChange={setRevenueDialogOpen} sources={revenueSources || []} onSave={handleRevenueSave} onCreateSource={async (name) => { await createRevenueSource.mutateAsync(name); }} />
      <ExpenseDialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen} accounts={accountBalances || []} onSave={handleExpenseSave} />
      <TransferDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen} accounts={accountBalances || []} onTransfer={async (data) => { await createTransfer.mutateAsync(data); }} isPending={createTransfer.isPending} />
    </div>
  );
}
