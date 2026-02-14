import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useBatches, useCreateBatch, useDeleteBatch, useUpdateBatch, type BatchInsert } from "@/hooks/useBatches";
import { useCompany } from "@/contexts/CompanyContext";
import { useStudents } from "@/hooks/useStudents";
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
import { Plus, Eye, Pencil, Trash2, Layers, Search, X, Loader2, Archive } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/SkeletonLoaders";
import BatchDialog from "@/components/BatchDialog";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";
import type { Batch } from "@/hooks/useBatches";

export default function Batches() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "archived">("all");
  const { data: batches = [], isLoading } = useBatches({ search, status: statusFilter });
  const { data: allStudents = [] } = useStudents();
  const { canAddRevenue, canEdit, canDelete, isCompanyViewer } = useCompany();
  const navigate = useNavigate();
  const { toast } = useToast();

  const createMutation = useCreateBatch();
  const updateMutation = useUpdateBatch();
  const deleteMutation = useDeleteBatch();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Count students per batch
  const studentCountMap = new Map<string, number>();
  for (const s of allStudents) {
    const bid = (s as any).batch_id;
    if (bid) studentCountMap.set(bid, (studentCountMap.get(bid) || 0) + 1);
  }

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
    const count = studentCountMap.get(deleteId) || 0;
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

  const activeBatches = batches.filter((b) => b.status === "active").length;
  const archivedBatches = batches.filter((b) => b.status === "archived").length;
  const totalStudentsInBatches = Array.from(studentCountMap.values()).reduce((s, c) => s + c, 0);

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
        <SkeletonTable rows={5} columns={6} />
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
        {canAddRevenue && (
          <Button onClick={() => { setEditBatch(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Create Batch
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Batches</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{batches.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{activeBatches}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Students in Batches</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalStudentsInBatches}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Archived</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{archivedBatches}</p></CardContent>
        </Card>
      </div>

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
                      <TableHead>Status</TableHead>
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.paginatedItems.map((b) => {
                      const count = studentCountMap.get(b.id) || 0;
                      return (
                        <TableRow key={b.id}>
                          <TableCell>
                            <button onClick={() => navigate(`/batches/${b.id}`)} className="font-medium text-primary hover:underline text-left">
                              {b.batch_name}
                            </button>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{b.batch_code}</TableCell>
                          <TableCell className="hidden md:table-cell">{format(new Date(b.start_date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="hidden md:table-cell">{b.end_date ? format(new Date(b.end_date), "MMM d, yyyy") : "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {count}{b.max_capacity ? `/${b.max_capacity}` : ""}
                            </Badge>
                          </TableCell>
                          <TableCell>{statusBadge(b.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
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
              {(studentCountMap.get(deleteId || "") || 0) > 0
                ? `This batch has ${studentCountMap.get(deleteId || "")} student(s). Remove or reassign them before deleting.`
                : "This will permanently delete this batch. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={deleteMutation.isPending || (studentCountMap.get(deleteId || "") || 0) > 0} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
