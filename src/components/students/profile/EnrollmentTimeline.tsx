import { useMemo, useState, useEffect } from "react";
import { formatDuration } from "@/utils/durationFormat";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { useCompany } from "@/contexts/CompanyContext";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { BookOpen, CalendarDays, Clock, GraduationCap, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface EnrollmentTimelineProps {
  studentId: string;
  companyId: string;
  onViewPayments?: () => void;
}

type EnrollmentStatus = "active" | "completed" | "inactive";

const STATUS_DOT: Record<EnrollmentStatus, string> = {
  active: "bg-green-500",
  completed: "bg-blue-400",
  inactive: "bg-orange-500",
};

const STATUS_BADGE: Record<EnrollmentStatus, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  inactive: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  active: "Active",
  completed: "Completed",
  inactive: "Inactive",
};

function useEnrollmentData(studentId: string, companyId: string) {
  const enrollmentsQuery = useQuery({
    queryKey: ["batch-enrollments", studentId, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batch_enrollments")
        .select(`
          id,
          student_id,
          enrollment_date,
          status,
          total_fee,
          created_by,
          batch_id,
          batches!batch_enrollments_batch_id_fkey (
            id,
            batch_name,
            batch_code,
            start_date,
            end_date,
            course_duration_months,
            course_duration_days,
            payment_mode,
            course_id,
            courses!batches_course_id_fkey (
              id,
              course_name,
              course_code
            )
          )
        `)
        .eq("student_id", studentId)
        .eq("company_id", companyId)
        .order("enrollment_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!studentId && !!companyId,
  });

  const enrollmentIds = useMemo(
    () => (enrollmentsQuery.data ?? []).map((e) => e.id),
    [enrollmentsQuery.data]
  );

  const paymentsQuery = useQuery({
    queryKey: ["enrollment-payments-summary", enrollmentIds],
    queryFn: async () => {
      if (enrollmentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("student_payments")
        .select("batch_enrollment_id, amount, status")
        .in("batch_enrollment_id", enrollmentIds)
        .eq("company_id", companyId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: enrollmentIds.length > 0,
  });

  const paymentsByEnrollment = useMemo(() => {
    const map = new Map<string, { paid: number; due: number }>();
    (paymentsQuery.data ?? []).forEach((p) => {
      if (!p.batch_enrollment_id) return;
      const entry = map.get(p.batch_enrollment_id) ?? { paid: 0, due: 0 };
      if (p.status === "paid") entry.paid += Number(p.amount);
      else entry.due += Number(p.amount);
      map.set(p.batch_enrollment_id, entry);
    });
    return map;
  }, [paymentsQuery.data]);

  return {
    enrollments: enrollmentsQuery.data ?? [],
    isLoading: enrollmentsQuery.isLoading,
    paymentsByEnrollment,
    paymentsLoading: paymentsQuery.isLoading,
  };
}

interface CourseGroup {
  courseId: string;
  courseName: string;
  courseCode: string;
  enrollments: any[];
}

export function EnrollmentTimeline({ studentId, companyId, onViewPayments }: EnrollmentTimelineProps) {
  const { enrollments, isLoading, paymentsByEnrollment } = useEnrollmentData(studentId, companyId);
  const { fc } = useCompanyCurrency();
  const { isDataEntryModerator, isCompanyAdmin } = useCompany();
  const { isCipher } = useRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isCompanyAdmin || isCipher;

  // Track recently restored enrollment IDs
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const key = `restored-enrollments-${studentId}`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      try {
        setRestoredIds(new Set(JSON.parse(stored)));
      } catch { /* ignore */ }
      // Clear after 30 seconds so the indicator is temporary
      const timer = setTimeout(() => {
        sessionStorage.removeItem(key);
        setRestoredIds(new Set());
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [studentId, enrollments]);

  // Filter for DEO
  const visibleEnrollments = useMemo(() => {
    if (!isDataEntryModerator) return enrollments;
    return enrollments.filter((e) => e.created_by === user?.id);
  }, [enrollments, isDataEntryModerator, user?.id]);

  // Group by course
  const courseGroups = useMemo(() => {
    const groups: Record<string, CourseGroup> = {};
    visibleEnrollments.forEach((e) => {
      const batch = e.batches as any;
      const course = batch?.courses;
      const courseId = course?.id ?? "uncategorized";
      const courseName = course?.course_name ?? "Uncategorized";
      const courseCode = course?.course_code ?? "";
      if (!groups[courseId]) {
        groups[courseId] = { courseId, courseName, courseCode, enrollments: [] };
      }
      groups[courseId].enrollments.push(e);
    });
    return Object.values(groups);
  }, [visibleEnrollments]);

  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 rounded-full bg-primary" />
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="space-y-6 ml-3 border-l-2 border-border pl-6">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <div className="ml-6 rounded-lg border p-4 space-y-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visibleEnrollments.length === 0) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardContent className="pt-6 pb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 rounded-full bg-primary" />
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-primary">Enrollment History</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No enrollments yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              This student has not been enrolled in any batch.
            </p>
            {isAdmin && (
              <Button
                size="sm"
                className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => navigate(`/batches`)}
              >
                Enroll Student
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCount = visibleEnrollments.length;

  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="pt-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full bg-primary" />
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-primary">Enrollment History</h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {totalCount} Enrollment{totalCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Timeline */}
        <div className="relative ml-3">
          {/* Vertical line */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {courseGroups.map((group) => (
              <div key={group.courseId} className="relative">
                {/* Course header dot */}
                <div className="absolute left-0 top-1 -translate-x-1/2 w-3 h-3 rounded-full bg-muted-foreground/40 ring-2 ring-background z-10" />

                <div className="pl-6">
                  {/* Course header */}
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">
                      {group.courseName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {group.enrollments.length} batch{group.enrollments.length !== 1 ? "es" : ""}
                    </span>
                  </div>

                  {/* Batch entries */}
                  <div className="space-y-4">
                    {group.enrollments.map((enrollment) => {
                      const batch = enrollment.batches as any;
                      const rawStatus = enrollment.status as string;
                      const status: EnrollmentStatus = (rawStatus === "completed" || rawStatus === "inactive") ? rawStatus : "active";
                      const totalFee = Number(enrollment.total_fee) || 0;
                      const paymentSummary = paymentsByEnrollment.get(enrollment.id);
                      const paidAmount = paymentSummary?.paid ?? 0;
                      const dueAmount = totalFee - paidAmount;
                      const paidPercent = totalFee > 0 ? Math.min(100, (paidAmount / totalFee) * 100) : 0;
                      const isRestored = restoredIds.has(enrollment.id);

                      const canViewPayments = !isDataEntryModerator;

                      return (
                        <div key={enrollment.id} className="relative">
                          {/* Batch dot */}
                          <div className={cn(
                            "absolute -left-6 top-4 -translate-x-1/2 w-2.5 h-2.5 rounded-full ring-2 ring-background z-10",
                            STATUS_DOT[status]
                          )} />

                          <div className={cn(
                            "ml-0 rounded-lg border p-4",
                            isRestored
                              ? "bg-green-50/60 border-green-300 dark:bg-green-950/20 dark:border-green-800 animate-in fade-in duration-500"
                              : "bg-muted/30"
                          )}>
                            {/* Row 1: Batch name + status */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">
                                {batch?.batch_name ?? "Unknown Batch"}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isRestored && (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 animate-in slide-in-from-right-2 duration-300">
                                    <RotateCcw className="w-3 h-3" />
                                    Restored
                                  </span>
                                )}
                                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_BADGE[status])}>
                                  {STATUS_LABEL[status]}
                                </span>
                              </div>
                            </div>

                            {/* Row 2: Dates */}
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                              <CalendarDays className="w-3.5 h-3.5" />
                              <span>Enrolled: {format(new Date(enrollment.enrollment_date), "MMM d, yyyy")}</span>
                              <span>→</span>
                              <span>
                                {status === "completed"
                                  ? "Completed"
                                  : batch?.end_date
                                    ? `Ends: ${format(new Date(batch.end_date), "MMM d, yyyy")}`
                                    : "Ongoing"}
                              </span>
                              {batch?.course_duration_months && (
                                <>
                                  <Clock className="w-3.5 h-3.5 ml-2" />
                                  <span>{formatDuration(batch.course_duration_months, (batch as any).course_duration_days)}</span>
                                </>
                              )}
                            </div>

                            {/* Row 3: Fee progress */}
                            {canViewPayments && totalFee > 0 ? (
                              <div className="mt-3 space-y-1.5">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Total Fee: {fc(totalFee)}</span>
                                  <span>{Math.round(paidPercent)}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      dueAmount > 0 ? "bg-green-500" : "bg-green-500"
                                    )}
                                    style={{ width: `${paidPercent}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs font-medium">
                                  <span className="text-green-600 dark:text-green-400">
                                    Paid: {fc(paidAmount)}
                                  </span>
                                  {dueAmount > 0 && (
                                    <span className="text-red-500 dark:text-red-400">
                                      Due: {fc(Math.max(0, dueAmount))}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : canViewPayments ? null : (
                              <p className="mt-2 text-xs text-muted-foreground italic">
                                Payment details restricted
                              </p>
                            )}

                            {/* Row 4: View Payments link */}
                            {canViewPayments && (
                              <div className="flex justify-end mt-2">
                                <button
                                  onClick={() => onViewPayments ? onViewPayments() : navigate(`/students/${studentId}`)}
                                  className="text-xs text-primary hover:underline font-medium"
                                >
                                  View Payments →
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
