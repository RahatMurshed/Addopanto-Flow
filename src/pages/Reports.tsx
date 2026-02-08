import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Loader2, TrendingUp, TrendingDown, Wallet, FileText } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, getYear, getMonth } from "date-fns";
import { cn } from "@/lib/utils";

export default function Reports() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

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

  // Get available years from data
  const availableYears = useMemo(() => {
    if (!reportData) return [new Date().getFullYear().toString()];
    const years = new Set<number>();
    reportData.revenues.forEach((r) => years.add(getYear(new Date(r.date))));
    reportData.expenses.forEach((e) => years.add(getYear(new Date(e.date))));
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a).map(String);
  }, [reportData]);

  const months = [
    { value: "all", label: "All Months" },
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" },
  ];

  // Filter data based on selection
  const filteredData = useMemo(() => {
    if (!reportData) return { revenues: [], expenses: [], allocations: [] };

    const year = parseInt(selectedYear);
    const filterByDate = (date: string) => {
      const d = new Date(date);
      const matchesYear = getYear(d) === year;
      const matchesMonth = selectedMonth === "all" || getMonth(d) === parseInt(selectedMonth);
      return matchesYear && matchesMonth;
    };

    return {
      revenues: reportData.revenues.filter((r) => filterByDate(r.date)),
      expenses: reportData.expenses.filter((e) => filterByDate(e.date)),
      allocations: reportData.allocations,
    };
  }, [reportData, selectedYear, selectedMonth]);

  // Calculate summaries
  const summary = useMemo(() => {
    const totalRevenue = filteredData.revenues.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;
    const transactionCount = filteredData.revenues.length + filteredData.expenses.length;

    return { totalRevenue, totalExpenses, netProfit, transactionCount };
  }, [filteredData]);

  // Monthly breakdown
  const monthlyBreakdown = useMemo(() => {
    if (!reportData) return [];
    const year = parseInt(selectedYear);
    const breakdown: { month: string; revenue: number; expenses: number; profit: number }[] = [];

    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(year, m, 1);
      const monthEnd = endOfMonth(monthStart);
      const monthLabel = format(monthStart, "MMMM");

      const monthRevenue = reportData.revenues
        .filter((r) => {
          const d = new Date(r.date);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const monthExpenses = reportData.expenses
        .filter((e) => {
          const d = new Date(e.date);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);

      breakdown.push({
        month: monthLabel,
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      });
    }

    return breakdown;
  }, [reportData, selectedYear]);

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
    return `৳${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // CSV Export functions
  const downloadCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => `"${row[h.toLowerCase().replace(/ /g, "_")] ?? ""}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${selectedYear}${selectedMonth !== "all" ? `_${months.find(m => m.value === selectedMonth)?.label}` : ""}.csv`;
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

  const exportTransactions = () => {
    const revenueRows = filteredData.revenues.map((r) => ({
      type: "Revenue",
      date: r.date,
      amount: r.amount,
      description: r.description || "",
      category: reportData?.sources.find((s) => s.id === r.source_id)?.name || "Uncategorized",
    }));

    const expenseRows = filteredData.expenses.map((e) => ({
      type: "Expense",
      date: e.date,
      amount: e.amount,
      description: e.description || "",
      category: reportData?.accounts.find((a) => a.id === e.expense_account_id)?.name || "",
    }));

    const allTransactions = [...revenueRows, ...expenseRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    downloadCSV(allTransactions, "transactions", ["Type", "Date", "Amount", "Description", "Category"]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Financial summaries and analytics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        </TabsList>

        {/* Monthly Summary Tab */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Monthly Breakdown - {selectedYear}</CardTitle>
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
              <CardTitle>Khata Breakdown</CardTitle>
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
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: account.color }} />
                              <span className="font-medium">{account.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{account.percentage}%</TableCell>
                          <TableCell className="text-right">{formatCurrency(account.allocated)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatCurrency(account.spent)}</TableCell>
                          <TableCell className={cn("text-right font-medium", account.balance >= 0 ? "text-success" : "text-destructive")}>
                            {formatCurrency(account.balance)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {accountBreakdown.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">
                          {accountBreakdown.reduce((sum, a) => sum + a.percentage, 0)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(accountBreakdown.reduce((sum, a) => sum + a.allocated, 0))}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {formatCurrency(accountBreakdown.reduce((sum, a) => sum + a.spent, 0))}
                        </TableCell>
                        <TableCell className={cn("text-right", accountBreakdown.reduce((sum, a) => sum + a.balance, 0) >= 0 ? "text-success" : "text-destructive")}>
                          {formatCurrency(accountBreakdown.reduce((sum, a) => sum + a.balance, 0))}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Sources Tab */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Revenue by Source</CardTitle>
              <Button variant="outline" size="sm" onClick={exportTransactions}>
                <Download className="mr-2 h-4 w-4" />
                Export All Transactions
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
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
                          <TableCell className="text-right text-primary">{formatCurrency(source.amount)}</TableCell>
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
      </Tabs>
    </div>
  );
}
