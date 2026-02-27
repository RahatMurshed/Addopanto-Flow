

# Phase 1: Fund Source Tracking and Expense Linking

## Overview

Build the core fund tracking infrastructure: track where investment/loan funds came from when received, link expenses to their funding sources, and show fund utilization on stakeholder detail pages. Reconciliation is excluded per your preference.

---

## 1. Database Migration

### Add columns to `investments` table

| Column | Type | Purpose |
|--------|------|---------|
| transfer_method | text | bank_transfer, cheque, cash, wire_transfer, demand_draft, upi |
| source_bank | text | Where funds came from |
| source_account_name | text | Account holder name |
| source_account_number_masked | text | Stored as ****7890 |
| destination_bank | text | Company receiving bank |
| destination_account_masked | text | Company account (masked) |
| transfer_date | date | When money actually received |
| transaction_reference | text | UTR/Transaction ID/Cheque number |
| proof_document_url | text | Upload proof file URL |
| expected_amount | numeric | Total agreed investment |
| received_amount | numeric | Actually received so far |
| receipt_status | text | pending, partial, received |
| allocated_to_expenses | numeric DEFAULT 0 | How much spent |
| remaining_unallocated | numeric | Available to spend |
| receipt_notes | text | Additional notes |

### Add columns to `loans` table

| Column | Type | Purpose |
|--------|------|---------|
| disbursement_method | text | How loan was received |
| disbursement_date | date | Actual receipt date |
| source_bank | text | Lender's bank |
| source_account_name | text | Lender account holder |
| source_account_number_masked | text | Masked account |
| destination_bank | text | Company receiving bank |
| destination_account_masked | text | Company account |
| loan_agreement_number | text | Agreement reference |
| transaction_reference | text | Transaction ID |
| disbursement_proof_url | text | Proof document URL |
| gross_loan_amount | numeric | Approved amount |
| processing_fee | numeric DEFAULT 0 | Bank fee |
| documentation_charges | numeric DEFAULT 0 | Doc charges |
| other_deductions | numeric DEFAULT 0 | Other deductions |
| net_disbursed_amount | numeric | Actually received |
| disbursement_status | text DEFAULT 'pending' | pending, partial, disbursed |
| allocated_to_expenses | numeric DEFAULT 0 | How much spent |
| remaining_unallocated | numeric | Available to spend |
| stated_purpose | text | What loan is for |
| purpose_compliant | boolean DEFAULT true | Compliance flag |
| disbursement_notes | text | Notes |

### Add columns to `expenses` table

| Column | Type | Purpose |
|--------|------|---------|
| funded_by_type | text | investment, loan, company_funds |
| funded_by_id | uuid | Reference to investment or loan |
| funded_by_reference | text | Display name |
| matches_loan_purpose | boolean | Purpose compliance |
| purpose_notes | text | Explanation if non-compliant |
| invoice_number | text | Invoice reference |
| vendor_name | text | Vendor/supplier name |

### Storage bucket for fund documents

Create `fund-documents` public storage bucket for proof documents (bank statements, cheques, invoices) with Cipher-only RLS policies.

### Database trigger for fund allocation

A trigger on expenses INSERT/UPDATE/DELETE will automatically update `allocated_to_expenses` and `remaining_unallocated` on the linked investment or loan, ensuring atomicity.

---

## 2. Update Type Definitions

**File: `src/types/stakeholders.ts`**

- Add all new fields to `Investment` and `Loan` interfaces
- Add `InvestmentSourceInput` and `LoanDisbursementInput` interfaces
- Add `FundedExpense` type for expenses with funding source info

---

## 3. Enhanced Add Stakeholder Form

**File: `src/pages/AddStakeholder.tsx`**

### For Investors - Add Step 4: Source of Funds

After investment details, add a new step with:
- Receipt status toggle (Funds Received / Awaiting Receipt)
- Transfer method selector (Bank Transfer, Cheque, Cash, UPI, Wire, Demand Draft)
- Conditional fields based on transfer method:
  - Bank Transfer/Wire/UPI: source bank, account holder, masked account, destination bank, transfer date, UTR reference
  - Cheque: cheque number, cheque date, bank name, account holder, deposit details, clearance date
  - Cash: received date, received by (auto-filled), deposit details, witness info
- Amount received field (defaults to investment amount)
- Proof document upload (file upload to fund-documents bucket)
- Receipt summary card showing key details
- Receipt notes textarea

### For Lenders - Add Step 4: Loan Disbursement

After loan terms, add:
- Deductions section: processing fee, documentation charges, other deductions with auto-calculated net amount
- Disbursement status toggle
- Transfer method and bank details (same pattern as investment)
- Loan agreement number field
- Stated purpose textarea (required - used for compliance tracking)
- Disbursement summary card
- Proof document upload

The step flow changes from 3 to 4 steps: Type -> Info -> Financial Details -> Source/Disbursement Details.

---

## 4. Expense Dialog Enhancement

**File: `src/components/dialogs/ExpenseDialog.tsx`**

Add a "Funding Source" section to the expense form:

- Radio group: Company's Own Funds (default), From Investment, From Loan
- When Investment/Loan selected, show a dropdown listing active investments/loans with:
  - Stakeholder name
  - Amount and remaining balance
  - Date received
  - "Can allocate: up to X" indicator
- Validation: expense amount cannot exceed remaining unallocated funds
- For Loan funding: show stated purpose and ask "Does this match?" with Yes/No toggle
  - If No, require explanation text
- Optional invoice/vendor fields: invoice number, vendor name

New hooks needed:
- `useFundableInvestments()` - fetches investments with remaining_unallocated > 0
- `useFundableLoans()` - fetches loans with remaining_unallocated > 0

---

## 5. Fund Usage Tab on Stakeholder Detail Page

**File: `src/pages/StakeholderDetail.tsx`**

Add a "Fund Usage" tab to both InvestorDetails and LenderDetails:

### Investor Fund Usage Tab
- Summary cards: Total Investment, Amount Spent, Remaining (with percentages)
- Utilization progress bar (color-coded: green < 75%, orange 75-90%, red > 90%)
- Pie chart showing expense breakdown by expense account category
- Table of all expenses funded by this investment with date, category, description, amount, vendor, invoice number
- Pagination for expense list

### Lender Fund Usage Tab
- Summary cards: Net Disbursed, Amount Spent, Remaining
- Purpose compliance card showing stated purpose, compliance percentage, compliant vs non-compliant amounts
- Warning badges for non-compliant expenses
- Table of funded expenses with purpose match indicator column
- Pagination for expense list

New hooks:
- `useFundedExpenses(fundType: 'investment' | 'loan', fundId: string)` - fetches expenses linked to a specific fund

---

## 6. Dashboard Financial Obligations Enhancement

**File: `src/pages/Dashboard.tsx`**

In the existing Financial Obligations section (Cipher-only), add a Fund Utilization Overview:

- Summary row: Total Received | Total Allocated | Unallocated
- Breakdown by source type (Investment Funds vs Loan Funds)
- Individual fund status table: Source, Received, Spent, Remaining, % Used with progress bars

---

## 7. Update useStakeholders Hook

**File: `src/hooks/useStakeholders.ts`**

- Update `useSaveInvestment` to accept source tracking fields
- Update `useSaveLoan` to accept disbursement fields
- Add `useFundableInvestments()` hook
- Add `useFundableLoans()` hook
- Add `useFundedExpenses()` hook
- Add `useFundUtilizationSummary()` hook for dashboard

---

## 8. Update useExpenses Hook

**File: `src/hooks/useExpenses.ts`**

- Update `useCreateExpense` mutation to include funding source fields
- Update `useUpdateExpense` to handle funding source changes
- Invalidate stakeholder/investment/loan queries when funded expenses change

---

## Files Modified

| File | Change |
|---|---|
| Migration SQL | Add columns to investments, loans, expenses; create trigger; create storage bucket |
| `src/types/stakeholders.ts` | Add new fields to Investment, Loan; add new interfaces |
| `src/pages/AddStakeholder.tsx` | Add Step 4 for source/disbursement tracking |
| `src/components/dialogs/ExpenseDialog.tsx` | Add funding source section |
| `src/pages/StakeholderDetail.tsx` | Add Fund Usage tab |
| `src/pages/Dashboard.tsx` | Add utilization overview to Financial Obligations |
| `src/hooks/useStakeholders.ts` | Add fund-related hooks |
| `src/hooks/useExpenses.ts` | Update mutations with funding fields |

## Security

- All new columns inherit existing Cipher-only RLS policies on investments, loans tables
- Expenses funding fields accessible to users who can already create expenses (existing RLS)
- Fund documents storage bucket restricted to Cipher for upload/delete, public read
- Account numbers always stored masked (last 4 digits only)
- Database trigger runs as SECURITY DEFINER for atomic fund balance updates

