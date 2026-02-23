import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, Loader2, Eye, Merge, Trash2, ShieldX, Users, CheckCircle2 } from "lucide-react";
import {
  useFindDuplicates,
  useDismissDuplicate,
  useMergeStudents,
  type DuplicateGroup,
} from "@/hooks/useDuplicateDetection";
import { useDeleteStudent } from "@/hooks/useStudents";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const CRITERIA_LABELS: Record<string, string> = {
  name_phone_email: "Name + Phone + Email",
};

export default function StudentDuplicates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: groups = [], isLoading, isFetching, refetch } = useFindDuplicates();
  const mergeMutation = useMergeStudents();
  const dismissMutation = useDismissDuplicate();
  const deleteMutation = useDeleteStudent();
  const [hasScanned, setHasScanned] = useState(false);
  const [mergeConfirm, setMergeConfirm] = useState<{ group: DuplicateGroup; primaryId: string; duplicateId: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ studentId: string; studentName: string } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<DuplicateGroup | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleScan = async () => {
    await refetch();
    setHasScanned(true);
  };

  const handleMerge = async () => {
    if (!mergeConfirm) return;
    try {
      await mergeMutation.mutateAsync({
        primaryStudentId: mergeConfirm.primaryId,
        duplicateStudentId: mergeConfirm.duplicateId,
      });
      toast({ title: "Students merged successfully" });
      setMergeConfirm(null);
      refetch();
    } catch (err: any) {
      toast({ title: "Merge failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDismiss = async (studentIdA: string, studentIdB: string) => {
    try {
      await dismissMutation.mutateAsync({ studentIdA, studentIdB });
      toast({ title: "Marked as not duplicate" });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.studentId);
      toast({ title: "Student deleted" });
      setDeleteConfirm(null);
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteConfirm) return;
    setBulkDeleting(true);
    try {
      const nonPrimary = bulkDeleteConfirm.students.filter((s) => !s.isPrimary);
      for (const s of nonPrimary) {
        await deleteMutation.mutateAsync(s.id);
      }
      toast({ title: `Deleted ${nonPrimary.length} duplicate(s)` });
      setBulkDeleteConfirm(null);
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/students")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Duplicate Detection</h1>
            <p className="text-muted-foreground">Find and resolve duplicate student records</p>
          </div>
        </div>
        <Button onClick={handleScan} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          {hasScanned ? "Re-scan" : "Scan for Duplicates"}
        </Button>
      </div>

      {!hasScanned && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Ready to scan</h3>
            <p className="mb-4 max-w-md text-muted-foreground">
              Click "Scan for Duplicates" to find students where Name, Phone, and Email all match exactly.
            </p>
          </CardContent>
        </Card>
      )}

      {isFetching && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      )}

      {hasScanned && !isFetching && groups.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-success/10 p-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No duplicates found</h3>
            <p className="text-muted-foreground">All student records appear to be unique.</p>
          </CardContent>
        </Card>
      )}

      {hasScanned && !isFetching && groups.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Found {groups.length} potential duplicate group{groups.length > 1 ? "s" : ""}
          </p>
          {groups.map((group) => (
            <Card key={group.groupId}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Duplicate Group #{group.groupId}</CardTitle>
                  <Badge variant="outline">{CRITERIA_LABELS[group.matchCriteria] || group.matchCriteria}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {group.students.map((student) => (
                    <div
                      key={student.id}
                      className={`rounded-lg border p-4 ${student.isPrimary ? "border-primary/50 bg-primary/5" : ""}`}
                    >
                      {student.isPrimary && (
                        <Badge className="mb-2 bg-primary/10 text-primary border-primary/30 text-xs">
                          Suggested Primary
                        </Badge>
                      )}
                      <h4 className="font-semibold">{student.name}</h4>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {student.phone && <p>Phone: {student.phone}</p>}
                        {student.email && <p>Email: {student.email}</p>}
                        {student.aadhar_id_number && <p>Aadhar: {student.aadhar_id_number}</p>}
                        <p>Enrolled: {format(new Date(student.enrollment_date), "dd MMM yyyy")}</p>
                        <p>Status: <Badge variant="outline" className="ml-1 text-xs">{student.status}</Badge></p>
                        <p>Payments: {student.paymentCount || 0}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/students/${student.id}`)}>
                          <Eye className="mr-1 h-3 w-3" /> View
                        </Button>
                        {!student.isPrimary && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const primary = group.students.find((s) => s.isPrimary) || group.students[0];
                                setMergeConfirm({
                                  group,
                                  primaryId: primary.id,
                                  duplicateId: student.id,
                                });
                              }}
                            >
                              <Merge className="mr-1 h-3 w-3" /> Merge into Primary
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => setDeleteConfirm({ studentId: student.id, studentName: student.name })}
                            >
                              <Trash2 className="mr-1 h-3 w-3" /> Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  {group.students.filter((s) => !s.isPrimary).length > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => setBulkDeleteConfirm(group)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" /> Delete All Duplicates
                    </Button>
                  )}
                  {group.students.length === 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(group.students[0].id, group.students[1].id)}
                      disabled={dismissMutation.isPending}
                    >
                      <ShieldX className="mr-1 h-3 w-3" /> Not a Duplicate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Merge confirmation */}
      <AlertDialog open={!!mergeConfirm} onOpenChange={() => setMergeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge Students</AlertDialogTitle>
            <AlertDialogDescription>
              This will transfer all payments, batch history, and data from the duplicate to the primary student, then mark the duplicate as inactive. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMerge} disabled={mergeMutation.isPending}>
              {mergeMutation.isPending ? "Merging…" : "Merge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete "{deleteConfirm?.studentName}"? All associated payments and records will be lost. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={!!bulkDeleteConfirm} onOpenChange={() => setBulkDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Duplicates</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {bulkDeleteConfirm?.students.filter((s) => !s.isPrimary).length} duplicate student(s), keeping only the primary record. All associated payments and records will be lost. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? "Deleting…" : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
