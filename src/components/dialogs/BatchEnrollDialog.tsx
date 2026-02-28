import { useState, useEffect, useMemo, useCallback } from "react";
import { addMonths, format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserPlus, Users, Loader2, AlertTriangle, X, GraduationCap, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAllStudents, useUpdateStudent, type Student } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Generates payment schedule rows for a new batch enrollment.
 * Creates admission fee + monthly fee rows based on batch configuration.
 */
async function generateEnrollmentPaymentSchedule(
  studentId: string,
  batchId: string,
  companyId: string,
  userId: string,
  enrollmentId: string
) {
  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("start_date, course_duration_months, default_admission_fee, default_monthly_fee")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    console.error("Failed to fetch batch for schedule generation:", batchError);
    return;
  }

  // Check student's billing_start_month to respect it
  const { data: student } = await supabase
    .from("students")
    .select("billing_start_month")
    .eq("id", studentId)
    .single();

  const scheduleRows: any[] = [];
  const batchStartDate = new Date(batch.start_date);

  // Determine effective start: use student's billing_start_month if later than batch start
  let effectiveStart = batchStartDate;
  if (student?.billing_start_month) {
    const [year, month] = student.billing_start_month.split("-").map(Number);
    const billingStart = new Date(year, month - 1, 1);
    if (billingStart > batchStartDate) {
      effectiveStart = billingStart;
    }
  }

  // Admission fee row
  if (batch.default_admission_fee && Number(batch.default_admission_fee) > 0) {
    scheduleRows.push({
      student_id: studentId,
      company_id: companyId,
      user_id: userId,
      batch_enrollment_id: enrollmentId,
      payment_type: "admission",
      amount: Number(batch.default_admission_fee),
      status: "unpaid",
      due_date: batch.start_date,
      payment_date: batch.start_date,
      payment_method: "cash",
      months_covered: null,
    });
  }

  // Monthly fee rows
  const durationMonths = batch.course_duration_months;
  const monthlyFee = Number(batch.default_monthly_fee);

  if (durationMonths && durationMonths > 0 && monthlyFee > 0) {
    // Calculate how many months from batch start the effective start is
    const startOffset = (effectiveStart.getFullYear() - batchStartDate.getFullYear()) * 12
      + (effectiveStart.getMonth() - batchStartDate.getMonth());
    const actualOffset = Math.max(0, Math.min(startOffset, durationMonths));

    for (let i = actualOffset; i < durationMonths; i++) {
      const dueDate = addMonths(batchStartDate, i);
      const dueDateStr = format(dueDate, "yyyy-MM-dd");
      const monthStr = format(dueDate, "yyyy-MM");

      scheduleRows.push({
        student_id: studentId,
        company_id: companyId,
        user_id: userId,
        batch_enrollment_id: enrollmentId,
        payment_type: "monthly",
        amount: monthlyFee,
        status: "unpaid",
        due_date: dueDateStr,
        payment_date: dueDateStr,
        payment_method: "cash",
        months_covered: [monthStr],
      });
    }
  }

  if (scheduleRows.length === 0) return;

  const { error: insertError } = await supabase
    .from("student_payments")
    .insert(scheduleRows);

  if (insertError) {
    console.error("Failed to generate payment schedule:", insertError);
  }
}

interface BatchEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  batchName: string;
  courseId?: string | null;
}

export default function BatchEnrollDialog({
  open,
  onOpenChange,
  batchId,
  batchName,
  courseId,
}: BatchEnrollDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<Set<string>>(new Set());
  const [sameCourseMap, setSameCourseMap] = useState<Map<string, string>>(new Map());

  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const { data: allStudents = [], isLoading } = useAllStudents();
  const updateStudentMutation = useUpdateStudent();
  const queryClient = useQueryClient();

  // Debounce search with 500ms delay
  useEffect(() => {
    if (searchQuery.length < 3) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setDebouncedQuery("");
      setEnrollingId(null);
      setEnrolledStudentIds(new Set());
      setSameCourseMap(new Map());
    } else {
      // Fetch students already enrolled in this batch
      supabase
        .from("batch_enrollments")
        .select("student_id")
        .eq("batch_id", batchId)
        .eq("status", "active")
        .then(({ data }) => {
          if (data) {
            setEnrolledStudentIds(new Set(data.map((r) => r.student_id)));
          }
        });

      // Fetch students already in another batch of the same course
      if (courseId) {
        supabase
          .from("batch_enrollments")
          .select("student_id, batches!batch_enrollments_batch_id_fkey(batch_name, course_id)")
          .eq("status", "active")
          .neq("batch_id", batchId)
          .then(({ data }) => {
            const map = new Map<string, string>();
            (data ?? []).forEach((row: any) => {
              const batch = row.batches;
              if (batch && batch.course_id === courseId) {
                map.set(row.student_id, batch.batch_name);
              }
            });
            setSameCourseMap(map);
          });
      }
    }
  }, [open, batchId, courseId]);

  // Filter students for search results
  const searchResults = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) return [];
    const q = debouncedQuery.toLowerCase();
    return allStudents
      .filter((s) => {
        return (
          s.name.toLowerCase().includes(q) ||
          (s.student_id_number && s.student_id_number.toLowerCase().includes(q)) ||
          (s.father_name && s.father_name.toLowerCase().includes(q)) ||
          (s.phone && s.phone.includes(q)) ||
          (s.whatsapp_number && s.whatsapp_number.includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.mother_name && s.mother_name.toLowerCase().includes(q)) ||
          (s.roll_number && s.roll_number.toLowerCase().includes(q))
        );
      })
      .slice(0, 20);
  }, [allStudents, debouncedQuery]);

  const handleEnroll = useCallback(async (student: Student) => {
    setEnrollingId(student.id);
    try {
      // Check for existing active enrollment in this batch
      const { data: existing } = await supabase
        .from("batch_enrollments")
        .select("id")
        .eq("student_id", student.id)
        .eq("batch_id", batchId)
        .eq("status", "active")
        .maybeSingle();

      if (existing) {
        toast({ title: "Already enrolled", description: `${student.name} is already enrolled in this batch.`, variant: "destructive" });
        return;
      }

      // Check capacity before enrolling
      const { data: batchData } = await supabase
        .from("batches")
        .select("max_capacity")
        .eq("id", batchId)
        .single();

      if (batchData?.max_capacity != null) {
        const { count } = await supabase
          .from("batch_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("batch_id", batchId)
          .eq("status", "active");

        if ((count ?? 0) >= batchData.max_capacity) {
          toast({ title: "Batch is full", description: `Maximum capacity of ${batchData.max_capacity} students reached.`, variant: "destructive" });
          return;
        }
      }

      // Create enrollment record and generate payment schedule
      if (activeCompanyId && user) {
        const { data: enrollment, error: enrollError } = await supabase
          .from("batch_enrollments")
          .insert({
            student_id: student.id,
            batch_id: batchId,
            company_id: activeCompanyId,
            created_by: user.id,
            status: "active",
            total_fee: 0,
          })
          .select("id")
          .single();

        if (enrollError) throw enrollError;

        // Generate payment schedule for the new enrollment
        await generateEnrollmentPaymentSchedule(
          student.id, batchId, activeCompanyId, user.id, enrollment.id
        );
      }

      // Only set batch_id if student has no primary batch
      if (!student.batch_id) {
        await updateStudentMutation.mutateAsync({ id: student.id, batch_id: batchId });
      }

      // Invalidate queries for enrollment timeline
      queryClient.invalidateQueries({ queryKey: ["batch_enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["student_payments"] });
      queryClient.invalidateQueries({ queryKey: ["batch-student-count", batchId] });

      toast({ title: "Student enrolled", description: `${student.name} has been enrolled in ${batchName}. Payment schedule generated.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setEnrollingId(null);
    }
  }, [batchId, batchName, activeCompanyId, user, updateStudentMutation, toast, onOpenChange]);

  const isSearching = searchQuery.length >= 3 && debouncedQuery !== searchQuery;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Enroll Student in {batchName}</DialogTitle>
          <DialogDescription>
            Search existing students from your database to enroll in this batch.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, father name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {searchQuery.length > 0 && searchQuery.length < 3 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Type at least 3 characters to search
            </p>
          )}

          {isSearching && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          <ScrollArea className="flex-1 max-h-[400px]">
            {debouncedQuery.length >= 3 && !isSearching && (
              <div className="space-y-2 pr-3">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))
                ) : searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No students found matching "{debouncedQuery}"</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add students from the Students page first, then enroll them here.
                    </p>
                  </div>
                ) : (
                  searchResults.map((student) => {
                    const isAlreadyEnrolled = enrolledStudentIds.has(student.id);
                    const isEnrolling = enrollingId === student.id;
                    const sameCourseOtherBatch = sameCourseMap.get(student.id);
                    return (
                      <div key={student.id} className="space-y-1">
                        <Card className={`transition-colors ${isAlreadyEnrolled ? "opacity-60" : "hover:bg-accent/50"}`}>
                          <CardContent className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{student.name}</p>
                                  {student.student_id_number && (
                                    <Badge variant="outline" className="text-[10px] shrink-0">{student.student_id_number}</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                  {student.father_name && <span>Father: {student.father_name}</span>}
                                  {student.phone && <span>📱 {student.phone}</span>}
                                </div>
                                {student.batch_id && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {isAlreadyEnrolled ? (
                                      <span className="text-warning flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" /> Already in this batch
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        <GraduationCap className="h-3 w-3" /> Currently in another batch
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          <Button
                            size="sm"
                            variant={isAlreadyEnrolled ? "secondary" : "default"}
                            disabled={isAlreadyEnrolled || isEnrolling}
                            onClick={() => handleEnroll(student)}
                            className="shrink-0 ml-2"
                          >
                            {isEnrolling ? (
                              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Enrolling</>
                            ) : isAlreadyEnrolled ? (
                              "Enrolled"
                            ) : (
                              <><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Enroll</>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                      {sameCourseOtherBatch && !isAlreadyEnrolled && (
                        <Alert variant="default" className="border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30 py-2 px-3">
                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                          <AlertDescription className="text-xs text-yellow-700 dark:text-yellow-300">
                            Already enrolled in <strong>{sameCourseOtherBatch}</strong> (same course). Enrolling here will create a second enrollment for this course.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    );
                  })
                )}
              </div>
            )}

            {!debouncedQuery && searchQuery.length < 3 && !isSearching && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Search your student database</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Search by name, student ID, father name, phone number, or email
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
