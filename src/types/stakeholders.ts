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
