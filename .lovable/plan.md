

# Comprehensive Data Seeding: Fix Dates and Populate All Empty Tables

## Problem
1. **All existing seeded data has 2025 dates** instead of March 2026 (current month), so the dashboard shows 0 when filtered to the current period
2. **20 tables are completely empty** and have never been tested with data

## Approach
Create a new `seed-test-data` edge function that:
- Updates existing records (revenues, expenses, payments) to use **Feb-March 2026** dates
- Populates all 20 empty tables with realistic test data
- Deploy, invoke, verify, then clean up

## Pre-requisite Fix
The `audit_logs.action` CHECK constraint only allows `INSERT`, `UPDATE`, `DELETE`. We need to expand it to include custom actions like `add_note`, `update_note`, `delete_note` etc., otherwise the sales notes audit logging will fail. This will be done via a migration.

## What Will Be Seeded

| Table | Records | Details |
|-------|---------|---------|
| **Date Fix** | ~80 existing records | Update revenues, expenses, payments, product_sales dates to Feb-Mar 2026 |
| suppliers | 3 | Book supplier, stationery vendor, furniture provider |
| student_tags | 5 | Tags: Scholarship, Top Performer, Needs Attention, New Admission, Alumni |
| student_siblings | 6 | 2-3 students get sibling records |
| sales_note_categories | 3 | Custom categories: Follow-up Call, Parent Meeting, Fee Reminder |
| student_sales_notes | 8 | Notes spread across students with different categories |
| student_batch_history | 4 | Transfer records between batches |
| stakeholders | 2 | 1 investor + 1 lender |
| investments | 1 | Equity investment from the investor |
| profit_distributions | 1 | One profit distribution for the investment |
| loans | 1 | Loan from the lender |
| loan_repayments | 2 | Two repayment records |
| employees | 4 | Teacher, admin staff, accountant, peon |
| employee_salary_payments | 6 | Salary payments for Feb-Mar 2026 |
| employee_attendance | ~40 | Daily attendance for March 2026 |
| employee_leaves | 2 | One casual, one sick leave |
| khata_transfers | 3 | Transfers between expense accounts |
| currency_change_logs | 1 | One currency change record |
| dashboard_access_logs | 3 | Access log entries |
| moderator_permissions | 1 | Permissions for the current user |
| duplicate_dismissals | 1 | One dismissed duplicate pair |

**Note**: `registration_requests` requires a different user_id (simulating another user requesting to join), so we'll skip it unless you want a dummy entry.

## Technical Steps

1. **Migration**: Drop and recreate the `audit_logs_action_check` constraint to allow any text value (or expand the allowed list)

2. **Edge Function** `seed-test-data`:
   - Phase 1: Update all existing record dates from 2025 to Feb-Mar 2026
   - Phase 2: Insert data into all 20 empty tables using existing FK references (student IDs, batch IDs, etc.)
   - Uses service role key to bypass RLS
   - Company: `2567920a-533b-4b81-bc98-fd82592aad92`
   - User: `c4a042bf-eff2-4c3e-9431-a093fe7feaa1`

3. **Deploy and invoke** the function

4. **Verify** dashboard shows data for March 2026 and all tables are populated

5. **Cleanup**: Delete the edge function after successful seeding

