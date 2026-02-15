import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  useRevenues,
  useCreateRevenue,
  useUpdateRevenue,
  useDeleteRevenue,
  type RevenueWithSource,
} from "@/hooks/useRevenues";
import { getSourceBadgeStyle } from "@/utils/sourceColors";
import { useRevenueSources, useCreateRevenueSource } from "@/hooks/useRevenueSources";
import { useExpenseAccounts } from "@/hooks/useExpenseAccounts";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
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
  TrendingUp,
  Loader2,
  AlertTriangle,
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { SkeletonTable } from "@/components/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";
import RevenueDialog from "@/components/RevenueDialog";
import AdvancedDateFilter from "@/components/AdvancedDateFilter";
import ExportButtons from "@/components/ExportButtons";
import PercentageChange from "@/components/PercentageChange";
import { type DateRange, type FilterType, type FilterValue, getPreviousPeriodRange } from "@/utils/dateRangeUtils";
import { exportRevenuesToCSV, exportToPDF } from "@/utils/exportUtils";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";

export default function Revenue() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [previousRange, setPreviousRange] = useState<DateRange | null>(null);
  
  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();
  
  // Company-level permissions
  const { canAddRevenue, canEdit, canDelete, isCompanyModerator: isModerator, isCompanyViewer, activeCompany, isDataEntryOperator, canEditRevenue, canDeleteRevenue, canViewRevenue } = useCompany();
  const { user } = useAuth();
  const showHistory = !isDataEntryOperator || canViewRevenue;
  
  const { data: rawRevenues = [], isLoading } = useRevenues();
  const revenues = useMemo(() => {
    if (!isDataEntryOperator) return rawRevenues;
    return rawRevenues.filter(r => r.user_id === user?.id);
  }, [rawRevenues, isDataEntryOperator, user?.id]);
  const { data: sources = [] } = useRevenueSources();
  const { data: accounts = [] } = useExpenseAccounts();
  const createMutation = useCreateRevenue();
  const updateMutation = useUpdateRevenue();
  const deleteMutation = useDeleteRevenue();
  const createSourceMutation = useCreateRevenueSource();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<RevenueWithSource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const activeAccounts = accounts.filter((a) => a.is_active);
  const totalAllocationPercent = activeAccounts.reduce((sum, a) => sum + Number(a.allocation_percentage), 0);

  // DEO route guard: redirect if no revenue permissions
  useEffect(() => {
    if (isDataEntryOperator && !canAddRevenue && !canViewRevenue) {
      navigate("/dashboard", { replace: true });
    }
  }, [isDataEntryOperator, canAddRevenue, canViewRevenue, navigate]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFilterChange = useCallback((range: DateRange, filterType: FilterType, filterValue: FilterValue) => {
    setDateRange(range);
    setPreviousRange(getPreviousPeriodRange(filterType, filterValue));
  }, []);

  // Filter revenues by selected date range
  const filteredRevenues = useMemo(() => {
    if (!dateRange) return [];
    return revenues.filter((r) => r.date >= dateRange.start && r.date <= dateRange.end);
  }, [revenues, dateRange]);

  // Apply search, source filter, and sort on top of date-filtered revenues
  const searchedRevenues = useMemo(() => {
    let result = filteredRevenues;

    // Text search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((r) =>
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.revenue_sources?.name && r.revenue_sources.name.toLowerCase().includes(q))
      );
    }

    // Source filter
    if (sourceFilter !== "all") {
      result = result.filter((r) => r.source_id === sourceFilter);
    }

    // Sort
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
  }, [filteredRevenues, debouncedSearch, sourceFilter, sortBy]);

  // Pagination for searched revenues
  const pagination = usePagination(searchedRevenues);

  // Reset page when filters change
  useEffect(() => {
    pagination.resetPage();
  }, [dateRange, debouncedSearch, sourceFilter, sortBy]);

  const activeFilterCount = (debouncedSearch ? 1 : 0) + (sourceFilter !== "all" ? 1 : 0) + (sortBy !== "date-desc" ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery("");
    setSourceFilter("all");
    setSortBy("date-desc");
  };

  const filteredTotal = useMemo(() => {
    return filteredRevenues.reduce((sum, r) => sum + Number(r.amount), 0);
  }, [filteredRevenues]);

  const allTimeTotal = useMemo(() => {
    return revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  }, [revenues]);

  // Previous period total for comparison
  const previousTotal = useMemo(() => {
    if (!previousRange) return 0;
    return revenues
      .filter((r) => r.date >= previousRange.start && r.date <= previousRange.end)
      .reduce((sum, r) => sum + Number(r.amount), 0);
  }, [revenues, previousRange]);

  // Revenue by source for selected period
  const filteredBySource = useMemo(() => {
    const bySource = sources
      .map((source) => {
        const sourceRevenue = filteredRevenues
          .filter((r) => r.source_id === source.id)
          .reduce((sum, r) => sum + Number(r.amount), 0);
        return {
          id: source.id,
          name: source.name,
          amount: sourceRevenue,
          count: filteredRevenues.filter((r) => r.source_id === source.id).length,
        };
      })
      .filter((item) => item.amount > 0);

    // Add "Uncategorized" for revenues with no source
    const uncategorized = filteredRevenues.filter((r) => !r.source_id);
    if (uncategorized.length > 0) {
      bySource.push({
        id: "uncategorized",
        name: "Uncategorized",
        amount: uncategorized.reduce((sum, r) => sum + Number(r.amount), 0),
        count: uncategorized.length,
      });
    }

    return bySource;
  }, [sources, filteredRevenues]);

  // Export handlers
  const handleExportCSV = () => {
    if (!dateRange) return;
    const data = filteredRevenues.map((r) => ({
      date: r.date,
      amount: Number(r.amount),
      sourceName: r.revenue_sources?.name || "Uncategorized",
      description: r.description,
    }));
    exportRevenuesToCSV(data, dateRange.label);
  };

  const handleExportPDF = async () => {
    if (!dateRange) return;
    await exportToPDF("revenue-content", "revenue", "Revenue Report", dateRange.label, activeCompany?.name || undefined);
  };

  const handleCreate = async (data: { amount: number; date: string; source_id: string | null; description: string | null }) => {
    try {
      await createMutation.mutateAsync(data);
      toast({ title: "Revenue added", description: `${formatCurrency(data.amount, currency)} allocated to ${activeAccounts.length} expense sources` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleUpdate = async (data: { amount: number; date: string; source_id: string | null; description: string | null }) => {
    if (!editingRevenue) return;
    try {
      await updateMutation.mutateAsync({ id: editingRevenue.id, ...data });
      toast({ title: "Revenue updated" });
      setEditingRevenue(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Revenue deleted" });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateSource = async (name: string) => {
    try {
      await createSourceMutation.mutateAsync(name);
      toast({ title: "Source created" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
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
    <div className="space-y-6" id="revenue-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Revenue</h1>
            {isCompanyViewer && <Badge variant="secondary" className="text-xs">View Only</Badge>}
            {isDataEntryOperator && <Badge className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0 text-xs">Your Entries ({revenues.length})</Badge>}
          </div>
          <p className="text-muted-foreground">{isDataEntryOperator ? "View and manage your revenue entries" : "Track income and automatically allocate to expense sources"}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isDataEntryOperator && (
            <ExportButtons
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
              disabled={!dateRange}
            />
          )}
          {canAddRevenue && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Revenue
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

      {activeAccounts.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No active expense sources! Revenue won't be allocated until you create expense sources.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards - hidden for DEO */}
      {!isDataEntryOperator && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {dateRange?.label || "Selected Period"}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{formatCurrency(filteredTotal, currency)}</p>
              <p className="text-xs text-muted-foreground mt-1">{filteredRevenues.length} entries</p>
              {previousRange && (
                <PercentageChange
                  current={filteredTotal}
                  previous={previousTotal}
                  label={previousRange.label}
                  className="mt-2"
                />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">All Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(allTimeTotal, currency)}</p>
              <p className="text-xs text-muted-foreground mt-1">{revenues.length} total entries</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue by Source for Selected Period - hidden for DEO */}
      {!isDataEntryOperator && filteredBySource.length > 0 && dateRange && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Source - {dateRange.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredBySource.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" style={getSourceBadgeStyle(item.name)}>{item.name}</Badge>
                    <span className="text-xs text-muted-foreground">({item.count} entries)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-success">
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

      {/* Allocation Info - hidden for DEO */}
      {!isDataEntryOperator && activeAccounts.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              New revenue will be allocated: {activeAccounts.map((a) => (
                <span key={a.id} className="mr-2">
                  <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: a.color }} />
                  {a.name} ({a.allocation_percentage}%)
                </span>
              ))}
              {totalAllocationPercent < 100 && (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  + Profit ({(100 - totalAllocationPercent).toFixed(1)}%)
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Revenue Table */}
      {showHistory && (filteredRevenues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No revenue in {dateRange?.label || "selected period"}</h3>
            <p className="mb-4 max-w-sm text-muted-foreground">
              {revenues.length > 0 
                ? "Try selecting a different date range or add new revenue."
                : "Start tracking your income. Each entry will be automatically allocated to your active expense sources."}
            </p>
            {canAddRevenue && <Button onClick={() => setDialogOpen(true)}>Add Revenue</Button>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Revenue History - {dateRange?.label}</CardTitle>
              <span className="text-sm text-muted-foreground">
                {searchedRevenues.length !== filteredRevenues.length
                  ? `Showing ${searchedRevenues.length} of ${filteredRevenues.length}`
                  : `${filteredRevenues.length} entries`}
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
              {sources.length > 0 && (
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
            {searchedRevenues.length === 0 ? (
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
                        <TableHead>Source</TableHead>
                        <TableHead className="hidden md:table-cell">Description</TableHead>
                        {((canEdit || canEditRevenue) || (canDelete || canDeleteRevenue)) && <TableHead className="w-24">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedItems.map((rev) => (
                        <TableRow key={rev.id}>
                          <TableCell className="font-medium">
                            {format(new Date(rev.date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            {formatCurrency(Number(rev.amount), currency)}
                          </TableCell>
                          <TableCell>
                            {rev.revenue_sources?.name ? (
                              <Badge variant="secondary" style={getSourceBadgeStyle(rev.revenue_sources.name)}>{rev.revenue_sources.name}</Badge>
                            ) : (
                              <Badge variant="outline" style={getSourceBadgeStyle(null)}>Uncategorized</Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden max-w-xs truncate md:table-cell">
                            {rev.description || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          {((canEdit || canEditRevenue) || (canDelete || canDeleteRevenue)) && (
                            <TableCell>
                              <div className="flex gap-1">
                                {(canEdit || canEditRevenue) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingRevenue(rev);
                                      setDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {(canDelete || canDeleteRevenue) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteId(rev.id)}
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

      {/* Create/Edit Dialog */}
      <RevenueDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingRevenue(null);
        }}
        revenue={editingRevenue}
        sources={sources}
        onSave={editingRevenue ? handleUpdate : handleCreate}
        onCreateSource={handleCreateSource}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeleteId(null); }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (deleteMutation.isPending) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this revenue?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the revenue entry and all its allocations to expense sources.
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
