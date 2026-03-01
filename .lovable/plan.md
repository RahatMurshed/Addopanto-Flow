

# Seed Test Data into Current Company

## Goal
Create and deploy a `seed-test-data` edge function that populates your active company (**Grammar Addopanto**, `2567920a-533b-4b81-bc98-fd82592aad92`) with realistic test data, then invoke it and clean up the function afterward.

## What Will Be Seeded

| Category | Records | Details |
|----------|---------|---------|
| Revenue Sources | 4 | Student Fees, Product Sales, Donations, Other Income |
| Expense Accounts | 3 | Salary, Rent, Utilities |
| Courses | 3 | Bengali Grammar, English Speaking, Arabic Reading |
| Batches | 4 | 2 active, 1 upcoming, 1 with past end_date (for auto-complete testing) |
| Students | 15 | Mix of active, inquiry statuses across batches |
| Batch Enrollments | ~18 | Some students enrolled in multiple batches |
| Student Payments | ~30 | Mix of admission + monthly, paid/unpaid/partial statuses |
| Expenses | 8 | Spread across accounts and months |
| Manual Revenues | 3 | Non-student-fee revenue (donations, etc.) |
| Products | 4 | Books, stationery items with stock |
| Product Sales | 5 | Some linked to students |

## Technical Steps

1. **Create** `supabase/functions/seed-test-data/index.ts` with:
   - Hardcoded target company ID `2567920a-533b-4b81-bc98-fd82592aad92` and user ID `c4a042bf-eff2-4c3e-9431-a093fe7feaa1`
   - Cleanup phase: delete existing data in FK-safe order before seeding (idempotent)
   - Insert data in dependency order: sources/accounts -> courses -> batches -> students -> enrollments -> payments -> expenses -> products -> sales
   - Only create revenue for "paid" payments manually (to avoid the known P0 revenue inflation bug from the `sync_student_payment_revenue` trigger, or accept the trigger behavior)

2. **Add** `[functions.seed-test-data]` with `verify_jwt = false` to `supabase/config.toml`

3. **Deploy and invoke** the function

4. **Verify** data appears on your dashboard

5. **Cleanup**: Delete the edge function and remove config entry after successful seeding

## Note on Revenue Trigger Bug
The `sync_student_payment_revenue` trigger will auto-create revenue records for ALL student payments (including unpaid). This is the known P0 bug from testing. The seeded data will reflect this behavior until the trigger is fixed.

