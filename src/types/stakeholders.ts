export interface Stakeholder {
  id: string;
  company_id: string;
  stakeholder_type: "investor" | "lender";
  category: "individual" | "organization" | "bank" | "family" | "partner";
  name: string;
  contact_number: string | null;
  email: string | null;
  address: string | null;
  id_number: string | null;
  relationship_notes: string | null;
  status: "active" | "exited" | "inactive";
  user_id: string;
  created_at: string;
  updated_at: string;
  image_url: string | null;
}

export interface Investment {
  id: string;
  stakeholder_id: string;
  company_id: string;
  investment_amount: number;
  investment_date: string;
  ownership_percentage: number;
  profit_share_percentage: number;
  investment_type: "equity" | "profit_sharing" | "convertible";
  company_valuation_at_investment: number | null;
  terms_and_conditions: string | null;
  status: "active" | "exited" | "bought_out";
  exit_date: string | null;
  exit_amount: number | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Source tracking fields
  transfer_method: string | null;
  source_bank: string | null;
  source_account_name: string | null;
  source_account_number_masked: string | null;
  destination_bank: string | null;
  destination_account_masked: string | null;
  transfer_date: string | null;
  transaction_reference: string | null;
  proof_document_url: string | null;
  expected_amount: number | null;
  received_amount: number | null;
  receipt_status: "pending" | "partial" | "received";
  allocated_to_expenses: number;
  remaining_unallocated: number | null;
  receipt_notes: string | null;
}

export interface ProfitDistribution {
  id: string;
  investment_id: string;
  company_id: string;
  distribution_date: string;
  profit_period_start: string;
  profit_period_end: string;
  total_company_profit: number;
  investor_share_percentage: number;
  calculated_amount: number;
  amount_paid: number;
  payment_method: "cash" | "bank_transfer" | "cheque";
  payment_reference: string | null;
  status: "paid" | "pending" | "deferred" | "partial";
  notes: string | null;
  distributed_by: string;
  created_at: string;
}

export interface Loan {
  id: string;
  stakeholder_id: string;
  company_id: string;
  loan_amount: number;
  interest_rate: number;
  interest_amount: number;
  total_repayable: number;
  loan_date: string;
  loan_purpose: string | null;
  repayment_type: "one_time" | "monthly" | "quarterly" | "flexible";
  repayment_start_date: string | null;
  repayment_due_date: string;
  monthly_installment: number | null;
  collateral_description: string | null;
  loan_agreement_url: string | null;
  status: "active" | "paid_off" | "overdue" | "restructured" | "defaulted";
  remaining_balance: number;
  notes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Disbursement tracking fields
  disbursement_method: string | null;
  disbursement_date: string | null;
  source_bank: string | null;
  source_account_name: string | null;
  source_account_number_masked: string | null;
  destination_bank: string | null;
  destination_account_masked: string | null;
  loan_agreement_number: string | null;
  transaction_reference: string | null;
  disbursement_proof_url: string | null;
  gross_loan_amount: number | null;
  processing_fee: number;
  documentation_charges: number;
  other_deductions: number;
  net_disbursed_amount: number | null;
  disbursement_status: "pending" | "partial" | "disbursed";
  allocated_to_expenses: number;
  remaining_unallocated: number | null;
  stated_purpose: string | null;
  purpose_compliant: boolean;
  disbursement_notes: string | null;
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  company_id: string;
  repayment_date: string;
  amount_paid: number;
  principal_portion: number;
  interest_portion: number;
  remaining_balance: number;
  payment_method: "cash" | "bank_transfer" | "cheque";
  receipt_number: string | null;
  payment_status: "on_time" | "late" | "partial" | "ahead";
  days_overdue: number;
  notes: string | null;
  recorded_by: string;
  created_at: string;
}

export interface StakeholderInput {
  name: string;
  stakeholder_type: "investor" | "lender";
  category: string;
  contact_number?: string;
  email?: string;
  address?: string;
  id_number?: string;
  relationship_notes?: string;
  status?: string;
}

export interface InvestmentInput {
  investment_amount: number;
  investment_date: string;
  ownership_percentage: number;
  profit_share_percentage: number;
  investment_type: string;
  company_valuation_at_investment?: number | null;
  terms_and_conditions?: string;
}

export interface InvestmentSourceInput {
  transfer_method?: string;
  source_bank?: string;
  source_account_name?: string;
  source_account_number_masked?: string;
  destination_bank?: string;
  destination_account_masked?: string;
  transfer_date?: string;
  transaction_reference?: string;
  proof_document_url?: string;
  expected_amount?: number;
  received_amount?: number;
  receipt_status?: string;
  remaining_unallocated?: number;
  receipt_notes?: string;
}

export interface LoanInput {
  loan_amount: number;
  interest_rate: number;
  interest_amount: number;
  total_repayable: number;
  loan_date: string;
  loan_purpose?: string;
  repayment_type: string;
  repayment_start_date?: string;
  repayment_due_date: string;
  monthly_installment?: number | null;
  collateral_description?: string;
  notes?: string;
}

export interface LoanDisbursementInput {
  disbursement_method?: string;
  disbursement_date?: string;
  source_bank?: string;
  source_account_name?: string;
  source_account_number_masked?: string;
  destination_bank?: string;
  destination_account_masked?: string;
  loan_agreement_number?: string;
  transaction_reference?: string;
  disbursement_proof_url?: string;
  gross_loan_amount?: number;
  processing_fee?: number;
  documentation_charges?: number;
  other_deductions?: number;
  net_disbursed_amount?: number;
  disbursement_status?: string;
  remaining_unallocated?: number;
  stated_purpose?: string;
  disbursement_notes?: string;
}

export interface FundedExpense {
  id: string;
  amount: number;
  date: string;
  description: string | null;
  expense_account_id: string;
  funded_by_type: string | null;
  funded_by_id: string | null;
  funded_by_reference: string | null;
  matches_loan_purpose: boolean | null;
  purpose_notes: string | null;
  invoice_number: string | null;
  vendor_name: string | null;
  expense_accounts: { name: string; color: string } | null;
}

export type TransferMethod = "bank_transfer" | "cheque" | "cash" | "wire_transfer" | "demand_draft" | "upi";

export const TRANSFER_METHODS: { value: TransferMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "wire_transfer", label: "Wire Transfer" },
  { value: "demand_draft", label: "Demand Draft" },
  { value: "upi", label: "UPI / Digital Payment" },
];
