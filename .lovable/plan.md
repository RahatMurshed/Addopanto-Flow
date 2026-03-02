

# Seed Production-Grade Demo Data for Recruiter/Client Showcase

## Overview
You'll first sign up in the app (or use an existing account). Then I will:
1. Elevate your account to **Cipher** (super-admin)
2. Create a realistic company: **"Greenfield Academy"** -- a professional coaching institute
3. Populate every feature with authentic, production-quality data spanning 6+ months of operational history

## Pre-requisite (Your Action)
**Sign up or log in** to the app in the preview window. Then tell me your **email address** so I can identify your user ID and begin seeding.

---

## Step 1 -- Elevate Your Account to Cipher

- Update your `user_roles` row from `user` to `cipher`
- Update your `user_profiles` with a professional name if needed

## Step 2 -- Create Company: Greenfield Academy

| Field | Value |
|-------|-------|
| Name | Greenfield Academy |
| Slug | greenfield-academy |
| Currency | BDT |
| Fiscal Year Start | January (1) |
| Description | Premier coaching institute for competitive exam preparation and professional skill development |

- Create your `company_membership` as **admin** of this company
- Set this as your `active_company_id`

## Step 3 -- Revenue Sources (6)

Tuition Fees, Admission Fees, Exam Fees, Workshop Income, Book Sales, Miscellaneous

## Step 4 -- Expense Accounts (6)

Salary & Wages (40%), Rent & Utilities (20%), Marketing (10%), Teaching Materials (10%), Office Supplies (5%), Miscellaneous (15%)

## Step 5 -- Courses (4)

| Course | Code | Duration | Category |
|--------|------|----------|----------|
| Full Stack Web Development | FSWD-01 | 6 months | Technology |
| Data Science & Analytics | DSA-01 | 8 months | Technology |
| IELTS Preparation | IELTS-01 | 3 months | Language |
| Graphic Design Masterclass | GDM-01 | 4 months | Design |

## Step 6 -- Batches (6)

| Batch | Code | Course | Status | Start | Fees (Admission/Monthly) |
|-------|------|--------|--------|-------|--------------------------|
| FSWD Batch 24A | FSWD-24A | Full Stack Web Dev | completed | 2025-06-01 | 5000/3500 |
| FSWD Batch 25A | FSWD-25A | Full Stack Web Dev | active | 2025-12-01 | 5500/3800 |
| DSA Batch 25A | DSA-25A | Data Science | active | 2025-10-01 | 6000/4000 |
| IELTS Jan 26 | IELTS-26A | IELTS Prep | active | 2026-01-05 | 3000/2500 |
| GDM Batch 25B | GDM-25B | Graphic Design | active | 2025-11-15 | 4000/3000 |
| DSA Batch 24B | DSA-24B | Data Science | completed | 2025-03-01 | 5500/3800 |

## Step 7 -- Students (25+)

Realistic Bangladeshi/South Asian names with full profiles:
- Phone numbers (01XXXXXXXXX format)
- Email addresses
- Date of birth, gender, blood group
- Father/mother names, occupations, contacts
- Address details (Dhaka, Chittagong, Sylhet, etc.)
- Previous school/qualification info
- Each student enrolled in 1-2 batches via `batch_enrollments`
- Mix of statuses: active, graduated, inquiry

## Step 8 -- Student Payments (80+)

- Admission fee payments for each enrolled student
- Monthly tuition payments spanning Sep 2025 -- Feb 2026
- Payment methods: cash, bank_transfer, bkash, nagad
- Realistic receipt numbers (GFA-2025-0001 format)
- Some students fully paid, some partially paid, a few with overdue months
- Each payment auto-generates a corresponding revenue record via triggers

## Step 9 -- Manual Revenue Entries (15+)

- Workshop income entries (Oct, Dec, Feb)
- Exam fee collections
- Book sale revenue
- Miscellaneous income (event sponsorship, late fees)
- Dates spread across Sep 2025 -- Feb 2026

## Step 10 -- Expense Entries (30+)

- Monthly rent payments (BDT 45,000/month)
- Marketing campaigns (Facebook ads, banner printing)
- Teaching material purchases (whiteboards, projectors, books)
- Office supply orders
- Utility bills
- Vendor names and invoice numbers included
- Dates spread Sep 2025 -- Feb 2026

## Step 11 -- Employees (6)

| Name | Designation | Department | Salary | Type |
|------|-------------|------------|--------|------|
| Rafiq Ahmed | Director | Management | 80,000 | full_time |
| Nusrat Jahan | Lead Instructor | Teaching | 55,000 | full_time |
| Kamal Hossain | Web Dev Instructor | Teaching | 45,000 | full_time |
| Fatema Begum | Admin Officer | Administration | 28,000 | full_time |
| Arif Rahman | Marketing Executive | Marketing | 30,000 | full_time |
| Sumaiya Akter | Part-time Tutor | Teaching | 15,000 | part_time |

## Step 12 -- Employee Salary Payments (18+)

- 3 months of salary records (Dec 2025, Jan 2026, Feb 2026) for each employee
- Payment methods: bank_transfer, cash
- Some with deductions noted

## Step 13 -- Stakeholders (3)

| Name | Type | Category |
|------|------|----------|
| Mahbub Alam | investor | individual |
| Nexus Ventures BD | investor | organization |
| Eastern Bank Ltd | lender | bank |

## Step 14 -- Investments & Loans

- 2 investment records linked to stakeholders (BDT 500,000 and 300,000)
- 1 loan record (BDT 200,000 from Eastern Bank, 12% interest)

## Step 15 -- Products & Sales

- 4-5 products (course materials, branded notebooks, USB drives)
- Product categories already seeded by trigger
- 10+ product sale records linked to students

## Step 16 -- Student Tags

- Tags: "Scholarship", "Top Performer", "Needs Follow-up", "Referred"
- Assign to relevant students

## Step 17 -- Khata Transfers (3-4)

- Inter-account fund transfers between expense accounts
- Shows financial management activity

---

## Technical Notes

- All data will be inserted using the **data insert tool** (not migrations) since this is data, not schema changes
- All inserts will use your user ID as `user_id` and `created_by` so RLS policies pass
- Student payments will trigger automatic revenue creation via the `sync_student_payment_revenue` trigger
- Salary payments will trigger automatic expense creation via the `fn_auto_create_salary_expense` trigger
- Batch enrollments will be created to properly link students to batches
- UUIDs will be generated inline using `gen_random_uuid()`
- All dates are historically accurate (6 months of backfilled operations ending at today, March 2, 2026)

