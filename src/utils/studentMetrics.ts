import type { StudentPayment } from "@/hooks/useStudentPayments";
import type { ProductSale } from "@/hooks/useProductSales";

export interface LifetimeMetrics {
  lifetimeValue: number;
  coursesEnrolled: number;
  productsPurchased: number;
  daysSinceJoining: number;
  paymentRate: number;
  revenueProjection: number;
  hasActiveEnrollments: boolean;
  studentSinceDate: Date | null;
}

export function computeLifetimeMetrics(
  payments: StudentPayment[],
  productSales: ProductSale[],
  student: {
    enrollment_date: string;
    status: string;
    monthly_fee_amount: number;
    admission_fee_total: number;
    course_end_month?: string | null;
  },
  batch: {
    course_id?: string | null;
    start_date?: string;
    end_date?: string | null;
    course_duration_months?: number | null;
    default_monthly_fee?: number;
  } | null | undefined,
  futureUnpaidPayments?: Array<{ amount: number; status: string; paid_amount?: number | null }>
): LifetimeMetrics {
  // 1. LIFETIME VALUE — total confirmed payments + product sales
  const totalCoursesPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalProductsPaid = productSales.reduce((sum, p) => sum + Number(p.total_amount), 0);
  const lifetimeValue = totalCoursesPaid + totalProductsPaid;

  // 2. COURSES ENROLLED — count unique courses via batch
  const coursesEnrolled = batch?.course_id ? 1 : 0;

  // 3. PRODUCTS PURCHASED
  const productsPurchased = productSales.length;

  // 4. DAYS SINCE JOINING
  const enrollmentDate = new Date(student.enrollment_date);
  const daysSinceJoining = Math.max(
    0,
    Math.floor((Date.now() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // 5. PAYMENT RATE — total paid / total invoiced
  const effectiveMonthlyFee = Number(student.monthly_fee_amount) || Number(batch?.default_monthly_fee) || 0;
  const admissionFee = Number(student.admission_fee_total) || 0;

  let totalInvoiced = admissionFee;
  if (batch?.course_duration_months && effectiveMonthlyFee) {
    totalInvoiced += batch.course_duration_months * effectiveMonthlyFee;
  }
  const paymentRate = totalInvoiced > 0
    ? Math.min(100, Math.round((totalCoursesPaid / totalInvoiced) * 100))
    : 0;

  // 6. REVENUE PROJECTION — sum of future unpaid/partial payment records
  const isActive = student.status === "active";
  const revenueProjection = (futureUnpaidPayments ?? []).reduce((sum, p) => {
    const unpaidAmount = p.status === "partial"
      ? Number(p.amount) - Number(p.paid_amount ?? 0)
      : Number(p.amount);
    return sum + unpaidAmount;
  }, 0);

  return {
    lifetimeValue,
    coursesEnrolled,
    productsPurchased,
    daysSinceJoining,
    paymentRate,
    revenueProjection,
    hasActiveEnrollments: isActive && !!batch,
    studentSinceDate: enrollmentDate,
  };
}
