import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { useStudentPayments } from "@/hooks/useStudentPayments";
import { useBatch } from "@/hooks/useBatches";
import { computeLifetimeMetrics } from "@/utils/studentMetrics";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  DollarSign, BookOpen, ShoppingBag, CalendarDays,
  TrendingUp, Info, Lock, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Count-up animation hook ───
function useCountUp(target: number, duration = 1200) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    let raf: number;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return current;
}

// ─── Payment Rate Ring ───
function PaymentRateRing({ rate }: { rate: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (rate / 100) * circumference);
    }, 100);
    return () => clearTimeout(timer);
  }, [rate, circumference]);

  const ringColor =
    rate >= 80 ? "#4ade80" :
    rate >= 50 ? "#fb923c" :
    "#f87171";

  return (
    <div className="relative w-14 h-14">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28" cy="28" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="4"
        />
        <circle
          cx="28" cy="28" r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground dark:text-white">
        {rate}%
      </span>
    </div>
  );
}

// ─── Stat Block ───
interface StatBlockProps {
  icon?: React.ReactNode;
  value: React.ReactNode;
  label: string;
  sublabel?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

function StatBlock({ icon, value, label, sublabel, className, valueClassName }: StatBlockProps) {
  return (
    <div className={cn("flex flex-col items-center text-center gap-1.5 px-4", className)}>
      {icon}
      <div className={cn("text-3xl font-bold text-foreground dark:text-white", valueClassName)}>{value}</div>
      <p className="text-muted-foreground dark:text-white/60 text-xs">{label}</p>
      {sublabel}
    </div>
  );
}

function LockedStat({ label }: { label: string }) {
  return (
    <StatBlock
      icon={
        <div className="w-10 h-10 rounded-full bg-muted dark:bg-white/10 flex items-center justify-center">
          <Lock className="h-5 w-5 text-muted-foreground dark:text-white/50" />
        </div>
      }
      value={<span className="text-muted-foreground dark:text-white/40 text-sm italic">Restricted</span>}
      label={label}
    />
  );
}

// ─── Skeleton ───
function BannerSkeleton() {
  return (
    <div className="w-full rounded-xl bg-card dark:bg-gradient-to-r dark:from-secondary dark:to-[hsl(224,60%,30%)] border border-border p-6 md:p-8 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="h-3 w-40 rounded bg-muted dark:bg-white/20 animate-pulse" />
        <div className="h-5 w-28 rounded-full bg-muted dark:bg-white/10 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-muted dark:bg-white/10 animate-pulse" />
            <div className="w-16 h-8 rounded bg-muted dark:bg-white/20 animate-pulse" />
            <div className="w-20 h-3 rounded bg-muted/60 dark:bg-white/10 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───
interface LifetimeValueBannerProps {
  studentId: string;
  student: {
    enrollment_date: string;
    status: string;
    monthly_fee_amount: number;
    admission_fee_total: number;
    batch_id: string | null;
    course_end_month?: string | null;
  };
}

export function LifetimeValueBanner({ studentId, student }: LifetimeValueBannerProps) {
  const { isDataEntryModerator, activeCompanyId, canViewFinancialData } = useCompany();
  const { fc: formatCurrency, currencyCode: currency } = useCompanyCurrency();

  // Fetch data independently
  const { data: payments = [], isLoading: paymentsLoading } = useStudentPayments(studentId);
  const { data: batch } = useBatch(student.batch_id ?? undefined);

  const { data: productSales = [], isLoading: salesLoading, error: salesError, refetch: refetchSales } = useQuery({
    queryKey: ["student-product-sales", activeCompanyId, studentId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("product_sales")
        .select("id, total_amount, sale_date, quantity")
        .eq("student_id", studentId)
        .eq("company_id", activeCompanyId);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; total_amount: number; sale_date: string; quantity: number }>;
    },
    enabled: !!activeCompanyId,
  });

  const { data: futureUnpaidPayments = [], isLoading: unpaidLoading } = useQuery({
    queryKey: ["student-future-unpaid", activeCompanyId, studentId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("student_payments")
        .select("amount, due_date, status")
        .eq("student_id", studentId)
        .eq("company_id", activeCompanyId)
        .in("status", ["unpaid", "partial"])
        .gt("due_date", new Date().toISOString());
      if (error) throw error;
      return (data ?? []) as Array<{ amount: number; due_date: string; status: string }>;
    },
    enabled: !!activeCompanyId,
  });

  const isLoading = paymentsLoading || salesLoading || unpaidLoading;
  const hasError = !!salesError;

  const metrics = useMemo(() => {
    if (isLoading) return null;
    return computeLifetimeMetrics(
      payments,
      productSales as any,
      student,
      batch,
      futureUnpaidPayments
    );
  }, [payments, productSales, student, batch, isLoading, futureUnpaidPayments]);

  // Count-up values
  const animatedLTV = useCountUp(metrics?.lifetimeValue ?? 0);
  const animatedDays = useCountUp(metrics?.daysSinceJoining ?? 0);
  const animatedProjection = useCountUp(metrics?.revenueProjection ?? 0);

  // Hide entirely for DEO
  if (isDataEntryModerator) return null;

  if (isLoading) return <BannerSkeleton />;

  if (hasError) {
    return (
      <div className="w-full rounded-xl bg-gradient-to-r from-secondary to-[hsl(224,60%,30%)] p-6 md:p-8 shadow-lg">
        <div className="flex flex-col items-center justify-center gap-3 py-4">
          <p className="text-white/70 text-sm">Could not load lifetime data</p>
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
            onClick={() => refetchSales()}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const showFinancials = canViewFinancialData !== false;

  return (
    <div className="w-full rounded-xl bg-card dark:bg-gradient-to-r dark:from-secondary dark:to-[hsl(224,60%,30%)] border border-border p-6 md:p-8 shadow-lg no-print">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-muted-foreground dark:text-white/70 text-sm font-medium uppercase tracking-widest">
          Student Lifetime Overview
        </h3>
        <span className="bg-muted dark:bg-white/10 text-muted-foreground dark:text-white/80 text-xs px-3 py-1 rounded-full">
          {metrics.studentSinceDate
            ? `Student Since ${format(metrics.studentSinceDate, "MMM yyyy")}`
            : "Not yet enrolled"}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Lifetime Value */}
        {showFinancials ? (
          <StatBlock
            icon={
              <div className="w-10 h-10 rounded-full bg-muted dark:bg-white/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-muted-foreground dark:text-white/80" />
              </div>
            }
            value={formatCurrency(animatedLTV, currency)}
            label="Lifetime Value"
          />
        ) : (
          <LockedStat label="Lifetime Value" />
        )}

        {/* 2. Courses Enrolled */}
        <StatBlock
          icon={
            <div className="w-10 h-10 rounded-full bg-muted dark:bg-white/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-muted-foreground dark:text-white/80" />
            </div>
          }
          value={metrics.coursesEnrolled}
          label="Courses Enrolled"
        />

        {/* 3. Products Purchased */}
        <StatBlock
          icon={
            <div className="w-10 h-10 rounded-full bg-muted dark:bg-white/10 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-muted-foreground dark:text-white/80" />
            </div>
          }
          value={metrics.productsPurchased}
          label="Products Purchased"
        />

        {/* 4. Days Since Joining */}
        <StatBlock
          icon={
            <div className="w-10 h-10 rounded-full bg-muted dark:bg-white/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-muted-foreground dark:text-white/80" />
            </div>
          }
          value={
            <span>
              {animatedDays.toLocaleString()}
              <span className="text-lg text-muted-foreground dark:text-white/70 ml-1">days</span>
            </span>
          }
          label="Since First Enrollment"
        />

        {/* 5. Payment Rate */}
        <StatBlock
          icon={<PaymentRateRing rate={metrics.paymentRate} />}
          value={null}
          label="Payment Rate"
        />

        {/* 6. Revenue Projection */}
        {showFinancials ? (
          <StatBlock
            className="col-span-2 md:col-span-1"
            icon={
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-400/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              </div>
            }
            value={
              metrics.hasActiveEnrollments
                ? formatCurrency(animatedProjection, currency)
                : "—"
            }
            valueClassName="text-amber-600 dark:text-amber-300"
            label="Projected Revenue"
            sublabel={
              metrics.hasActiveEnrollments ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">
                      <Info className="h-3 w-3 text-amber-500 dark:text-amber-200/50" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px] text-xs">
                    Estimated future revenue based on remaining months in active batch enrollments. Actual amounts may vary.
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-amber-600/60 dark:text-amber-200/50 text-[10px] cursor-help">No active batches</span>
                  </TooltipTrigger>
                  <TooltipContent>No active enrollments to project revenue from</TooltipContent>
                </Tooltip>
              )
            }
          />
        ) : (
          <LockedStat label="Projected Revenue" />
        )}
      </div>
    </div>
  );
}
