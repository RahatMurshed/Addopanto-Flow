import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { addMonths, format } from "date-fns";

/**
 * Synchronizes batch_enrollments when a student's batch changes.
 * - Deletes old enrollment if oldBatchId differs from newBatchId
 * - Creates new "active" enrollment if newBatchId differs from oldBatchId
 * - Auto-generates payment schedule rows for the new batch
 * - No-op if both are the same or both null
 */
export async function syncBatchEnrollment(
  studentId: string,
  oldBatchId: string | null | undefined,
  newBatchId: string | null | undefined,
  companyId: string,
  userId: string
) {
  const oldId = oldBatchId || null;
  const newId = newBatchId || null;

  // No change
  if (oldId === newId) return;

  // Archive old enrollment as "transferred" instead of deleting (Issue 1.3)
  if (oldId) {
    await supabase
      .from("batch_enrollments")
      .update({ status: "transferred" } as any)
      .eq("student_id", studentId)
      .eq("batch_id", oldId)
      .eq("company_id", companyId)
      .eq("status", "active");
  }

  // Create new active enrollment (check batch status first - Issue 2.2)
  if (newId) {
    const { data: batchCheck } = await supabase
      .from("batches")
      .select("status")
      .eq("id", newId)
      .single();

    if (batchCheck?.status === "completed") {
      logger.warn("Cannot enroll into a completed batch:", newId);
      return;
    }
    const { data: enrollment, error: enrollError } = await supabase
      .from("batch_enrollments")
      .insert({
        student_id: studentId,
        batch_id: newId,
        company_id: companyId,
        created_by: userId,
        status: "active",
        total_fee: 0,
      })
      .select("id")
      .single();

    if (enrollError) {
      logger.error("Failed to create enrollment:", enrollError);
      return;
    }

    // Generate payment schedule for the new enrollment
    await generatePaymentSchedule(
      studentId,
      newId,
      companyId,
      userId,
      enrollment.id
    );
  }
}

/**
 * Generates unpaid payment schedule rows for a batch enrollment.
 * Creates one row per month based on batch duration + an admission fee row.
 */
async function generatePaymentSchedule(
  studentId: string,
  batchId: string,
  companyId: string,
  userId: string,
  enrollmentId: string
) {
  // Fetch batch details
  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("start_date, course_duration_months, default_admission_fee, default_monthly_fee, payment_mode")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    logger.error("Failed to fetch batch for schedule generation:", batchError);
    return;
  }

  const scheduleRows: any[] = [];
  const batchStartDate = new Date(batch.start_date);

  // Check student's billing_start_month to respect it
  const { data: student } = await supabase
    .from("students")
    .select("billing_start_month")
    .eq("id", studentId)
    .single();

  // Determine effective start: use student's billing_start_month if later than batch start
  let effectiveStart = batchStartDate;
  if (student?.billing_start_month) {
    const [year, month] = student.billing_start_month.split("-").map(Number);
    const billingStart = new Date(year, month - 1, 1);
    if (billingStart > batchStartDate) {
      effectiveStart = billingStart;
    }
  }
  // For one-time payment mode: only generate one admission/course fee row
  if ((batch as any).payment_mode === "one_time") {
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
  } else {
    // Monthly payment mode: admission fee + monthly rows (existing behavior)
    // Generate admission fee row if applicable
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

    // Generate monthly fee rows
    const durationMonths = batch.course_duration_months;
    const monthlyFee = Number(batch.default_monthly_fee);

    if (durationMonths && durationMonths > 0 && monthlyFee > 0) {
      // Calculate offset based on billing_start_month
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
  }

  if (scheduleRows.length === 0) return;

  const { error: insertError } = await supabase
    .from("student_payments")
    .insert(scheduleRows);

  if (insertError) {
    logger.error("Failed to generate payment schedule:", insertError);
  }
}
