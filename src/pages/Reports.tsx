import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, TrendingUp, TrendingDown, Wallet, FileText, ArrowLeftRight } from "lucide-react";
import { format, endOfMonth, getYear, getMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { useKhataTransfers } from "@/hooks/useKhataTransfers";
import { useAccountBalances } from "@/hooks/useExpenses";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatCurrencyPrecise } from "@/utils/currencyUtils";
import TransferHistoryCard from "@/components/TransferHistoryCard";
import AdvancedDateFilter from "@/components/AdvancedDateFilter";
import ExportButtons from "@/components/ExportButtons";
import { type DateRange, type FilterType, type FilterValue } from "@/utils/dateRangeUtils";
import { exportAllTransactionsCSV, exportToPDF } from "@/utils/exportUtils";

export default function Reports() {
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();
  const currency = userProfile?.currency || "BDT";
  
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const { data: transfers = [] } = useKhataTransfers();
  const { data: accounts = [] } = useAccountBalances();

  const handleFilterChange = useCallback((range: DateRange, filterType: FilterType, filterValue: FilterValue) => {
    setDateRange(range);
  }, []);

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["reports", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [revenuesRes, expensesRes, allocationsRes, accountsRes, sourcesRes] = await Promise.all([
        supabase.from("revenues").select("*").eq("user_id", user.id),
        supabase.from("expenses").select("*").eq("user_id", user.id),
        supabase.from("allocations").select("*").eq("user_id", user.id),
        supabase.from("expense_accounts").select("*").eq("user_id", user.id),
        supabase.from("revenue_sources").select("*").eq("user_id", user.id),
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
    enabled: !!user,
  });

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

  // Monthly breakdown for the current year
  const monthlyBreakdown = useMemo(() => {
    if (!reportData) return [];
    const year = new Date().getFullYear();
    const breakdown: { month: string; revenue: number; expenses: number; profit: number }[] = [];

    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(year, m, 1);
      const monthEnd = endOfMonth(monthStart);
      const monthLabel = format(monthStart, "MMMM");
      const monthStartStr = format(monthStart, "yyyy-MM-dd");
      const monthEndStr = format(monthEnd, "yyyy-MM-dd");

      const monthRevenue = reportData.revenues
        .filter((r) => r.date >= monthStartStr && r.date <= monthEndStr)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const monthExpenses = reportData.expenses
        .filter((e) => e.date >= monthStartStr && e.date <= monthEndStr)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      breakdown.push({
        month: monthLabel,
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      });
    }

    return breakdown;
  }, [reportData]);

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

  const formatCurrency = (amount: number) => {
    return formatCurrencyPrecise(amount, currency);
  };

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
    await exportToPDF("reports-content", "reports", "Financial Report", dateRange.label, userProfile?.business_name || undefined);
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
    const data = monthlyBreakdown.map((m) => ({
      month: m.month,
      revenue: m.revenue,
      expenses: m.expenses,
      profit: m.profit,
    }));
    downloadCSV(data, "monthly_summary", ["Month", "Revenue", "Expenses", "Profit"]);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(summary.totalRevenue)}</p>
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

      {/* Tabs for different views */}
      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
          <TabsTrigger value="accounts">By Khata</TabsTrigger>
          <TabsTrigger value="sources">By Source</TabsTrigger>
          <TabsTrigger value="transfers">
            <ArrowLeftRight className="mr-1 h-4 w-4" />
            Transfers
          </TabsTrigger>
        </TabsList>

        {/* Monthly Summary Tab */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Monthly Breakdown - {new Date().getFullYear()}</CardTitle>
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
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyBreakdown.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell className="font-medium">{row.month}</TableCell>
                        <TableCell className="text-right text-primary">{formatCurrency(row.revenue)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatCurrency(row.expenses)}</TableCell>
                        <TableCell className={cn("text-right font-medium", row.profit >= 0 ? "text-success" : "text-destructive")}>
                          {formatCurrency(row.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right text-primary">
                        {formatCurrency(monthlyBreakdown.reduce((sum, m) => sum + m.revenue, 0))}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(monthlyBreakdown.reduce((sum, m) => sum + m.expenses, 0))}
                      </TableCell>
                      <TableCell className={cn("text-right", monthlyBreakdown.reduce((sum, m) => sum + m.profit, 0) >= 0 ? "text-success" : "text-destructive")}>
                        {formatCurrency(monthlyBreakdown.reduce((sum, m) => sum + m.profit, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
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
                          <TableCell className="text-right text-primary">{formatCurrency(account.allocated)}</TableCell>
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
                          <TableCell className="text-right text-primary font-medium">
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
                        <TableCell className="text-right text-primary">
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
