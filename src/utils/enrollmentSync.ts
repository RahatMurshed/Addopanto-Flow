import { supabase } from "@/integrations/supabase/client";

/**
 * Synchronizes batch_enrollments when a student's batch changes.
 * - Marks old enrollment as "dropped" if oldBatchId differs from newBatchId
 * - Creates new "active" enrollment if newBatchId differs from oldBatchId
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

  // Mark old enrollment as dropped
  if (oldId) {
    await supabase
      .from("batch_enrollments")
      .update({ status: "dropped", updated_at: new Date().toISOString() })
      .eq("student_id", studentId)
      .eq("batch_id", oldId)
      .eq("company_id", companyId)
      .eq("status", "active");
  }

  // Create new active enrollment
  if (newId) {
    await supabase.from("batch_enrollments").insert({
      student_id: studentId,
      batch_id: newId,
      company_id: companyId,
      created_by: userId,
      status: "active",
      total_fee: 0,
    });
  }
}
