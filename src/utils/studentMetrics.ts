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
    default_admission_fee?: number;
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

  // 5. PAYMENT RATE — totalCoursesPaid / totalCourseFee from batch
  const totalCourseFee = batch
    ? Number(batch.default_admission_fee ?? 0) + (Number(batch.course_duration_months ?? 0) * Number(batch.default_monthly_fee ?? 0))
    : 0;
  const paymentRate = totalCourseFee > 0
    ? Math.min(100, Math.round((totalCoursesPaid / totalCourseFee) * 100))
    : 0;

  // 6. REVENUE PROJECTION — use future unpaid rows if available, else time-based fallback
  const isActive = student.status === "active";
  const unpaidRows = futureUnpaidPayments ?? [];
  let revenueProjection = 0;

  if (unpaidRows.length > 0) {
    revenueProjection = unpaidRows.reduce((sum, p) => {
      const unpaidAmount = p.status === "partial"
        ? Number(p.amount) - Number(p.paid_amount ?? 0)
        : Number(p.amount);
      return sum + unpaidAmount;
    }, 0);
  } else if (isActive && batch && batch.course_duration_months && batch.end_date) {
    // Time-based fallback
    const batchTotalFee = Number(batch.default_admission_fee ?? 0) + (Number(batch.course_duration_months) * Number(batch.default_monthly_fee ?? 0));
    const monthlyFee = batchTotalFee / batch.course_duration_months;
    const endDate = new Date(batch.end_date);
    const now = new Date();
    const remainingMonths = Math.max(0,
      (endDate.getFullYear() - now.getFullYear()) * 12 + (endDate.getMonth() - now.getMonth())
    );
    const paidMonths = payments.filter(p => Number(p.amount) > 0).length;
    const unpaidMonths = Math.max(0, remainingMonths - paidMonths);
    revenueProjection = Math.round(unpaidMonths * monthlyFee);
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
  };
}
