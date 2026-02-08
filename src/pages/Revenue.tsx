import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  useRevenues,
  useCreateRevenue,
  useUpdateRevenue,
  useDeleteRevenue,
  type RevenueWithSource,
} from "@/hooks/useRevenues";
import { useRevenueSources, useCreateRevenueSource } from "@/hooks/useRevenueSources";
import { useExpenseAccounts } from "@/hooks/useExpenseAccounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "lucide-react";
import RevenueDialog from "@/components/RevenueDialog";
import AdvancedDateFilter from "@/components/AdvancedDateFilter";
import ExportButtons from "@/components/ExportButtons";
import PercentageChange from "@/components/PercentageChange";
import { type DateRange, type FilterType, type FilterValue, getPreviousPeriodRange } from "@/utils/dateRangeUtils";
import { exportRevenuesToCSV, exportToPDF } from "@/utils/exportUtils";

export default function Revenue() {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [previousRange, setPreviousRange] = useState<DateRange | null>(null);
  
  const { data: revenues = [], isLoading } = useRevenues();
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

  const handleFilterChange = useCallback((range: DateRange, filterType: FilterType, filterValue: FilterValue) => {
    setDateRange(range);
    setPreviousRange(getPreviousPeriodRange(filterType, filterValue));
  }, []);

  // Filter revenues by selected date range
  const filteredRevenues = useMemo(() => {
    if (!dateRange) return [];
    return revenues.filter((r) => r.date >= dateRange.start && r.date <= dateRange.end);
  }, [revenues, dateRange]);

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
    return sources
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
    await exportToPDF("revenue-content", "revenue", "Revenue Report", dateRange.label);
  };

  const handleCreate = async (data: { amount: number; date: string; source_id: string | null; description: string | null }) => {
    try {
      await createMutation.mutateAsync(data);
      toast({ title: "Revenue added", description: `৳${data.amount.toLocaleString()} allocated to ${activeAccounts.length} khatas` });
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="revenue-content">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue</h1>
          <p className="text-muted-foreground">Track income and automatically allocate to khatas</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            disabled={!dateRange}
          />
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Revenue
          </Button>
        </div>
      </div>

      {/* Advanced Date Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <AdvancedDateFilter onFilterChange={handleFilterChange} defaultFilterType="monthly" />
      </div>

      {activeAccounts.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No active khatas! Revenue won't be allocated until you create expense accounts.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {dateRange?.label || "Selected Period"}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">৳{filteredTotal.toLocaleString()}</p>
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
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">৳{allTimeTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{revenues.length} total entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Source for Selected Period */}
      {filteredBySource.length > 0 && dateRange && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Source - {dateRange.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredBySource.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.name}</Badge>
                    <span className="text-xs text-muted-foreground">({item.count} entries)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">
                      ৳{item.amount.toLocaleString()}
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

      {/* Allocation Info */}
      {activeAccounts.length > 0 && (
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
      {filteredRevenues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No revenue in {dateRange?.label || "selected period"}</h3>
            <p className="mb-4 max-w-sm text-muted-foreground">
              {revenues.length > 0 
                ? "Try selecting a different date range or add new revenue."
                : "Start tracking your income. Each entry will be automatically allocated to your active khatas."}
            </p>
            <Button onClick={() => setDialogOpen(true)}>Add Revenue</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Revenue History - {dateRange?.label}</CardTitle>
            <span className="text-sm text-muted-foreground">{filteredRevenues.length} entries</span>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRevenues.map((rev) => (
                    <TableRow key={rev.id}>
                      <TableCell className="font-medium">
                        {format(new Date(rev.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        ৳{Number(rev.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {rev.revenue_sources?.name ? (
                          <Badge variant="secondary">{rev.revenue_sources.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden max-w-xs truncate md:table-cell">
                        {rev.description || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(rev.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this revenue?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the revenue entry and all its allocations to khatas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
