import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useStudent, useUpdateStudent, type StudentInsert } from "@/hooks/useStudents";
import {
  useStudentPayments, useCreateStudentPayment, useDeleteStudentPayment,
  useMonthlyFeeHistory, computeStudentSummary,
} from "@/hooks/useStudentPayments";
import { useRole } from "@/contexts/RoleContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatCurrency } from "@/utils/currencyUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, Plus, Trash2, Loader2, GraduationCap, CalendarDays, TrendingUp, StickyNote, MessageSquare, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import StudentDialog from "@/components/StudentDialog";
import StudentPaymentDialog from "@/components/StudentPaymentDialog";
import StudentMonthGrid from "@/components/StudentMonthGrid";
import MonthlyBreakdownList from "@/components/MonthlyBreakdownList";

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canAddRevenue, canEdit, canDelete } = useRole();
  const { data: userProfile } = useUserProfile();
  const currency = userProfile?.currency || "BDT";

  const { data: student, isLoading: studentLoading } = useStudent(id);
  const { data: payments = [], isLoading: paymentsLoading } = useStudentPayments(id);
  const { data: feeHistory = [] } = useMonthlyFeeHistory(id);

  const updateMutation = useUpdateStudent();
  const createPaymentMutation = useCreateStudentPayment();
  const deletePaymentMutation = useDeleteStudentPayment();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (!student) return null;
    return computeStudentSummary(student, payments, feeHistory);
  }, [student, payments, feeHistory]);

  const handleUpdate = async (data: StudentInsert) => {
    if (!student) return;
    try {
      await updateMutation.mutateAsync({ id: student.id, ...data });
      toast({ title: "Student updated" });
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

  const handleDeletePayment = async () => {
    if (!deletePaymentId) return;
    try {
      await deletePaymentMutation.mutateAsync(deletePaymentId);
      toast({ title: "Payment deleted" });
      setDeletePaymentId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (studentLoading || paymentsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!student || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Student not found</p>
        <Button variant="link" onClick={() => navigate("/students")}>Back to Students</Button>
      </div>
    );
  }

  const admissionPercent = summary.admissionTotal > 0 ? Math.min(100, (summary.admissionPaid / summary.admissionTotal) * 100) : 0;
  const monthlyTotal = summary.totalExpected - summary.admissionTotal;
  const monthlyPercent = monthlyTotal > 0 ? Math.min(100, (summary.monthlyPaidTotal / monthlyTotal) * 100) : 0;

  const formatMethod = (m: string) => {
    const map: Record<string, string> = { cash: "Cash", card: "Card", bank_transfer: "Bank Transfer", mobile_banking: "Mobile Banking", other: "Other" };
    return map[m] || m;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/students")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
              <Badge variant={student.status === "active" ? "default" : "secondary"} className="capitalize">{student.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {student.student_id_number && `ID: ${student.student_id_number} · `}
              Enrolled {format(new Date(student.enrollment_date), "MMM d, yyyy")}
              {student.email && ` · ${student.email}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && <Button variant="outline" onClick={() => setEditDialogOpen(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>}
          {canAddRevenue && <Button onClick={() => setPaymentDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Payment</Button>}
        </div>
      </div>

      {/* Three Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Admission Fee */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Admission Fee</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.admissionTotal > 0 ? (
              <>
                <p className="text-2xl font-bold">{formatCurrency(summary.admissionTotal, currency)}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(summary.admissionPaid, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(summary.admissionPending, currency)}</span>
                </div>
                <Progress value={admissionPercent} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{admissionPercent.toFixed(0)}% complete</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No admission fee set</p>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Monthly Tuition */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-base">Monthly Tuition</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Number(student.monthly_fee_amount) > 0 ? (
              <>
                <p className="text-2xl font-bold">{formatCurrency(monthlyTotal, currency)}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid ({summary.monthlyPaidMonths.length} mo)</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(summary.monthlyPaidTotal, currency)}</span>
                </div>
                {summary.monthlyPartialMonths.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Partial ({summary.monthlyPartialMonths.length} mo)</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(
                        summary.monthlyPartialMonths.reduce((s, m) => s + (summary.monthlyPaymentsByMonth.get(m) || 0), 0),
                        currency
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending ({summary.monthlyOverdueMonths.length + summary.monthlyPartialMonths.length + summary.monthlyPendingMonths.length} mo)</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(summary.monthlyPendingTotal, currency)}</span>
                </div>
                <Progress value={monthlyPercent} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{monthlyPercent.toFixed(0)}% complete</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No monthly fee set</p>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Overall Total */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-base">Overall Total</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold">{formatCurrency(summary.totalExpected, currency)}</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(summary.totalPaid, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Pending</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(summary.totalPending, currency)}</span>
            </div>
            <Progress value={summary.overallPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{summary.overallPercent.toFixed(0)}% complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Student Notes Card */}
      {student.notes && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <StickyNote className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-base">Notes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{student.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Monthly Fee Visual Grid & Breakdown */}
      {Number(student.monthly_fee_amount) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Fee Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(Number(student.monthly_fee_amount), currency)}/month
              {student.course_start_month && ` · From ${student.course_start_month}`}
              {student.course_end_month && ` to ${student.course_end_month}`}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <StudentMonthGrid summary={summary} />

            {/* Overall Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overall Payment Progress</span>
                <span className="font-semibold">{summary.overallPercent.toFixed(0)}%</span>
              </div>
              <Progress value={summary.overallPercent} className="h-3" />
            </div>

            <MonthlyBreakdownList
              summary={summary}
              payments={payments}
              feeHistory={feeHistory}
              monthlyFeeAmount={Number(student.monthly_fee_amount)}
              currency={currency}
            />
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Method</TableHead>
                    <TableHead className="hidden md:table-cell">Months</TableHead>
                    <TableHead className="hidden lg:table-cell">Receipt</TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    {canDelete && <TableHead className="w-16">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{format(new Date(p.payment_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-semibold text-primary">{formatCurrency(Number(p.amount), currency)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`capitalize ${p.payment_type === "admission" ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"}`}
                        >
                          {p.payment_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{formatMethod(p.payment_method)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {p.months_covered && p.months_covered.length > 0
                          ? p.months_covered.map((m) => { const [y, mo] = m.split("-"); return format(new Date(Number(y), Number(mo) - 1), "MMM yy"); }).join(", ")
                          : "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{p.receipt_number || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{p.description || "—"}</TableCell>
                      {canDelete && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletePaymentId(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Notes Timeline */}
      {(() => {
        const notedPayments = payments
          .filter((p) => p.description)
          .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
        if (notedPayments.length === 0) return null;
        const visibleCount = 5;
        const firstBatch = notedPayments.slice(0, visibleCount);
        const restBatch = notedPayments.slice(visibleCount);

        const renderNote = (p: typeof notedPayments[0]) => (
          <div key={p.id} className="flex gap-3 py-3 border-b last:border-b-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{format(new Date(p.payment_date), "MMM d, yyyy")}</span>
                <Badge
                  variant="secondary"
                  className={`capitalize text-xs ${p.payment_type === "admission" ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"}`}
                >
                  {p.payment_type}
                </Badge>
                <span className="text-muted-foreground">{formatCurrency(Number(p.amount), currency)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{p.description}</p>
            </div>
          </div>
        );

        return (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-base">Payment Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {firstBatch.map(renderNote)}
              {restBatch.length > 0 && (
                <Collapsible>
                  <CollapsibleContent>
                    {restBatch.map(renderNote)}
                  </CollapsibleContent>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground">
                      <ChevronDown className="mr-1 h-4 w-4" />
                      Show {restBatch.length} more note{restBatch.length > 1 ? "s" : ""}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        );
      })()}


      <StudentDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} student={student} onSave={handleUpdate} />

      {/* Payment Dialog */}
      <StudentPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        student={student}
        summary={summary}
        onSave={handlePayment}
      />

      {/* Delete Payment Confirmation */}
      <AlertDialog open={!!deletePaymentId} onOpenChange={(open) => { if (!open && !deletePaymentMutation.isPending) setDeletePaymentId(null); }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (deletePaymentMutation.isPending) e.preventDefault(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this payment record. The corresponding revenue entry will remain for audit purposes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePaymentMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeletePayment(); }} disabled={deletePaymentMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletePaymentMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
