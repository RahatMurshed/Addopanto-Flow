import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
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
  TrendingUp,
  Loader2,
  AlertTriangle,
  Search,
  X,
  SlidersHorizontal,
  Eye,
} from "lucide-react";
import { SkeletonTable } from "@/components/shared/SkeletonLoaders";
import { Skeleton } from "@/components/ui/skeleton";
import RevenueDialog from "@/components/dialogs/RevenueDialog";
import AdvancedDateFilter from "@/components/shared/AdvancedDateFilter";
import ExportButtons from "@/components/shared/ExportButtons";
import PercentageChange from "@/components/finance/PercentageChange";
import { type DateRange, type FilterType, type FilterValue, getPreviousPeriodRange } from "@/utils/dateRangeUtils";
import { exportRevenuesToCSV, exportToPDF } from "@/utils/exportUtils";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/shared/TablePagination";
import RecordDetailDialog from "@/components/dialogs/RecordDetailDialog";

export default function Revenue() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [previousRange, setPreviousRange] = useState<DateRange | null>(null);
  
  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();
  
  // Company-level permissions
  const { canAddRevenue, canEdit, canDelete, isModerator, activeCompany, canEditRevenue, canDeleteRevenue, canViewRevenue, isDataEntryModerator } = useCompany();
  const { user } = useAuth();
  const showHistory = !isModerator || canViewRevenue;
  
  

  const { data: rawRevenues = [], isLoading } = useRevenues();
  // Moderators with canViewRevenue see ALL entries; otherwise only their own
  const revenues = useMemo(() => {
    if (!isModerator) return rawRevenues;
    if (canViewRevenue) return rawRevenues; // Full visibility
    return rawRevenues.filter(r => r.user_id === user?.id);
  }, [rawRevenues, isModerator, canViewRevenue, user?.id]);
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
  const [viewingRevenue, setViewingRevenue] = useState<RevenueWithSource | null>(null);

  const activeAccounts = accounts.filter((a) => a.is_active);
  const totalAllocationPercent = activeAccounts.reduce((sum, a) => sum + Number(a.allocation_percentage), 0);




  // No debounce needed — click-to-search

  const handleFilterChange = useCallback((range: DateRange, filterType: FilterType, filterValue: FilterValue) => {
    setDateRange(range);
    setPreviousRange(getPreviousPeriodRange(filterType, filterValue));
  }, []);

  // Filter revenues by entry date (created_at)
  const filteredRevenues = useMemo(() => {
    if (!dateRange) return [];
    return revenues.filter((r) => {
      const entryDate = (r.created_at ?? "").slice(0, 10);
      return entryDate >= dateRange.start && entryDate <= dateRange.end;
    });
  }, [revenues, dateRange]);

  // Apply search, source filter, and sort on top of date-filtered revenues
  const searchedRevenues = useMemo(() => {
    let result = filteredRevenues;

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
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
        case "date-asc": return (a.created_at ?? "").localeCompare(b.created_at ?? "");
        case "date-desc": return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        case "amount-desc": return Number(b.amount) - Number(a.amount);
        case "amount-asc": return Number(a.amount) - Number(b.amount);
        default: return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      }
    });

    return result;
  }, [filteredRevenues, searchQuery, sourceFilter, sortBy]);

  // Pagination for searched revenues
  const pagination = usePagination(searchedRevenues);

  // Reset page when filters change
  useEffect(() => {
    pagination.resetPage();
  }, [dateRange, searchQuery, sourceFilter, sortBy]);

  const activeFilterCount = (searchQuery ? 1 : 0) + (sourceFilter !== "all" ? 1 : 0) + (sortBy !== "date-desc" ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery("");
    setSourceFilter("all");
    setSortBy("date-desc");
  };

  // Fetch recorder profiles
  const userIds = useMemo(() => [...new Set(filteredRevenues.map(r => r.user_id))], [filteredRevenues]);
  const { data: userProfiles = [] } = useQuery({
    queryKey: ["revenue-user-profiles", userIds],
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
            {isModerator && <Badge className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0 text-xs">Your Entries ({revenues.length})</Badge>}
          </div>
          <p className="text-muted-foreground">{isModerator ? "View and manage your revenue entries" : "Track income and automatically allocate to expense sources"}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isModerator && (
            <ExportButtons
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
              disabled={!dateRange}
            />
          )}
          {canAddRevenue && !isDataEntryModerator && (
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
      {!isModerator && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          {/* Student Fees vs Product Sales Split */}
          <RevenueSplitCard revenues={filteredRevenues} formatCurrency={formatCurrency} currency={currency} label={dateRange?.label} />
        </div>
      )}

      {/* Revenue by Source for Selected Period - hidden for DEO */}
      {!isModerator && filteredBySource.length > 0 && dateRange && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Source - {dateRange.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredBySource.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" style={getSourceBadgeStyle(item.name)}>{item.name}</Badge>
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
      {!isModerator && activeAccounts.length > 0 && (
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
            {canAddRevenue && !isDataEntryModerator && <Button onClick={() => setDialogOpen(true)}>Add Revenue</Button>}
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
              <SearchBar
                placeholder="Search by description..."
                onSearch={setSearchQuery}
                defaultValue={searchQuery}
              />
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
                        <TableHead>Entry Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="hidden md:table-cell">Description</TableHead>
                        {((canEdit || canEditRevenue) || (canDelete || canDeleteRevenue)) && <TableHead className="w-32">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedItems.map((rev) => (
                        <TableRow key={rev.id}>
                          <TableCell className="font-medium">
                            {rev.created_at ? format(new Date(rev.created_at), "MMM d, yyyy h:mm a") : "—"}
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            {formatCurrency(Number(rev.amount), currency)}
                          </TableCell>
                          <TableCell>
                            {rev.revenue_sources?.name ? (
                              <Badge variant="outline" style={getSourceBadgeStyle(rev.revenue_sources.name)}>{rev.revenue_sources.name}</Badge>
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
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setViewingRevenue(rev)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {(canEdit || canEditRevenue) && (
                                  rev.is_system_generated ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 opacity-50 cursor-not-allowed"
                                              disabled
                                            >
                                              <Pencil className="h-4 w-4" />
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          This revenue entry was auto-generated from a student payment or product sale. Edit the original record instead.
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
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
                                  )
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

      {/* View Detail Dialog */}
      <RecordDetailDialog
        open={!!viewingRevenue}
        onOpenChange={(open) => { if (!open) setViewingRevenue(null); }}
        title="Revenue Details"
        fields={viewingRevenue ? [
          { label: "Entry Date", value: viewingRevenue.created_at ? format(new Date(viewingRevenue.created_at), "MMM d, yyyy h:mm a") : "—" },
          { label: "Transaction Date", value: format(new Date(viewingRevenue.date), "MMM d, yyyy") },
          { label: "Amount", value: formatCurrency(Number(viewingRevenue.amount), currency) },
          { label: "Source", value: viewingRevenue.revenue_sources?.name || "Uncategorized" },
          { label: "Description", value: viewingRevenue.description || "—" },
          { label: "Recorded By", value: getRecorderName(viewingRevenue.user_id) },
          { label: "System Generated", value: viewingRevenue.is_system_generated ? "Yes" : "No" },
        ] : []}
      />
    </div>
  );
}

// --- Revenue Split Card sub-component ---
function RevenueSplitCard({
  revenues,
  formatCurrency,
  currency,
  label,
}: {
  revenues: RevenueWithSource[];
  formatCurrency: (amount: number, currency?: string) => string;
  currency: string;
  label?: string;
}) {
  const studentFees = useMemo(
    () => revenues.filter((r) => r.student_payment_id).reduce((s, r) => s + Number(r.amount), 0),
    [revenues]
  );
  const productSales = useMemo(
    () => revenues.filter((r) => r.product_sale_id).reduce((s, r) => s + Number(r.amount), 0),
    [revenues]
  );
  const total = studentFees + productSales;
  const studentPct = total > 0 ? ((studentFees / total) * 100).toFixed(0) : "0";
  const productPct = total > 0 ? ((productSales / total) * 100).toFixed(0) : "0";

  if (total === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Split{label ? ` — ${label}` : ""}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Student Fees</span>
          <span className="font-semibold">{formatCurrency(studentFees, currency)} ({studentPct}%)</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${studentPct}%` }} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Product Sales</span>
          <span className="font-semibold">{formatCurrency(productSales, currency)} ({productPct}%)</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-accent-foreground/60" style={{ width: `${productPct}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}
