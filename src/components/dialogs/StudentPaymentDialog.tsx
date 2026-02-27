import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { useRevenueSources, useCreateRevenueSource } from "@/hooks/useRevenueSources";
import { Plus } from "lucide-react";
import type { Student } from "@/hooks/useStudents";
import type { StudentPayment, StudentPaymentInsert, StudentSummary } from "@/hooks/useStudentPayments";

const paymentSchema = z.object({
  payment_type: z.enum(["admission", "monthly"]),
  amount: z.number().positive("Amount must be positive"),
  payment_date: z.string().min(1, "Date is required"),
  payment_method: z.string().min(1),
  receipt_number: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface StudentPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
  summary: StudentSummary;
  onSave: (data: StudentPaymentInsert & { studentName?: string }) => Promise<void>;
  editingPayment?: StudentPayment | null;
  onUpdate?: (data: Partial<StudentPaymentInsert> & { id: string }) => Promise<void>;
  batchDefaultAdmissionFee?: number;
  batchDefaultMonthlyFee?: number;
  courseName?: string;
  batchName?: string;
  batchEnrollmentId?: string;
  contextBatchId?: string;
}

export default function StudentPaymentDialog({ open, onOpenChange, student, summary, onSave, editingPayment, onUpdate, batchDefaultAdmissionFee, batchDefaultMonthlyFee, courseName, batchName, batchEnrollmentId, contextBatchId }: StudentPaymentDialogProps) {
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [newSourceName, setNewSourceName] = useState("");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const { fc: formatCurrency } = useCompanyCurrency();
  const { data: revenueSources = [] } = useRevenueSources();
  const createSourceMutation = useCreateRevenueSource();

  const isEditing = !!editingPayment;

  // Fetch all active enrollments for this student
  const { data: enrollments = [] } = useQuery({
    queryKey: ["student_active_enrollments", student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batch_enrollments")
        .select("id, batch_id, total_fee, batches(batch_name, default_admission_fee, default_monthly_fee, course_id, courses(course_name))")
        .eq("student_id", student.id)
        .eq("status", "active");
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        batch_id: string;
        total_fee: number;
        batches: {
          batch_name: string;
          default_admission_fee: number;
          default_monthly_fee: number;
          course_id: string | null;
          courses: { course_name: string } | null;
        } | null;
      }>;
    },
    enabled: open,
  });

  // Fetch all payments for this student (for per-batch fee summary)
  const { data: allStudentPayments = [] } = useQuery({
    queryKey: ["student_all_payments_for_dialog", student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_payments")
        .select("id, amount, batch_enrollment_id")
        .eq("student_id", student.id);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Auto-select enrollment logic
  useEffect(() => {
    if (!open) return;
    if (isEditing && editingPayment?.batch_enrollment_id) {
      setSelectedEnrollmentId(editingPayment.batch_enrollment_id);
    } else if (batchEnrollmentId) {
      // Pre-select hint from caller (e.g. BatchDetail context)
      setSelectedEnrollmentId(batchEnrollmentId);
    } else if (contextBatchId && enrollments.length > 0) {
      // Auto-select from URL batch context (e.g. from_batch query param)
      const match = enrollments.find(e => e.batch_id === contextBatchId);
      if (match) setSelectedEnrollmentId(match.id);
    } else if (enrollments.length === 1) {
      setSelectedEnrollmentId(enrollments[0].id);
    } else if (student.batch_id && enrollments.length > 1) {
      const match = enrollments.find(e => e.batch_id === student.batch_id);
      if (match) setSelectedEnrollmentId(match.id);
    } else if (enrollments.length === 0) {
      setSelectedEnrollmentId(null);
    }
  }, [open, enrollments, batchEnrollmentId, contextBatchId, isEditing, editingPayment, student.batch_id]);

  // Per-batch fee summary
  const batchFeeSummary = useMemo(() => {
    if (!selectedEnrollmentId) return null;
    const enrollment = enrollments.find(e => e.id === selectedEnrollmentId);
    if (!enrollment) return null;
    const paid = allStudentPayments
      .filter(p => p.batch_enrollment_id === selectedEnrollmentId)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const total = Number(enrollment.total_fee || 0);
    return { total, paid, remaining: Math.max(0, total - paid) };
  }, [selectedEnrollmentId, enrollments, allStudentPayments]);

  // Get display names from selected enrollment
  const selectedEnrollment = useMemo(() => {
    if (!selectedEnrollmentId) return null;
    return enrollments.find(e => e.id === selectedEnrollmentId) || null;
  }, [selectedEnrollmentId, enrollments]);

  const effectiveCourseName = selectedEnrollment?.batches?.courses?.course_name || courseName;
  const effectiveBatchName = selectedEnrollment?.batches?.batch_name || batchName;

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_type: summary.admissionStatus !== "paid" ? "admission" : "monthly",
      amount: 0,
      payment_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "cash",
      receipt_number: null,
      description: null,
    },
  });

  const paymentType = form.watch("payment_type");
  const watchedAmount = form.watch("amount");

  // Real-time max allowed calculation for overpayment prevention
  const maxAllowed = useMemo(() => {
    if (paymentType === "admission") {
      const total = Number(student.admission_fee_total) || batchDefaultAdmissionFee || 0;
      if (total <= 0) return null;
      const paid = isEditing ? summary.admissionPaid - Number(editingPayment?.amount || 0) : summary.admissionPaid;
      return Math.max(0, total - paid);
    }
    if (paymentType === "monthly" && selectedMonths.length > 0) {
      let max = 0;
      for (const m of selectedMonths) {
        const fee = Number(student.monthly_fee_amount) || batchDefaultMonthlyFee || 0;
        let paid = summary.monthlyPaymentsByMonth?.get(m) || 0;
        if (isEditing && editingPayment?.months_covered?.includes(m)) {
          paid -= Number(editingPayment.amount) / (editingPayment.months_covered?.length || 1);
        }
        max += Math.max(0, fee - Math.max(0, paid));
      }
      return max;
    }
    return null; // no cap for advance/unselected monthly
  }, [paymentType, selectedMonths, student.admission_fee_total, student.monthly_fee_amount, batchDefaultAdmissionFee, batchDefaultMonthlyFee, summary, isEditing, editingPayment]);

  const isOverpaying = maxAllowed !== null && watchedAmount > maxAllowed;
  const isFullyPaid = summary.totalPending <= 0 && !isEditing;

  // Available unpaid months for monthly payments (including partial)
  const unpaidMonths = useMemo(() => {
    const base = [...summary.monthlyOverdueMonths, ...summary.monthlyPartialMonths, ...summary.monthlyPendingMonths];
    if (editingPayment?.months_covered) {
      for (const m of editingPayment.months_covered) {
        if (!base.includes(m)) base.push(m);
      }
      base.sort();
    }
    return base;
  }, [summary, editingPayment]);

  useEffect(() => {
    if (open) {
      if (editingPayment) {
        form.reset({
          payment_type: editingPayment.payment_type as "admission" | "monthly",
          amount: Number(editingPayment.amount),
          payment_date: editingPayment.payment_date,
          payment_method: editingPayment.payment_method,
          receipt_number: editingPayment.receipt_number || null,
          description: editingPayment.description || null,
        });
        setSelectedMonths(editingPayment.months_covered || []);
      } else {
        const defaultType = summary.admissionStatus !== "paid" ? "admission" : "monthly";
        const effectiveAdmissionTotal = Number(student.admission_fee_total) || batchDefaultAdmissionFee || 0;
        const initialAmount = defaultType === "admission" ? Math.max(0, effectiveAdmissionTotal - summary.admissionPaid) : 0;
        form.reset({
          payment_type: defaultType,
          amount: initialAmount,
          payment_date: format(new Date(), "yyyy-MM-dd"),
          payment_method: "cash",
          receipt_number: null,
          description: null,
        });
        setSelectedMonths([]);
        setFeeError(null);
        setSelectedSourceId(null);
      }
      setFeeError(null);
      setNewSourceName("");
    }
  }, [open, summary, form, editingPayment, revenueSources]);

  // Auto-fill admission amount when type switches to admission
  useEffect(() => {
    if (!isEditing && paymentType === "admission") {
      const effectiveAdmissionTotal = Number(student.admission_fee_total) || batchDefaultAdmissionFee || 0;
      form.setValue("amount", Math.max(0, effectiveAdmissionTotal - summary.admissionPaid));
    }
  }, [paymentType, isEditing, student.admission_fee_total, batchDefaultAdmissionFee, summary.admissionPaid, form]);

  // Auto-set revenue source based on payment type + course/batch context
  const dynamicSourceName = useMemo(() => {
    const context = [effectiveCourseName, effectiveBatchName].filter(Boolean).join(" ");
    if (paymentType === "admission") {
      return context ? `Admission - ${context}` : "Admission";
    }
    return context ? `Monthly Fees - ${context}` : "Monthly Fees";
  }, [paymentType, effectiveCourseName, effectiveBatchName]);

  useEffect(() => {
    if (!open || isEditing) return;
    const existing = revenueSources.find(s => s.name === dynamicSourceName);
    if (existing) {
      setSelectedSourceId(existing.id);
    } else if (dynamicSourceName && revenueSources.length > 0) {
      createSourceMutation.mutateAsync(dynamicSourceName).then((created) => {
        setSelectedSourceId(created.id);
      }).catch(() => {});
    }
  }, [open, isEditing, dynamicSourceName, revenueSources]);

  // Auto-calculate amount when months change (only for new payments)
  useEffect(() => {
    if (!isEditing && paymentType === "monthly" && selectedMonths.length > 0) {
      let total = 0;
      for (const m of selectedMonths) {
        const fee = Number(student.monthly_fee_amount) || batchDefaultMonthlyFee || 0;
        const alreadyPaid = summary.monthlyPaymentsByMonth?.get(m) || 0;
        total += Math.max(0, fee - alreadyPaid);
      }
      form.setValue("amount", total);
    }
  }, [selectedMonths, paymentType, student.monthly_fee_amount, summary.monthlyPaymentsByMonth, form, isEditing]);

  const toggleMonth = (month: string) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
    setFeeError(null);
  };

  const handleSubmit = async (data: PaymentFormData) => {
    setFeeError(null);

    // Enrollment guard: require batch selection when enrollments exist
    if (enrollments.length > 0 && !selectedEnrollmentId) {
      setFeeError("Please select a batch before recording payment.");
      return;
    }

    // Validate against batch fee limits
    if (data.payment_type === "admission" && batchDefaultAdmissionFee && batchDefaultAdmissionFee > 0) {
      const maxAdmission = batchDefaultAdmissionFee;
      const alreadyPaid = isEditing
        ? summary.admissionPaid - Number(editingPayment?.amount || 0)
        : summary.admissionPaid;
      const maxAllowed = Math.max(0, maxAdmission - alreadyPaid);
      if (data.amount > maxAllowed) {
        setFeeError(`Admission fee cannot exceed ${maxAllowed.toLocaleString()}. Batch default: ${maxAdmission.toLocaleString()}, Already paid: ${alreadyPaid.toLocaleString()}.`);
        return;
      }
    }

    if (data.payment_type === "monthly" && batchDefaultMonthlyFee && batchDefaultMonthlyFee > 0 && selectedMonths.length > 0) {
      const fee = batchDefaultMonthlyFee;
      for (const m of selectedMonths) {
        const alreadyPaidForMonth = isEditing
          ? Math.max(0, (summary.monthlyPaymentsByMonth?.get(m) || 0) - (editingPayment?.months_covered?.includes(m) ? Number(editingPayment.amount) / (editingPayment.months_covered?.length || 1) : 0))
          : (summary.monthlyPaymentsByMonth?.get(m) || 0);
        const maxForMonth = Math.max(0, fee - alreadyPaidForMonth);
        const perMonthAmount = data.amount / selectedMonths.length;
        if (perMonthAmount > maxForMonth) {
          const formatMonth = (mo: string) => {
            const [y, mon] = mo.split("-");
            return new Date(Number(y), Number(mon) - 1).toLocaleDateString("en", { month: "short", year: "numeric" });
          };
          setFeeError(`Payment exceeds limit for ${formatMonth(m)}. Max per month: ${fee.toLocaleString()}, Already paid: ${alreadyPaidForMonth.toLocaleString()}, Remaining: ${maxForMonth.toLocaleString()}.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      if (isEditing && onUpdate) {
        await onUpdate({
          id: editingPayment!.id,
          payment_type: data.payment_type,
          amount: data.amount,
          payment_date: data.payment_date,
          payment_method: data.payment_method,
          months_covered: data.payment_type === "monthly" ? selectedMonths : null,
          receipt_number: data.receipt_number || null,
          description: data.description || null,
        });
      } else {
        const computedDueDate = data.payment_type === "monthly" && selectedMonths.length > 0
          ? `${selectedMonths.sort()[0]}-01`
          : data.payment_date;

        await onSave({
          student_id: student.id,
          payment_type: data.payment_type,
          amount: data.amount,
          payment_date: data.payment_date,
          payment_method: data.payment_method,
          months_covered: data.payment_type === "monthly" ? selectedMonths : null,
          receipt_number: data.receipt_number || null,
          description: data.description || null,
          source_id: selectedSourceId || null,
          due_date: computedDueDate,
          batch_enrollment_id: selectedEnrollmentId || null,
          studentName: student.name,
        });
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedDate = form.watch("payment_date");

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    const date = new Date(Number(y), Number(mo) - 1);
    return format(date, "MMM yyyy");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && saving) return; onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => { if (saving) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Payment" : "Record Payment"}</DialogTitle>
          <DialogDescription>Payment for {student.name}</DialogDescription>
        </DialogHeader>

        {isFullyPaid && (
          <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400 font-medium">
            ✅ All fees collected — No pending payments
          </div>
        )}

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Batch Enrollment Selector */}
          {enrollments.length >= 1 && (
            <div className="space-y-2">
              <Label>Batch <span className="text-destructive">*</span></Label>
              <Select value={selectedEnrollmentId || ""} onValueChange={(v) => { setSelectedEnrollmentId(v); setFeeError(null); }} disabled={!!batchEnrollmentId || !!contextBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch..." />
                </SelectTrigger>
                <SelectContent>
                  {enrollments.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.batches?.batch_name || "Unknown Batch"}
                      {e.batches?.courses?.course_name ? ` (${e.batches.courses.course_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {enrollments.length === 1 && selectedEnrollment && (
            <div className="rounded-md border p-3 text-sm bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" />
                <span>
                  Batch: <span className="font-medium text-foreground">{selectedEnrollment.batches?.batch_name}</span>
                  {selectedEnrollment.batches?.courses?.course_name && (
                    <span className="text-muted-foreground"> ({selectedEnrollment.batches.courses.course_name})</span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Fee Summary for selected batch */}
          {batchFeeSummary && batchFeeSummary.total > 0 && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="font-medium text-foreground mb-1">Fee Summary</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                <span>Total: <span className="font-medium text-foreground">{formatCurrency(batchFeeSummary.total)}</span></span>
                <span>Paid: <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(batchFeeSummary.paid)}</span></span>
                <span>Due: <span className="font-medium text-orange-600 dark:text-orange-400">{formatCurrency(batchFeeSummary.remaining)}</span></span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Payment Type</Label>
            <Select value={paymentType} onValueChange={(v) => { form.setValue("payment_type", v as any); setSelectedMonths([]); setFeeError(null); }} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admission">Admission Fee</SelectItem>
                <SelectItem value="monthly">Monthly Tuition</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentType === "admission" && summary.admissionTotal > 0 && (
            <div className="rounded-md border p-3 text-sm">
              <p>Total: {summary.admissionTotal} | Paid: {summary.admissionPaid} | Pending: {summary.admissionTotal - summary.admissionPaid}</p>
            </div>
          )}

          {paymentType === "monthly" && unpaidMonths.length > 0 && (
            <div className="space-y-2">
              <Label>Select Months</Label>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto rounded-md border p-2">
                {unpaidMonths.map((m) => {
                  const isPartial = summary.monthlyPartialMonths?.includes(m);
                  const alreadyPaid = summary.monthlyPaymentsByMonth?.get(m) || 0;
                  const fee = Number(student.monthly_fee_amount) || batchDefaultMonthlyFee || 0;
                  const remaining = Math.max(0, fee - alreadyPaid);
                  return (
                    <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selectedMonths.includes(m)} onCheckedChange={() => toggleMonth(m)} />
                      <div className="flex flex-col">
                        <span className={cn(
                          summary.monthlyOverdueMonths.includes(m) && "text-destructive font-medium",
                          isPartial && "text-amber-600 dark:text-amber-400 font-medium"
                        )}>{formatMonth(m)}</span>
                        {remaining > 0 && (
                          <span className="text-[10px] text-muted-foreground">{formatCurrency(remaining)} remaining</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              {selectedMonths.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedMonths.length} month(s) selected — remaining total auto-calculated (editable below)
                </p>
              )}
            </div>
          )}

          {paymentType === "monthly" && unpaidMonths.length === 0 && (
            <p className="text-sm text-muted-foreground">All months are paid! You can still record an advance payment by entering the amount manually.</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" step="0.01" min="0.01" disabled={saving} {...form.register("amount", { valueAsNumber: true })} />
            {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
            {isOverpaying && maxAllowed !== null && (
              <p className="text-sm text-destructive font-medium">
                Amount exceeds pending: Maximum allowed is {formatCurrency(maxAllowed)}
              </p>
            )}
            {feeError && <p className="text-sm text-destructive font-medium">{feeError}</p>}
          </div>

          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(new Date(selectedDate), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar mode="single" selected={selectedDate ? new Date(selectedDate) : undefined} onSelect={(date) => { if (date) { form.setValue("payment_date", format(date, "yyyy-MM-dd")); setCalendarOpen(false); } }} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={form.watch("payment_method")} onValueChange={(v) => form.setValue("payment_method", v)} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Revenue Source</Label>
            <Select value={selectedSourceId || "auto"} onValueChange={(v) => setSelectedSourceId(v === "auto" ? null : v)} disabled={saving}>
              <SelectTrigger><SelectValue placeholder={`Auto (${dynamicSourceName})`} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto ({dynamicSourceName})</SelectItem>
                {revenueSources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="New source name..."
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                disabled={saving || createSourceMutation.isPending}
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={!newSourceName.trim() || saving || createSourceMutation.isPending}
                onClick={async () => {
                  try {
                    const created = await createSourceMutation.mutateAsync(newSourceName.trim());
                    setSelectedSourceId(created.id);
                    setNewSourceName("");
                  } catch {}
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_number">Receipt Number</Label>
            <Input id="receipt_number" disabled={saving} {...form.register("receipt_number")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea id="description" rows={2} disabled={saving} {...form.register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || isOverpaying || isFullyPaid}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? (isEditing ? "Saving..." : "Recording...") : (isEditing ? "Save Changes" : "Record Payment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
