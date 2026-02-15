import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
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
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { SkeletonTable } from "@/components/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";
import ExpenseDialog from "@/components/ExpenseDialog";
import TransferDialog from "@/components/TransferDialog";
import TransferHistoryCard from "@/components/TransferHistoryCard";
import AdvancedDateFilter from "@/components/AdvancedDateFilter";
import ExportButtons from "@/components/ExportButtons";
import PercentageChange from "@/components/PercentageChange";
import { type DateRange, type FilterType, type FilterValue, getPreviousPeriodRange } from "@/utils/dateRangeUtils";
import { exportExpensesToCSV, exportToPDF } from "@/utils/exportUtils";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";

export default function Expenses() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [previousRange, setPreviousRange] = useState<DateRange | null>(null);
  
  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();
  
  // Company-level permissions
  const { canAddExpense, canEdit, canDelete, canTransfer, isCompanyViewer, activeCompany, isDataEntryOperator, canEditExpense, canDeleteExpense, canViewExpense } = useCompany();
  const showHistory = !isDataEntryOperator || canViewExpense;
  
  const { data: expenses = [], isLoading } = useExpenses();
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

  // DEO route guard: redirect if no expense permissions
  useEffect(() => {
    if (isDataEntryOperator && !canAddExpense && !canViewExpense) {
      navigate("/dashboard", { replace: true });
    }
  }, [isDataEntryOperator, canAddExpense, canViewExpense, navigate]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFilterChange = useCallback((range: DateRange, filterType: FilterType, filterValue: FilterValue) => {
    setDateRange(range);
    setPreviousRange(getPreviousPeriodRange(filterType, filterValue));
  }, []);

  // Filter expenses by selected date range
  const filteredExpenses = useMemo(() => {
    if (!dateRange) return [];
    return expenses.filter((e) => e.date >= dateRange.start && e.date <= dateRange.end);
  }, [expenses, dateRange]);

  // Apply search, account filter, and sort
  const searchedExpenses = useMemo(() => {
    let result = filteredExpenses;

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
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
        case "date-asc": return a.date.localeCompare(b.date);
        case "date-desc": return b.date.localeCompare(a.date);
        case "amount-desc": return Number(b.amount) - Number(a.amount);
        case "amount-asc": return Number(a.amount) - Number(b.amount);
        default: return b.date.localeCompare(a.date);
      }
    });

    return result;
  }, [filteredExpenses, debouncedSearch, accountFilter, sortBy]);

  // Pagination for searched expenses
  const pagination = usePagination(searchedExpenses);

  // Reset page when filters change
  useEffect(() => {
    pagination.resetPage();
  }, [dateRange, debouncedSearch, accountFilter, sortBy]);

  const activeFilterCount = (debouncedSearch ? 1 : 0) + (accountFilter !== "all" ? 1 : 0) + (sortBy !== "date-desc" ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery("");
    setAccountFilter("all");
    setSortBy("date-desc");
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

  const handleCreate = async (data: {
    amount: number;
    date: string;
    expense_account_id: string;
    description: string | null;
  }) => {
    try {
      await createMutation.mutateAsync(data);
      const account = accounts.find((a) => a.id === data.expense_account_id);
      toast({ title: "Expense recorded", description: `${formatCurrency(data.amount, currency)} from ${account?.name}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleUpdate = async (data: {
    amount: number;
    date: string;
    expense_account_id: string;
    description: string | null;
  }) => {
    if (!editingExpense) return;
    try {
      await updateMutation.mutateAsync({ id: editingExpense.id, ...data });
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
            {isCompanyViewer && <Badge variant="secondary" className="text-xs">View Only</Badge>}
          </div>
          <p className="text-muted-foreground">Record and track your spending by expense source</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isDataEntryOperator && (
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
            Create expense sources first before recording expenses.
          </AlertDescription>
        </Alert>
      )}

      {/* Deficit Warnings - hidden for DEO */}
      {!isDataEntryOperator && accountsWithDeficit.length > 0 && (
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

      {!isDataEntryOperator && accountsNearLimit.length > 0 && (
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
      {!isDataEntryOperator && (
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
      {!isDataEntryOperator && filteredBreakdown.length > 0 && dateRange && (
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
      {!isDataEntryOperator && accounts.length > 0 && (
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
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
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
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Expense Source</TableHead>
                        <TableHead className="hidden md:table-cell">Description</TableHead>
                        {((canEdit || canEditExpense) || (canDelete || canDeleteExpense)) && <TableHead className="w-24">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedItems.map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell className="font-medium">
                            {format(new Date(exp.date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="font-semibold text-destructive">
                            {formatCurrency(Number(exp.amount), currency)}
                          </TableCell>
                          <TableCell>
                            {exp.expense_accounts ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: exp.expense_accounts.color }}
                                />
                                <span>{exp.expense_accounts.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden max-w-xs truncate md:table-cell">
                            {exp.description || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          {((canEdit || canEditExpense) || (canDelete || canDeleteExpense)) && (
                            <TableCell>
                              <div className="flex gap-1">
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
      {!isDataEntryOperator && (
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
    </div>
  );
}
