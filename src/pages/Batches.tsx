import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import BatchDateFilter, { type BatchFilterValue, getDefaultBatchFilter, getFilterLabel, isMonthIncluded } from "@/components/BatchDateFilter";
import { useBatches, useCreateBatch, useDeleteBatch, useUpdateBatch, type BatchInsert } from "@/hooks/useBatches";
import { useCompany } from "@/contexts/CompanyContext";
import { useStudents } from "@/hooks/useStudents";
import { useStudentPayments, computeStudentSummary } from "@/hooks/useStudentPayments";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatCurrency } from "@/utils/currencyUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, Pencil, Trash2, Layers, Search, X, Loader2, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/SkeletonLoaders";
import BatchDialog from "@/components/BatchDialog";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";
import type { Batch } from "@/hooks/useBatches";

export default function Batches() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "archived">("all");
  const [filterValue, setFilterValue] = useState<BatchFilterValue>(getDefaultBatchFilter);
  const { data: batches = [], isLoading } = useBatches({ search, status: statusFilter });
  const { data: allStudents = [] } = useStudents();
  const { data: allPayments = [] } = useStudentPayments();
  const { canAddRevenue, canEdit, canDelete, isCompanyViewer } = useCompany();
  const { data: userProfile } = useUserProfile();
  const currency = userProfile?.currency || "BDT";
  const navigate = useNavigate();
  const { toast } = useToast();

  const createMutation = useCreateBatch();
  const updateMutation = useUpdateBatch();
  const deleteMutation = useDeleteBatch();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Build per-batch analytics based on filter
  const batchAnalytics = useMemo(() => {
    const map = new Map<string, { studentCount: number; monthRevenue: number; monthPending: number; overdueCount: number; monthOverdueCount: number; monthOverdueAmount: number }>();
    for (const b of batches) {
      const students = allStudents.filter((s: any) => s.batch_id === b.id);
      let monthRevenue = 0;
      let monthPending = 0;
      let overdueCount = 0;
      let monthOverdueCount = 0;
      let monthOverdueAmount = 0;
      for (const s of students) {
        const batchStartDate = new Date(b.start_date);
        const batchCourseStart = `${batchStartDate.getFullYear()}-${String(batchStartDate.getMonth() + 1).padStart(2, "0")}`;
        let batchCourseEnd = "";
        if (b.course_duration_months) {
          const endDate = new Date(batchStartDate);
          endDate.setMonth(endDate.getMonth() + b.course_duration_months - 1);
          batchCourseEnd = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}`;
        }
        const effMonthly = Number(s.monthly_fee_amount) || Number(b.default_monthly_fee) || 0;
        const effectiveStudent = {
          ...s,
          admission_fee_total: Number(s.admission_fee_total) || Number(b.default_admission_fee) || 0,
          monthly_fee_amount: effMonthly,
          course_start_month: s.course_start_month || batchCourseStart || null,
          course_end_month: s.course_end_month || batchCourseEnd || null,
        };
        const payments = allPayments.filter((p) => p.student_id === s.id);
        const sum = computeStudentSummary(effectiveStudent, payments);

        const allMonths = [...sum.monthlyPaidMonths, ...sum.monthlyPartialMonths, ...sum.monthlyOverdueMonths, ...sum.monthlyPendingMonths];
        // Filter months based on current filter
        const includedMonths = allMonths.filter((m) => isMonthIncluded(m, filterValue));

        for (const m of includedMonths) {
          const paid = sum.monthlyPaymentsByMonth.get(m) || 0;
          monthRevenue += paid;
          monthPending += Math.max(0, effMonthly - paid);
        }

        if (sum.monthlyOverdueMonths.length > 0) overdueCount++;

        // Overdue for included months
        const overdueInRange = sum.monthlyOverdueMonths.filter((m) => isMonthIncluded(m, filterValue));
        const partialInRange = sum.monthlyPartialMonths.filter((m) => isMonthIncluded(m, filterValue));
        if (overdueInRange.length > 0 || partialInRange.length > 0) {
          monthOverdueCount++;
          for (const m of [...overdueInRange, ...partialInRange]) {
            monthOverdueAmount += effMonthly - (sum.monthlyPaymentsByMonth.get(m) || 0);
          }
        }
      }
      map.set(b.id, { studentCount: students.length, monthRevenue, monthPending, overdueCount, monthOverdueCount, monthOverdueAmount });
    }
    return map;
  }, [batches, allStudents, allPayments, filterValue]);

  const pagination = usePagination(batches);

  useEffect(() => {
    pagination.goToPage(1);
  }, [search, statusFilter]);

  const handleCreate = async (data: BatchInsert) => {
    try {
      await createMutation.mutateAsync(data);
      toast({ title: "Batch created successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleUpdate = async (data: BatchInsert) => {
    if (!editBatch) return;
    try {
      await updateMutation.mutateAsync({ id: editBatch.id, ...data });
      toast({ title: "Batch updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const analytics = batchAnalytics.get(deleteId);
    const count = analytics?.studentCount || 0;
    if (count > 0) {
      toast({ title: "Cannot delete", description: `This batch has ${count} student(s). Remove or reassign them first.`, variant: "destructive" });
      setDeleteId(null);
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Batch deleted" });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const totalStudentsInBatches = useMemo(() => {
    let total = 0;
    for (const a of batchAnalytics.values()) total += a.studentCount;
    return total;
  }, [batchAnalytics]);

  const totalRevenue = useMemo(() => {
    let total = 0;
    for (const a of batchAnalytics.values()) total += a.monthRevenue;
    return total;
  }, [batchAnalytics]);

  const totalPendingAll = useMemo(() => {
    let total = 0;
    for (const a of batchAnalytics.values()) total += a.monthPending;
    return total;
  }, [batchAnalytics]);

  const totalOverdue = useMemo(() => {
    let count = 0;
    let amount = 0;
    for (const a of batchAnalytics.values()) {
      count += a.monthOverdueCount;
      amount += a.monthOverdueAmount;
    }
    return { count, amount };
  }, [batchAnalytics]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Active</Badge>;
      case "completed": return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">Completed</Badge>;
      case "archived": return <Badge variant="secondary">Archived</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-7 w-32 mb-2" /><Skeleton className="h-4 w-72" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <SkeletonTable rows={5} columns={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Batches</h1>
            {isCompanyViewer && <Badge variant="secondary" className="text-xs">View Only</Badge>}
          </div>
          <p className="text-muted-foreground">Manage student batches and track batch-level analytics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BatchDateFilter value={filterValue} onChange={setFilterValue} />
          {canAddRevenue && (
            <Button onClick={() => { setEditBatch(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Create Batch
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalStudentsInBatches}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{getFilterLabel("Revenue", filterValue)}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalRevenue, currency)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{getFilterLabel("Pending", filterValue)}</CardTitle>
            <Layers className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalPendingAll, currency)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{getFilterLabel("Overdue", filterValue)}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOverdue.amount, currency)}</p>
            {totalOverdue.count > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{totalOverdue.count} student{totalOverdue.count !== 1 ? "s" : ""}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Section */}
      {(() => {
        const overdueBatches = batches.filter((b) => {
          const a = batchAnalytics.get(b.id);
          return a && a.monthOverdueCount > 0;
        });
        const totalOverdueStudents = overdueBatches.reduce((t, b) => t + (batchAnalytics.get(b.id)?.monthOverdueCount || 0), 0);
        const totalOverdueAmt = overdueBatches.reduce((t, b) => t + (batchAnalytics.get(b.id)?.monthOverdueAmount || 0), 0);
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <CardTitle className="text-base">{getFilterLabel("Overdue", filterValue)}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {overdueBatches.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No overdue students for this period.</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch Name</TableHead>
                        <TableHead className="text-right">Overdue Students</TableHead>
                        <TableHead className="text-right">Overdue Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overdueBatches.map((b) => {
                        const a = batchAnalytics.get(b.id)!;
                        return (
                          <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/batches/${b.id}`)}>
                            <TableCell className="font-medium text-primary hover:underline">{b.batch_name}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="destructive">{a.monthOverdueCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-destructive">{formatCurrency(a.monthOverdueAmount, currency)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end gap-6 pt-3 border-t mt-2 text-sm">
                    <span className="text-muted-foreground">Total: <span className="font-semibold text-destructive">{totalOverdueStudents} student{totalOverdueStudents !== 1 ? "s" : ""}</span></span>
                    <span className="text-muted-foreground">Amount: <span className="font-semibold text-destructive">{formatCurrency(totalOverdueAmt, currency)}</span></span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Batches Table */}
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">All Batches</CardTitle>
            <span className="text-sm text-muted-foreground">{batches.length} batches</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search batches..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-9" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4"><Layers className="h-8 w-8 text-muted-foreground" /></div>
              <h3 className="mb-2 text-lg font-semibold">No batches yet</h3>
              <p className="mb-4 max-w-sm text-muted-foreground">Create your first batch to organize students.</p>
              {canAddRevenue && <Button onClick={() => { setEditBatch(null); setDialogOpen(true); }}>Create Batch</Button>}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Code</TableHead>
                      <TableHead className="hidden md:table-cell">Start Date</TableHead>
                      <TableHead className="hidden md:table-cell">End Date</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead className="hidden lg:table-cell">Revenue</TableHead>
                      <TableHead className="hidden lg:table-cell">Pending</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.paginatedItems.map((b) => {
                      const analytics = batchAnalytics.get(b.id);
                      const count = analytics?.studentCount || 0;
                      return (
                        <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/batches/${b.id}`)}>
                          <TableCell>
                            <span className="font-medium text-primary hover:underline">
                              {b.batch_name}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{b.batch_code}</TableCell>
                          <TableCell className="hidden md:table-cell">{format(new Date(b.start_date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="hidden md:table-cell">{b.end_date ? format(new Date(b.end_date), "MMM d, yyyy") : "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {count}{b.max_capacity ? `/${b.max_capacity}` : ""}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(analytics?.monthRevenue || 0, currency)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {(analytics?.monthPending || 0) > 0 ? (
                              <span className="font-semibold text-orange-600 dark:text-orange-400">
                                {formatCurrency(analytics?.monthPending || 0, currency)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{statusBadge(b.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/batches/${b.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditBatch(b); setDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(b.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={pagination.currentPage} totalPages={pagination.totalPages}
                totalItems={pagination.totalItems} startIndex={pagination.startIndex}
                endIndex={pagination.endIndex} itemsPerPage={pagination.itemsPerPage}
                onPageChange={pagination.goToPage} onItemsPerPageChange={pagination.setItemsPerPage}
                canGoNext={pagination.canGoNext} canGoPrev={pagination.canGoPrev}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <BatchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        batch={editBatch}
        onSave={editBatch ? handleUpdate : handleCreate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeleteId(null); }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (deleteMutation.isPending) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch</AlertDialogTitle>
            <AlertDialogDescription>
              {(batchAnalytics.get(deleteId || "")?.studentCount || 0) > 0
                ? `This batch has ${batchAnalytics.get(deleteId || "")?.studentCount} student(s). Remove or reassign them before deleting.`
                : "This will permanently delete this batch. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={deleteMutation.isPending || (batchAnalytics.get(deleteId || "")?.studentCount || 0) > 0} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
