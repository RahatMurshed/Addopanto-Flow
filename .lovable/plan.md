

# Seed Realistic Test Data for Grammar Addopanto

## Approach

Since the database has RLS policies on all tables, I'll create a temporary edge function `seed-test-data` that uses the Supabase service role key to insert data, bypassing RLS. After seeding, we verify dashboard stats and then delete the edge function.

## Company & User Context

- **Company ID**: `0f108cf2-94a8-4e36-b117-7a786ac6b51e` (Grammar Addopanto)
- **Admin user**: `23bc783f-4df6-4581-8022-e6185bfdec1c`

## Data to Seed (all linked to this company)

### Step 1: Foundation data (courses, batches, expense accounts, revenue sources, products)

| Entity | Count | Details |
|--------|-------|---------|
| Courses | 3 | "Spoken English", "IELTS Preparation", "Grammar Fundamentals" |
| Batches | 6 | 2 per course (1 active, 1 completed), realistic start/end dates |
| Expense Accounts | 4 | Rent, Utilities, Marketing, Supplies |
| Revenue Sources | 2 | Tuition Fees, Product Sales |
| Products | 3 | Notebook, Grammar Book, Pen Set |

### Step 2: Students (20 total)

Mix of statuses: 12 active, 3 inactive, 3 graduated, 2 inquiry. Realistic BD names like Rahim Uddin, Fatima Akter, Kamal Hossain, etc. Phone numbers in 01XXX format. Enrollment dates spread over last 6 months.

### Step 3: Batch Enrollments

- 17 students enrolled in 1 batch each
- 3 students enrolled in 2 batches simultaneously
- Total: 23 enrollment records

### Step 4: Student Payments

- 5 students fully paid (all scheduled payments marked "paid")
- 5 students partial (some months paid, some pending)
- 5 students with overdue payments (due_date in the past, status "unpaid")
- 1 student (the "heavy payer") with 12+ payment records to test pagination
- Mix of admission_fee and monthly_fee payment types
- Amounts: admission 2000-5000 BDT, monthly 1500-3000 BDT

### Step 5: Product Sales (5 records)

5 sales across different students, amounts 150-800 BDT, mix of cash/bkash payment methods.

### Step 6: Expenses (10 records)

Spread across the 4 expense accounts, dates over last 3 months, amounts 1000-15000 BDT. Categories: rent, utilities, marketing materials, office supplies.

### Step 7: Sales Notes (3 records)

Notes on 3 different students with categories like "follow_up", "general", "payment_reminder".

### Step 8: Monthly Fee History

One record per student to establish their fee baseline.

## Technical Details

### Edge function: `supabase/functions/seed-test-data/index.ts`

- Uses `createClient` with service role key to bypass RLS
- Single POST endpoint that inserts all data in order (respecting FK dependencies)
- Returns summary of inserted counts
- Idempotent check: refuses to run if students already exist for this company

### Insert order (FK-safe):
1. Revenue sources and expense accounts
2. Courses
3. Batches (references courses)
4. Products
5. Students (references batches)
6. Batch enrollments (references students + batches)
7. Monthly fee history (references students)
8. Student payments (references students, batch_enrollments)
9. Product sales (references products, students)
10. Expenses (references expense accounts)
11. Sales notes (references students)

### After seeding:
- Deploy and invoke the edge function
- Verify dashboard shows non-zero revenue, expenses, student counts
- Delete the edge function (it's a one-time seed tool)

### Verification queries:
- Student count = 20
- Batch count = 6
- Payment records > 40
- Product sales = 5
- Expenses = 10
- Dashboard RPCs return non-zero totals

