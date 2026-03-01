

# Minor Fixes — Implementation Plan

## 1. Extract Status Constants
**Status**: Already done in `src/types/constants.ts` — all 8 typed unions exist (StudentStatus, PaymentStatus, BatchStatus, EnrollmentStatus, EmployeeStatus, PaymentMethod, PaymentMode, PaymentType). No further work needed here.

## 2. Reduce `select("*")` on Top 5 Tables
Replace `select("*")` with explicit column lists on the most-queried hooks:

| Hook file | Table | Columns to select |
|---|---|---|
| `useStudents.ts` | students | id, name, student_id_number, status, enrollment_date, monthly_fee_amount, admission_fee_total, batch_id, company_id, billing_start_month, gender, phone, email, address, guardian_name, guardian_phone, notes, course_start_month, course_end_month, class_grade, roll_number, academic_year, section_division, created_at, updated_at, user_id, date_of_birth, profile_picture_url |
| `useStudentPayments.ts` | student_payments | id, student_id, payment_date, amount, payment_type, payment_method, months_covered, receipt_number, description, status, user_id, created_at, company_id, source_id, due_date, batch_enrollment_id |
| `useRevenues.ts` | revenues | id, amount, date, description, source_id, user_id, created_at, company_id, student_payment_id, product_sale_id, is_system_generated |
| `useExpenses.ts` | expenses | id, amount, date, description, expense_account_id, user_id, created_at, company_id, funded_by_type, funded_by_id, funded_by_reference, matches_loan_purpose, purpose_notes, invoice_number, vendor_name |
| `useBatches.ts` (batch_enrollments queries) | batch_enrollments | id, student_id, batch_id, company_id, enrollment_date, total_fee, status, notes, created_by, created_at |

This targets the 5 highest-volume tables. Other hooks will be updated in future iterations.

## 3. Move Test Deps to devDependencies
In `package.json`, move `axe-core` and `vitest-axe` from `dependencies` to `devDependencies`. Single edit, two lines.

## 4. Dynamic Import for jsPDF/html2canvas
Three files currently import these at the top level:
- `src/utils/exportUtils.ts` — both jsPDF and html2canvas
- `src/components/students/profile/StudentPdfExport.ts` — both
- `src/pages/EmployeeDetail.tsx` — jsPDF only

Convert all three to use `const { default: jsPDF } = await import("jspdf")` and `const { default: html2canvas } = await import("html2canvas")` inside the async export functions. This removes ~500KB from the initial bundle since these are only needed when a user clicks "Export PDF".

## 5. Production Console Suppression
Create `src/utils/logger.ts` with a thin wrapper:

```text
logger.error(...)   -> console.error when DEV
logger.warn(...)    -> console.warn when DEV
logger.log(...)     -> console.log when DEV
```

Uses `import.meta.env.DEV` to gate output. Then update the 20 files (130 occurrences) to import from `@/utils/logger` instead of using `console.*` directly. Error boundaries and critical catch blocks will still log in dev but stay silent in production.

## 6. Delete check-ban Edge Function
- Delete `supabase/functions/check-ban/index.ts`
- Remove the `[functions.check-ban]` block from `supabase/config.toml`
- Call the edge function deletion tool to remove it from the deployed backend

---

### Technical Sequence
1. Create `src/utils/logger.ts` (new file)
2. Update `package.json` (move 2 deps)
3. Delete `supabase/functions/check-ban/index.ts` and update `config.toml`
4. Edit 3 files for dynamic jsPDF/html2canvas imports
5. Edit 5 hook files for explicit column selects
6. Update 20 files to use logger instead of console.*

**Estimated scope**: ~25 file edits, 1 new file, 1 deletion

