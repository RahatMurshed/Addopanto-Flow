import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getSourceBadgeStyle, cleanSalaryTag } from "@/utils/sourceColors";
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useAccountBalances,
  type ExpenseWithAccount,
} from "@/hooks/useExpenses";
import { useKhataTransfers, useCreateKhataTransfer, useDeleteKhataTransfer } from "@/hooks/useKhataTransfers";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SearchBar from "@/components/shared/SearchBar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Receipt,
  Loader2,
  AlertTriangle,
  TrendingDown,
  ArrowLeftRight,
  Search,
  X,
  SlidersHorizontal,
  Eye,
} from "lucide-react";
import { SkeletonTable } from "@/components/shared/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";
import ExpenseDialog from "@/components/dialogs/ExpenseDialog";
import TransferDialog from "@/components/dialogs/TransferDialog";
import TransferHistoryCard from "@/components/finance/TransferHistoryCard";
import AdvancedDateFilter from "@/components/shared/AdvancedDateFilter";
import ExportButtons from "@/components/shared/ExportButtons";
import PercentageChange from "@/components/finance/PercentageChange";
import { type DateRange, type FilterType, type FilterValue, getPreviousPeriodRange } from "@/utils/dateRangeUtils";
import { exportExpensesToCSV, exportToPDF } from "@/utils/exportUtils";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/shared/TablePagination";
import RecordDetailDialog from "@/components/dialogs/RecordDetailDialog";

export default function Expenses() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [previousRange, setPreviousRange] = useState<DateRange | null>(null);
  
  // Search state (local)
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sort & account filter from URL search params (prevents race condition with date filter)
  const [searchParams, setSearchParams] = useSearchParams();
  const sortBy = searchParams.get("sortBy") || "date-desc";
  const accountFilter = searchParams.get("account") || "all";
  
  const setSortBy = useCallback((value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("sortBy", value);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  
  const setAccountFilter = useCallback((value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "all") {
        next.delete("account");
      } else {
        next.set("account", value);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();
  
  // Company-level permissions
  const { canAddExpense, canEdit, canDelete, canTransfer, activeCompany, isModerator, canEditExpense, canDeleteExpense, canViewExpense } = useCompany();
  const { user } = useAuth();
  const showHistory = !isModerator || canViewExpense;
  
  const { data: rawExpenses = [], isLoading } = useExpenses();
  const expenses = useMemo(() => {
    if (!isModerator) return rawExpenses;
    return rawExpenses.filter(e => e.user_id === user?.id);
  }, [rawExpenses, isModerator, user?.id]);
  const { data: accounts = [] } = useAccountBalances();
  const { data: transfers = [] } = useKhataTransfers();
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();
  const transferMutation = useCreateKhataTransfer();
  const deleteTransferMutation = useDeleteKhataTransfer();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithAccount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingExpense, setViewingExpense] = useState<ExpenseWithAccount | null>(null);

  // DEO route guard: redirect if no expense permissions
  useEffect(() => {
    if (isModerator && !canAddExpense && !canViewExpense) {
      navigate("/dashboard", { replace: true });
    }
  }, [isModerator, canAddExpense, canViewExpense, navigate]);

  // No debounce needed — click-to-search

  const handleFilterChange = useCallback((range: DateRange, filterType: FilterType, filterValue: FilterValue) => {
    setDateRange(range);
    setPreviousRange(getPreviousPeriodRange(filterType, filterValue));
  }, []);

  // Filter expenses by entry date (created_at)
  const filteredExpenses = useMemo(() => {
    if (!dateRange) return [];
    return expenses.filter((e) => {
      const entryDate = (e.created_at ?? "").slice(0, 10);
      return entryDate >= dateRange.start && entryDate <= dateRange.end;
    });
  }, [expenses, dateRange]);

  // Apply search, account filter, and sort
  const searchedExpenses = useMemo(() => {
    let result = filteredExpenses;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) =>
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.expense_accounts?.name && e.expense_accounts.name.toLowerCase().includes(q))
      );
    }

    if (accountFilter !== "all") {
      result = result.filter((e) => e.expense_account_id === accountFilter);
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return (a.created_at ?? "").localeCompare(b.created_at ?? "");
        case "date-desc":
          return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        case "amount-desc": return Number(b.amount) - Number(a.amount);
        case "amount-asc": return Number(a.amount) - Number(b.amount);
        default:
          return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      }
    });

    return result;
  }, [filteredExpenses, searchQuery, accountFilter, sortBy]);

  // Pagination for searched expenses
  const pagination = usePagination(searchedExpenses);

  // Reset page when filters change (sortBy/accountFilter are now URL-derived, so stable across re-renders)
  useEffect(() => {
    pagination.resetPage();
  }, [dateRange, searchQuery, accountFilter, sortBy]);

  const activeFilterCount = (searchQuery ? 1 : 0) + (accountFilter !== "all" ? 1 : 0) + (sortBy !== "date-desc" ? 1 : 0);

  // Fetch recorder profiles
  const userIds = useMemo(() => [...new Set(filteredExpenses.map(e => e.user_id))], [filteredExpenses]);
  const { data: userProfiles = [] } = useQuery({
    queryKey: ["expense-user-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase.from("user_profiles").select("user_id, full_name, email").in("user_id", userIds);
      return data ?? [];
    },
    enabled: userIds.length > 0,
  });
  const getRecorderName = (userId: string) => {
    const p = userProfiles.find(p => p.user_id === userId);
    return p?.full_name || p?.email || "Unknown";
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("sortBy");
      next.delete("account");
      return next;
    }, { replace: true });
    pagination.resetPage();
  };

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [filteredExpenses]);

  const allTimeTotal = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  // Previous period total for comparison
  const previousTotal = useMemo(() => {
    if (!previousRange) return 0;
    return expenses
      .filter((e) => e.date >= previousRange.start && e.date <= previousRange.end)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses, previousRange]);

  // Expense breakdown by khata for selected period
  const filteredBreakdown = useMemo(() => {
    return accounts
      .map((account) => {
        const accountExpenses = filteredExpenses
          .filter((e) => e.expense_account_id === account.id)
          .reduce((sum, e) => sum + Number(e.amount), 0);
        return {
          id: account.id,
          name: account.name,
          color: account.color,
          amount: accountExpenses,
        };
      })
      .filter((item) => item.amount > 0);
  }, [accounts, filteredExpenses]);

  const accountsWithDeficit = accounts.filter((a) => a.balance < 0);
  const accountsNearLimit = accounts.filter(
    (a) => a.expected_monthly_expense && a.balance < a.expected_monthly_expense * 0.2 && a.balance >= 0
  );

  // Export handlers
  const handleExportCSV = () => {
    if (!dateRange) return;
    const data = filteredExpenses.map((e) => ({
      date: e.date,
      amount: Number(e.amount),
      accountName: e.expense_accounts?.name || "Uncategorized",
      description: e.description,
    }));
    exportExpensesToCSV(data, dateRange.label);
  };

  const handleExportPDF = async () => {
    if (!dateRange) return;
    await exportToPDF("expenses-content", "expenses", "Expenses Report", dateRange.label, activeCompany?.name || undefined);
  };

  const handleCreate = async (data: Record<string, any>) => {
    try {
      await createMutation.mutateAsync({
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
      const account = accounts.find((a) => a.id === data.expense_account_id);
      toast({ title: "Expense recorded", description: `${formatCurrency(data.amount, currency)} from ${account?.name}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleUpdate = async (data: Record<string, any>) => {
    if (!editingExpense) return;
    try {
      await updateMutation.mutateAsync({
        id: editingExpense.id,
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
      toast({ title: "Expense updated" });
      setEditingExpense(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Expense deleted" });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <SkeletonTable rows={6} columns={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="expenses-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            {isModerator && <Badge className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0 text-xs">Your Entries ({expenses.length})</Badge>}
          </div>
          <p className="text-muted-foreground">{isModerator ? "View and manage your expense entries" : "Record and track your spending by expense source"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isModerator && (
            <ExportButtons
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
              disabled={!dateRange}
            />
          )}
          {canTransfer && (
            <Button
              variant="outline"
              onClick={() => setTransferDialogOpen(true)}
              disabled={accounts.length < 2}
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Transfer
            </Button>
          )}
          {canAddExpense && (
            <Button onClick={() => setDialogOpen(true)} disabled={accounts.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Date Filter */}
      {showHistory && (
        <div className="flex flex-wrap items-center gap-2">
          <AdvancedDateFilter onFilterChange={handleFilterChange} defaultFilterType="monthly" />
        </div>
      )}

      {accounts.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {isModerator
              ? "No expense sources have been configured yet. Ask your admin to set up expense sources before you can record expenses."
              : "Create expense sources first before recording expenses."}
          </AlertDescription>
        </Alert>
      )}

      {/* Deficit Warnings - hidden for DEO */}
      {!isModerator && accountsWithDeficit.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Deficit Alert:</strong>{" "}
            {accountsWithDeficit.map((a) => (
              <span key={a.id} className="mr-2">
                {a.name} ({formatCurrency(Math.abs(a.balance), currency)} over)
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {!isModerator && accountsNearLimit.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Low Balance:</strong>{" "}
            {accountsNearLimit.map((a) => (
              <span key={a.id} className="mr-2">
                {a.name} ({formatCurrency(a.balance, currency)} left)
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards - hidden for DEO */}
      {!isModerator && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {dateRange?.label || "Selected Period"}
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(filteredTotal, currency)}</p>
              <p className="text-xs text-muted-foreground mt-1">{filteredExpenses.length} entries</p>
              {previousRange && (
                <PercentageChange
                  current={filteredTotal}
                  previous={previousTotal}
                  label={previousRange.label}
                  invertColors
                  className="mt-2"
                />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">All Time</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(allTimeTotal, currency)}</p>
              <p className="text-xs text-muted-foreground mt-1">{expenses.length} total entries</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Selected Period Breakdown - hidden for DEO */}
      {!isModerator && filteredBreakdown.length > 0 && dateRange && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spending by Expense Source - {dateRange.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredBreakdown.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-destructive">
                      {formatCurrency(item.amount, currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({((item.amount / filteredTotal) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Balances - hidden for DEO */}
      {!isModerator && accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Source Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    account.balance < 0 ? "border-destructive/50 bg-destructive/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />
                    <span className="font-medium">{account.name}</span>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        account.balance < 0 ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {formatCurrency(account.balance, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(account.total_spent, currency)} / {formatCurrency(account.total_allocated, currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Table */}
      {showHistory && (filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No expenses in {dateRange?.label || "selected period"}</h3>
            <p className="mb-4 max-w-sm text-muted-foreground">
              {expenses.length > 0
                ? "Try selecting a different date range or add new expenses."
                : "Start tracking your spending. Each expense will be deducted from the selected expense source's balance."}
            </p>
            {accounts.length > 0 && canAddExpense && (
              <Button onClick={() => setDialogOpen(true)}>Add Expense</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Expense History - {dateRange?.label}</CardTitle>
              <span className="text-sm text-muted-foreground">
                {searchedExpenses.length !== filteredExpenses.length
                  ? `Showing ${searchedExpenses.length} of ${filteredExpenses.length}`
                  : `${filteredExpenses.length} entries`}
              </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchBar
                placeholder="Search by description..."
                onSearch={setSearchQuery}
                defaultValue={searchQuery}
              />
              {accounts.length > 0 && (
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date Newest</SelectItem>
                  <SelectItem value="date-asc">Date Oldest</SelectItem>
                  <SelectItem value="amount-desc">Amount High</SelectItem>
                  <SelectItem value="amount-asc">Amount Low</SelectItem>
                </SelectContent>
              </Select>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
                  <X className="h-3 w-3" />
                  Reset
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">{activeFilterCount}</Badge>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {searchedExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No results match your filters.</p>
                <Button variant="link" onClick={resetFilters}>Clear filters</Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entry Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Expense Source</TableHead>
                        <TableHead className="hidden md:table-cell">Description</TableHead>
                        {((canEdit || canEditExpense) || (canDelete || canDeleteExpense)) && <TableHead className="w-32">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedItems.map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell className="font-medium">
                            {exp.created_at ? format(new Date(exp.created_at), "MMM d, yyyy h:mm a") : "—"}
                          </TableCell>
                          <TableCell className="font-semibold text-destructive">
                            {formatCurrency(Number(exp.amount), currency)}
                          </TableCell>
                          <TableCell>
                            {exp.expense_accounts ? (
                              <Badge variant="outline" style={getSourceBadgeStyle(exp.expense_accounts.name)}>
                                {exp.expense_accounts.name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" style={getSourceBadgeStyle(null)}>Uncategorized</Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden max-w-xs truncate md:table-cell">
                            {cleanSalaryTag(exp.description) || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          {((canEdit || canEditExpense) || (canDelete || canDeleteExpense)) && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setViewingExpense(exp)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {(canEdit || canEditExpense) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingExpense(exp);
                                      setDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {(canDelete || canDeleteExpense) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteId(exp.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div data-pdf-hide>
                  <TablePagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    startIndex={pagination.startIndex}
                    endIndex={pagination.endIndex}
                    itemsPerPage={pagination.itemsPerPage}
                    onPageChange={pagination.goToPage}
                    onItemsPerPageChange={pagination.setItemsPerPage}
                    canGoNext={pagination.canGoNext}
                    canGoPrev={pagination.canGoPrev}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Transfer History - hidden for DEO */}
      {!isModerator && (
        <TransferHistoryCard
          transfers={transfers}
          accounts={accounts}
          onDelete={async (id) => {
            await deleteTransferMutation.mutateAsync(id);
            toast({ title: "Transfer deleted" });
          }}
          isDeleting={deleteTransferMutation.isPending}
          limit={5}
        />
      )}

      {/* Create/Edit Dialog */}
      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingExpense(null);
        }}
        expense={editingExpense}
        accounts={accounts}
        onSave={editingExpense ? handleUpdate : handleCreate}
      />

      {/* Transfer Dialog */}
      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        accounts={accounts}
        onTransfer={async (data) => {
          await transferMutation.mutateAsync(data);
          const fromAcc = accounts.find((a) => a.id === data.from_account_id);
          const toAcc = accounts.find((a) => a.id === data.to_account_id);
          toast({
            title: "Transfer complete",
            description: `৳${data.amount.toLocaleString()} moved from ${fromAcc?.name} to ${toAcc?.name}`,
          });
        }}
        isPending={transferMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeleteId(null); }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (deleteMutation.isPending) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the expense and restore the amount to the khata's balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Detail Dialog */}
      <RecordDetailDialog
        open={!!viewingExpense}
        onOpenChange={(open) => { if (!open) setViewingExpense(null); }}
        title="Expense Details"
        fields={viewingExpense ? [
          { label: "Entry Date", value: viewingExpense.created_at ? format(new Date(viewingExpense.created_at), "MMM d, yyyy h:mm a") : "—" },
          { label: "Payment Date", value: format(new Date(viewingExpense.date), "MMM d, yyyy") },
          { label: "Amount", value: formatCurrency(Number(viewingExpense.amount), currency) },
          { label: "Expense Source", value: viewingExpense.expense_accounts?.name || "Uncategorized" },
          { label: "Description", value: cleanSalaryTag(viewingExpense.description) || "—" },
          { label: "Recorded By", value: getRecorderName(viewingExpense.user_id) },
          ...(viewingExpense.vendor_name ? [{ label: "Vendor", value: viewingExpense.vendor_name }] : []),
          ...(viewingExpense.invoice_number ? [{ label: "Invoice #", value: viewingExpense.invoice_number }] : []),
        ] : []}
      />
    </div>
  );
}
