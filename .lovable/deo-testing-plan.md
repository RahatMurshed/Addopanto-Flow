# Data Entry Operator (DEO) Permission Testing Plan

## Prerequisites
- **Admin account** with full company admin access
- **DEO account** added as Data Entry Operator with **all 4 toggles OFF**
- Both accounts logged into the same company

---

## Phase 0: Zero Permissions Baseline

### Admin Actions
1. Ensure DEO user has role `data_entry_operator` with all toggles OFF (`deo_students`, `deo_payments`, `deo_batches`, `deo_finance` = false)

### DEO Verification
| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 0.1 | Login and navigate to dashboard | Empty state — no quick action cards visible | ☐ |
| 0.2 | Check sidebar navigation | Only Profile link visible (no Students, Batches, Revenue, Expenses, Reports, Members, Settings) | ☐ |
| 0.3 | Navigate to `/students` via URL | Redirected or 403 — no data shown | ☐ |
| 0.4 | Navigate to `/batches` via URL | Redirected or 403 | ☐ |
| 0.5 | Navigate to `/revenue` via URL | Redirected or 403 | ☐ |
| 0.6 | Navigate to `/expenses` via URL | Redirected or 403 | ☐ |
| 0.7 | Navigate to `/reports` via URL | Redirected or 403 | ☐ |
| 0.8 | Navigate to `/company/members` via URL | Redirected or 403 | ☐ |
| 0.9 | Navigate to `/settings` via URL | Redirected or 403 | ☐ |
| 0.10 | Check "Data Entry Mode" badge visible in sidebar/header | Badge displayed | ☐ |

---

## Phase 1: Student Management (`deo_students` = ON)

### Admin Actions
1. Enable `deo_students` toggle for DEO user
2. Admin adds 2 students to the company (for isolation testing)

### DEO Verification
| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 1.1 | Refresh dashboard | "Add Student" quick action card visible | ☐ |
| 1.2 | Sidebar shows Students link | Students nav item appears | ☐ |
| 1.3 | Click "Add Student" card | Opens add student form with batch selection dropdown | ☐ |
| 1.4 | Fill form and submit | Loading state on button, student saved successfully, toast shown | ☐ |
| 1.5 | Redirected to student list | "My Students" page shows only the student DEO just added | ☐ |
| 1.6 | Student count display | Shows "You added 1 student" (not company total) | ☐ |
| 1.7 | Admin's students NOT visible | Cannot see the 2 students admin added | ☐ |
| 1.8 | Edit own student | Edit button works, form pre-fills, save succeeds | ☐ |
| 1.9 | Delete own student | Delete button shows confirmation dialog, deletion succeeds | ☐ |
| 1.10 | Access admin's student via URL | Navigate to `/students/{admin_student_id}` — returns 403 or empty | ☐ |
| 1.11 | No payment/revenue/batch buttons | Only student CRUD visible, no financial actions | ☐ |

### Admin Disable Test
| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 1.12 | Admin disables `deo_students` | DEO refreshes — Students link gone, "Add Student" card gone | ☐ |
| 1.13 | DEO navigates to `/students` | Redirected or 403 | ☐ |

---

## Phase 2: Payment Recording (`deo_payments` = ON)

### Admin Actions
1. Enable `deo_payments` toggle (keep `deo_students` OFF)
2. Admin records 3 payments for various students

### DEO Verification
| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 2.1 | Dashboard shows "Record Payment" card | Card visible with payment icon | ☐ |
| 2.2 | Open payment form | Batch/student dropdowns populated, NO payment history or revenue totals shown | ☐ |
| 2.3 | Select student and payment type | Month selection appears for monthly, auto-calculates amount | ☐ |
| 2.4 | Record admission payment | Payment saves with loading state, success toast | ☐ |
| 2.5 | Record monthly payment | Month selector works, amount auto-fills from batch fee | ☐ |
| 2.6 | "My Payments" list | Shows only payments DEO recorded, not admin's 3 payments | ☐ |
| 2.7 | Edit own payment | Can change amount or months covered | ☐ |
| 2.8 | Delete own payment | Confirmation dialog, successful deletion | ☐ |
| 2.9 | Admin's payments NOT visible | Cannot see payments recorded by admin | ☐ |
| 2.10 | No revenue dashboard visible | No revenue totals, charts, or financial summaries anywhere | ☐ |
| 2.11 | Revenue auto-recorded | Audit log shows single "Payment Recorded" entry (no duplicate revenue entry) | ☐ |

### Overpayment Test
| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 2.12 | Record payment exceeding batch admission fee | Proper error: "Overpayment: admission fee exceeded" | ☐ |
| 2.13 | Record monthly payment exceeding monthly fee | Proper error shown, payment blocked | ☐ |

### Admin Disable Test
| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 2.14 | Admin disables `deo_payments` | "Record Payment" card gone, payment routes blocked | ☐ |

---

## Phase 3: Batch Management (`deo_batches` = ON)

### Admin Actions
1. Enable `deo_batches` toggle (keep others OFF)
2. Admin creates 2 batches

### DEO Verification
| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 3.1 | Dashboard shows "Add Batch" card | Card visible | ☐ |
| 3.2 | Create batch | Course selection, fee settings, start date all work | ☐ |
| 3.3 | Batch appears in "My Batches" | Shows only DEO-created batch | ☐ |
| 3.4 | Admin's batches NOT visible | Cannot see admin's 2 batches | ☐ |
| 3.5 | Edit own batch | Change fees, dates, description — saves successfully | ☐ |
| 3.6 | Delete empty batch | Confirmation, successful deletion | ☐ |
| 3.7 | Delete batch with students | Should be blocked with proper error | ☐ |
| 3.8 | Duplicate batch code | Validation error prevents duplicate | ☐ |

### Admin Disable Test
| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 3.9 | Admin disables `deo_batches` | Batch routes blocked, card hidden | ☐ |

---

## Phase 4: Revenue & Expenses (`deo_finance` = ON)

### Admin Actions
1. Enable `deo_finance` toggle (keep others OFF)
2. Admin adds 3 revenue entries and 2 expense entries

### DEO Verification
| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 4.1 | Dashboard shows "Add Revenue" and "Add Expense" cards | Both cards visible | ☐ |
| 4.2 | Record revenue entry | Amount, description, source selection — saves with loading | ☐ |
| 4.3 | Record expense entry | Amount, description, expense account selection — saves | ☐ |
| 4.4 | "My Revenue" list | Shows only DEO's entries, not admin's 3 | ☐ |
| 4.5 | "My Expenses" list | Shows only DEO's entries, not admin's 2 | ☐ |
| 4.6 | Edit own revenue | Amount/description change works | ☐ |
| 4.7 | Delete own expense | Confirmation, successful deletion | ☐ |
| 4.8 | No company-wide totals | No revenue dashboard, no financial summaries | ☐ |
| 4.9 | No analytics or charts | No chart components visible | ☐ |
| 4.10 | No reports page | `/reports` blocked | ☐ |

### Admin Disable Test
| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 4.11 | Admin disables `deo_finance` | Revenue/expense routes blocked, cards hidden | ☐ |

---

## Phase 5: All Permissions Combined

### Admin Actions
1. Enable ALL 4 toggles simultaneously

### DEO Verification
| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 5.1 | Dashboard shows all 4 quick action cards | Student, Payment, Batch, Revenue/Expense cards all visible | ☐ |
| 5.2 | Perform all CRUD operations | Add student → record payment → create batch → add revenue/expense | ☐ |
| 5.3 | Entry counts across categories | "You have added X items" displays correctly per category | ☐ |
| 5.4 | Still no sensitive data | No company-wide totals, no reports, no members page | ☐ |
| 5.5 | No settings access | `/settings` still blocked | ☐ |

---

## Phase 6: Data Isolation

### Setup
- Admin adds: 1 student, 1 batch, 1 payment, 1 revenue
- Operator has all 4 permissions enabled

| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 6.1 | DEO cannot see admin's student | Student list filtered to DEO only | ☐ |
| 6.2 | DEO cannot see admin's batch | Batch list filtered to DEO only | ☐ |
| 6.3 | DEO cannot see admin's payment | Payment list filtered to DEO only | ☐ |
| 6.4 | DEO cannot see admin's revenue | Revenue list filtered to DEO only | ☐ |
| 6.5 | Direct API: fetch admin's student | RLS returns empty / 403 | ☐ |
| 6.6 | Direct API: update admin's student | RLS blocks — row-level security error | ☐ |
| 6.7 | Direct API: delete admin's batch | RLS blocks | ☐ |
| 6.8 | DB queries filter by `created_by` | Confirm queries use `user_id = auth.uid()` or equivalent | ☐ |

---

## Phase 7: UI & UX Verification

| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 7.1 | "Data Entry Mode" badge | Visible in sidebar/header | ☐ |
| 7.2 | Entry counts use personal language | "You have added X items" not "Total: X" | ☐ |
| 7.3 | No revenue dashboard accessible | Route blocked, no link in nav | ☐ |
| 7.4 | No reports page accessible | Route blocked, no link in nav | ☐ |
| 7.5 | No members page accessible | Route blocked, no link in nav | ☐ |
| 7.6 | No settings accessible | Route blocked, no link in nav | ☐ |
| 7.7 | Profile page works | Can update own name, avatar, phone etc. | ☐ |
| 7.8 | Logout works | Clean logout, redirected to auth page | ☐ |

---

## Phase 8: Edge Cases & Validation

| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 8.1 | Payment exceeding batch fee limit | Error message with max allowed amount | ☐ |
| 8.2 | Duplicate batch code | Validation error prevents creation | ☐ |
| 8.3 | Edit student with invalid data (empty name) | Form validation error shown | ☐ |
| 8.4 | All form submits have loading states | Button disabled + spinner during save | ☐ |
| 8.5 | Network error during save | Proper error toast, form remains editable | ☐ |
| 8.6 | Concurrent edit (admin edits same record) | Last write wins, no crash | ☐ |

---

## Phase 9: Audit & Access Control

| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 9.1 | Audit log captures DEO actions | Admin sees DEO's entries with profile pic, name, action label | ☐ |
| 9.2 | Admin views all data | Admin can see DEO's entries in full company view | ☐ |
| 9.3 | Remove DEO from company | All access revoked immediately — DEO sees "no company" state | ☐ |
| 9.4 | Change DEO → Moderator | Full data visibility granted, company-wide data visible | ☐ |
| 9.5 | Server-side validation | Direct API calls without proper permissions return 403/RLS error | ☐ |
| 9.6 | No audit log tampering | DEO cannot access or modify audit_logs table | ☐ |

---

## Summary Checklist

- [ ] Phase 0: Zero permissions baseline verified
- [ ] Phase 1: Student management isolated and functional
- [ ] Phase 2: Payment recording isolated with overpayment protection
- [ ] Phase 3: Batch management isolated with validation
- [ ] Phase 4: Revenue & expenses isolated with no analytics
- [ ] Phase 5: All permissions combined work correctly
- [ ] Phase 6: Data isolation enforced at DB level
- [ ] Phase 7: UI shows DEO-appropriate views
- [ ] Phase 8: Edge cases handled gracefully
- [ ] Phase 9: Audit trail and access revocation work
