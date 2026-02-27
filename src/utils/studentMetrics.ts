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
  isInactive: boolean;
}

export function computeLifetimeMetrics(
  payments: StudentPayment[],
  productSales: ProductSale[],
  student: {
    enrollment_date: string;
    created_at: string;
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
    default_admission_fee?: number;
  } | null | undefined,
  futureUnpaidPayments?: Array<{ amount: number; status: string; paid_amount?: number | null }>,
  totalExpected?: number
): LifetimeMetrics {
  const isInactive = student.status === "inactive";

  // 1. LIFETIME VALUE — total confirmed payments + product sales
  const totalCoursesPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalProductsPaid = productSales.reduce((sum, p) => sum + Number(p.total_amount), 0);
  const lifetimeValue = totalCoursesPaid + totalProductsPaid;

  // 2. COURSES ENROLLED — count unique courses via batch
  const coursesEnrolled = batch?.course_id ? 1 : 0;

  // 3. PRODUCTS PURCHASED
  const productsPurchased = productSales.length;

  // 4. DAYS SINCE JOINING (use created_at for accuracy, enrollment_date is manually entered)
  const createdAtDate = new Date(student.created_at);
  const enrollmentDate = new Date(student.enrollment_date);
  const daysSinceJoining = Math.max(
    0,
    Math.floor((Date.now() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // 5. PAYMENT RATE — totalCoursesPaid / denominator
  // For inactive students: freeze at current paid percentage (don't calculate future dues)
  const denominator = totalExpected != null && totalExpected > 0
    ? totalExpected
    : (batch
        ? Number(batch.default_admission_fee ?? 0) + (Number(batch.course_duration_months ?? 0) * Number(batch.default_monthly_fee ?? 0))
        : 0);
  
  const paymentRate = denominator > 0
    ? Math.min(100, Math.round((totalCoursesPaid / denominator) * 100))
    : 0;

  // 6. REVENUE PROJECTION — exclude inactive students entirely
  const isActive = student.status === "active";
  let revenueProjection = 0;

  if (isActive) {
    const unpaidRows = futureUnpaidPayments ?? [];
    if (unpaidRows.length > 0) {
      revenueProjection = unpaidRows.reduce((sum, p) => {
        const unpaidAmount = p.status === "partial"
          ? Number(p.amount) - Number(p.paid_amount ?? 0)
          : Number(p.amount);
        return sum + unpaidAmount;
      }, 0);
    } else if (denominator > 0) {
      // Simple fallback: total expected minus what's already been paid for courses
      revenueProjection = Math.max(0, Math.round(denominator - totalCoursesPaid));
    }
  }

  return {
    lifetimeValue,
    coursesEnrolled,
    productsPurchased,
    daysSinceJoining,
    paymentRate,
    revenueProjection,
    hasActiveEnrollments: isActive && !!batch,
    studentSinceDate: enrollmentDate,
    isInactive,
  };
}
