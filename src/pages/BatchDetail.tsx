import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useBatch, useUpdateBatch, type BatchInsert } from "@/hooks/useBatches";
import { useStudents } from "@/hooks/useStudents";
import { useStudentPayments, computeStudentSummary } from "@/hooks/useStudentPayments";
import { useCompany } from "@/contexts/CompanyContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatCurrency } from "@/utils/currencyUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, Eye, CreditCard, Users, TrendingUp, CalendarDays, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import BatchDialog from "@/components/BatchDialog";
import StudentDialog from "@/components/StudentDialog";
import StudentPaymentDialog from "@/components/StudentPaymentDialog";
import { useCreateStudent, type StudentInsert } from "@/hooks/useStudents";
import { useCreateStudentPayment } from "@/hooks/useStudentPayments";

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canAddRevenue, canEdit } = useCompany();
  const { data: userProfile } = useUserProfile();
  const currency = userProfile?.currency || "BDT";

  const { data: batch, isLoading: batchLoading } = useBatch(id);
  const { data: allStudents = [], isLoading: studentsLoading } = useStudents();
  const { data: allPayments = [] } = useStudentPayments();

  const updateMutation = useUpdateBatch();
  const createStudentMutation = useCreateStudent();
  const createPaymentMutation = useCreateStudentPayment();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const batchStudents = useMemo(() => {
    if (!id) return [];
    return allStudents.filter((s: any) => s.batch_id === id);
  }, [allStudents, id]);

  const studentSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeStudentSummary>>();
    for (const s of batchStudents) {
      const payments = allPayments.filter((p) => p.student_id === s.id);
      map.set(s.id, computeStudentSummary(s, payments));
    }
    return map;
  }, [batchStudents, allPayments]);

  const totalCollected = useMemo(() => {
    let total = 0;
    for (const sum of studentSummaries.values()) total += sum.totalPaid;
    return total;
  }, [studentSummaries]);

  const totalPending = useMemo(() => {
    let total = 0;
    for (const sum of studentSummaries.values()) total += sum.totalPending;
    return total;
  }, [studentSummaries]);

  const completionPercent = totalCollected + totalPending > 0
    ? Math.round((totalCollected / (totalCollected + totalPending)) * 100)
    : 0;

  const handleUpdate = async (data: BatchInsert) => {
    if (!batch) return;
    try {
      await updateMutation.mutateAsync({ id: batch.id, ...data });
      toast({ title: "Batch updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleCreateStudent = async (data: StudentInsert) => {
    try {
      const result = await createStudentMutation.mutateAsync({ ...data, batch_id: id } as any);
      toast({ title: "Student added to batch" });
      return result;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handlePayment = async (data: any) => {
    try {
      await createPaymentMutation.mutateAsync(data);
      toast({ title: "Payment recorded" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  if (batchLoading || studentsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Batch not found</p>
        <Button variant="link" onClick={() => navigate("/batches")}>Back to Batches</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/batches")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{batch.batch_name}</h1>
              <Badge className={batch.status === "active" ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" : ""}>{batch.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {batch.batch_code} · Started {format(new Date(batch.start_date), "MMM d, yyyy")}
              {batch.end_date && ` · Ends ${format(new Date(batch.end_date), "MMM d, yyyy")}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && <Button variant="outline" onClick={() => setEditDialogOpen(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>}
          {canAddRevenue && <Button onClick={() => setStudentDialogOpen(true)}>Add Student to Batch</Button>}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Students</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{batchStudents.length}{batch.max_capacity ? `/${batch.max_capacity}` : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalCollected, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalPending, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Completion</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold">{completionPercent}%</p>
            <Progress value={completionPercent} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Batch Info */}
      {batch.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">{batch.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Enrolled Students</CardTitle>
            <span className="text-sm text-muted-foreground">{batchStudents.length} students</span>
          </div>
        </CardHeader>
        <CardContent>
          {batchStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">No students in this batch yet.</p>
              {canAddRevenue && <Button variant="link" onClick={() => setStudentDialogOpen(true)}>Add Student</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Student ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Total Paid</TableHead>
                    <TableHead className="hidden md:table-cell">Total Pending</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchStudents.map((s) => {
                    const sum = studentSummaries.get(s.id);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{s.student_id_number || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize">{s.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-semibold text-primary">
                          {sum ? formatCurrency(sum.totalPaid, currency) : "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-semibold text-destructive">
                          {sum && sum.totalPending > 0 ? formatCurrency(sum.totalPending, currency) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/students/${s.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canAddRevenue && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedStudent(s); setPaymentDialogOpen(true); }}>
                                <CreditCard className="h-4 w-4" />
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
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <BatchDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} batch={batch} onSave={handleUpdate} />
      <StudentDialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen} onSave={handleCreateStudent} defaultBatchId={id} />

      {selectedStudent && (
        <StudentPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={(o) => { setPaymentDialogOpen(o); if (!o) setSelectedStudent(null); }}
          student={selectedStudent}
          summary={studentSummaries.get(selectedStudent.id) || { admissionPaid: 0, admissionTotal: 0, admissionPending: 0, admissionStatus: "pending", monthlyPaidMonths: [], monthlyPartialMonths: [], monthlyOverdueMonths: [], monthlyPendingMonths: [], monthlyPaymentsByMonth: new Map(), monthlyPaidTotal: 0, monthlyPendingTotal: 0, totalPaid: 0, totalPending: 0, totalExpected: 0, overallPercent: 0 }}
          onSave={handlePayment}
        />
      )}
    </div>
  );
}
