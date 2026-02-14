export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      allocations: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          expense_account_id: string
          id: string
          revenue_id: string
          user_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          expense_account_id: string
          id?: string
          revenue_id: string
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          expense_account_id?: string
          id?: string
          revenue_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "expense_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_revenue_id_fkey"
            columns: ["revenue_id"]
            isOneToOne: false
            referencedRelation: "revenues"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          batch_code: string
          batch_name: string
          company_id: string
          course_duration_months: number | null
          created_at: string
          created_by: string
          default_admission_fee: number
          default_monthly_fee: number
          description: string | null
          end_date: string | null
          id: string
          max_capacity: number | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_code: string
          batch_name: string
          company_id: string
          course_duration_months?: number | null
          created_at?: string
          created_by: string
          default_admission_fee?: number
          default_monthly_fee?: number
          description?: string | null
          end_date?: string | null
          id?: string
          max_capacity?: number | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_code?: string
          batch_name?: string
          company_id?: string
          course_duration_months?: number | null
          created_at?: string
          created_by?: string
          default_admission_fee?: number
          default_monthly_fee?: number
          description?: string | null
          end_date?: string | null
          id?: string
          max_capacity?: number | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          base_currency: string
          created_at: string
          created_by: string
          currency: string
          description: string | null
          exchange_rate: number
          fiscal_year_start_month: number
          id: string
          invite_code: string | null
          join_password: string | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          created_by: string
          currency?: string
          description?: string | null
          exchange_rate?: number
          fiscal_year_start_month?: number
          id?: string
          invite_code?: string | null
          join_password?: string | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          exchange_rate?: number
          fiscal_year_start_month?: number
          id?: string
          invite_code?: string | null
          join_password?: string | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_join_requests: {
        Row: {
          banned_until: string | null
          company_id: string
          id: string
          message: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          banned_until?: string | null
          company_id: string
          id?: string
          message?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          banned_until?: string | null
          company_id?: string
          id?: string
          message?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_join_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_join_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      company_memberships: {
        Row: {
          approved_by: string | null
          can_add_batch: boolean
          can_add_expense: boolean
          can_add_expense_source: boolean
          can_add_payment: boolean
          can_add_revenue: boolean
          can_add_student: boolean
          can_delete_batch: boolean
          can_delete_expense: boolean
          can_delete_payment: boolean
          can_delete_revenue: boolean
          can_delete_student: boolean
          can_edit_batch: boolean
          can_edit_expense: boolean
          can_edit_payment: boolean
          can_edit_revenue: boolean
          can_edit_student: boolean
          can_manage_students: boolean
          can_transfer: boolean
          can_view_reports: boolean
          company_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["company_role"]
          status: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          can_add_batch?: boolean
          can_add_expense?: boolean
          can_add_expense_source?: boolean
          can_add_payment?: boolean
          can_add_revenue?: boolean
          can_add_student?: boolean
          can_delete_batch?: boolean
          can_delete_expense?: boolean
          can_delete_payment?: boolean
          can_delete_revenue?: boolean
          can_delete_student?: boolean
          can_edit_batch?: boolean
          can_edit_expense?: boolean
          can_edit_payment?: boolean
          can_edit_revenue?: boolean
          can_edit_student?: boolean
          can_manage_students?: boolean
          can_transfer?: boolean
          can_view_reports?: boolean
          company_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["company_role"]
          status?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          can_add_batch?: boolean
          can_add_expense?: boolean
          can_add_expense_source?: boolean
          can_add_payment?: boolean
          can_add_revenue?: boolean
          can_add_student?: boolean
          can_delete_batch?: boolean
          can_delete_expense?: boolean
          can_delete_payment?: boolean
          can_delete_revenue?: boolean
          can_delete_student?: boolean
          can_edit_batch?: boolean
          can_edit_expense?: boolean
          can_edit_payment?: boolean
          can_edit_revenue?: boolean
          can_edit_student?: boolean
          can_manage_students?: boolean
          can_transfer?: boolean
          can_view_reports?: boolean
          company_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["company_role"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_change_logs: {
        Row: {
          changed_at: string
          changed_by: string
          company_id: string
          id: string
          new_currency: string
          new_exchange_rate: number
          old_currency: string
          old_exchange_rate: number
        }
        Insert: {
          changed_at?: string
          changed_by: string
          company_id: string
          id?: string
          new_currency: string
          new_exchange_rate: number
          old_currency: string
          old_exchange_rate: number
        }
        Update: {
          changed_at?: string
          changed_by?: string
          company_id?: string
          id?: string
          new_currency?: string
          new_exchange_rate?: number
          old_currency?: string
          old_exchange_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "currency_change_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_change_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_accounts: {
        Row: {
          allocation_percentage: number
          color: string
          company_id: string
          created_at: string
          expected_monthly_expense: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_percentage?: number
          color?: string
          company_id: string
          created_at?: string
          expected_monthly_expense?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_percentage?: number
          color?: string
          company_id?: string
          created_at?: string
          expected_monthly_expense?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          date: string
          description: string | null
          expense_account_id: string
          id: string
          receipt_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          date?: string
          description?: string | null
          expense_account_id: string
          id?: string
          receipt_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          date?: string
          description?: string | null
          expense_account_id?: string
          id?: string
          receipt_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "expense_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      khata_transfers: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          description: string | null
          from_account_id: string
          id: string
          to_account_id: string
          user_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          description?: string | null
          from_account_id: string
          id?: string
          to_account_id: string
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          description?: string | null
          from_account_id?: string
          id?: string
          to_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khata_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khata_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khata_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "expense_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khata_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "expense_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_permissions: {
        Row: {
          can_add_expense: boolean
          can_add_expense_source: boolean
          can_add_revenue: boolean
          can_transfer: boolean
          can_view_reports: boolean
          controlled_by: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_add_expense?: boolean
          can_add_expense_source?: boolean
          can_add_revenue?: boolean
          can_transfer?: boolean
          can_view_reports?: boolean
          controlled_by?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_add_expense?: boolean
          can_add_expense_source?: boolean
          can_add_revenue?: boolean
          can_transfer?: boolean
          can_view_reports?: boolean
          controlled_by?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_fee_history: {
        Row: {
          company_id: string
          created_at: string
          effective_from: string
          id: string
          monthly_amount: number
          student_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          effective_from: string
          id?: string
          monthly_amount: number
          student_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          effective_from?: string
          id?: string
          monthly_amount?: number
          student_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_fee_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_fee_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_fee_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_requests: {
        Row: {
          banned_until: string | null
          can_add_expense: boolean
          can_add_expense_source: boolean
          can_add_revenue: boolean
          can_transfer: boolean
          can_view_reports: boolean
          email: string
          id: string
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          banned_until?: string | null
          can_add_expense?: boolean
          can_add_expense_source?: boolean
          can_add_revenue?: boolean
          can_transfer?: boolean
          can_view_reports?: boolean
          email: string
          id?: string
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          banned_until?: string | null
          can_add_expense?: boolean
          can_add_expense_source?: boolean
          can_add_revenue?: boolean
          can_transfer?: boolean
          can_view_reports?: boolean
          email?: string
          id?: string
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      revenue_sources: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_sources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_sources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      revenues: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          date: string
          description: string | null
          id: string
          source_id: string | null
          student_payment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          source_id?: string | null
          student_payment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          source_id?: string | null
          student_payment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "revenue_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_student_payment_id_fkey"
            columns: ["student_payment_id"]
            isOneToOne: false
            referencedRelation: "student_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      student_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          description: string | null
          id: string
          months_covered: string[] | null
          payment_date: string
          payment_method: string
          payment_type: string
          receipt_number: string | null
          student_id: string
          user_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          months_covered?: string[] | null
          payment_date?: string
          payment_method?: string
          payment_type: string
          receipt_number?: string | null
          student_id: string
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          months_covered?: string[] | null
          payment_date?: string
          payment_method?: string
          payment_type?: string
          receipt_number?: string | null
          student_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_fee_total: number
          batch_id: string | null
          billing_start_month: string
          company_id: string
          course_end_month: string | null
          course_start_month: string | null
          created_at: string
          email: string | null
          enrollment_date: string
          id: string
          monthly_fee_amount: number
          name: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["student_status"]
          student_id_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admission_fee_total?: number
          batch_id?: string | null
          billing_start_month: string
          company_id: string
          course_end_month?: string | null
          course_start_month?: string | null
          created_at?: string
          email?: string | null
          enrollment_date: string
          id?: string
          monthly_fee_amount?: number
          name: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_id_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admission_fee_total?: number
          batch_id?: string | null
          billing_start_month?: string
          company_id?: string
          course_end_month?: string | null
          course_start_month?: string | null
          created_at?: string
          email?: string | null
          enrollment_date?: string
          id?: string
          monthly_fee_amount?: number
          name?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_id_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          active_company_id: string | null
          avatar_url: string | null
          business_name: string | null
          created_at: string
          currency: string
          email: string | null
          fiscal_year_start_month: number
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_company_id?: string | null
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          fiscal_year_start_month?: number
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_company_id?: string | null
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          fiscal_year_start_month?: number
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      companies_public: {
        Row: {
          base_currency: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          exchange_rate: number | null
          fiscal_year_start_month: number | null
          id: string | null
          logo_url: string | null
          name: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          base_currency?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          exchange_rate?: number | null
          fiscal_year_start_month?: number | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          base_currency?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          exchange_rate?: number | null
          fiscal_year_start_month?: number | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_add_expense: { Args: { _user_id: string }; Returns: boolean }
      can_add_expense_source: { Args: { _user_id: string }; Returns: boolean }
      can_add_revenue: { Args: { _user_id: string }; Returns: boolean }
      can_edit_delete: { Args: { _user_id: string }; Returns: boolean }
      can_transfer: { Args: { _user_id: string }; Returns: boolean }
      can_view_user: { Args: { _target_user_id: string }; Returns: boolean }
      company_can_add_batch: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_add_expense: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_add_expense_source: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_add_payment: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_add_revenue: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_add_student: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_delete_batch: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_delete_expense: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_delete_payment: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_delete_revenue: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_delete_student: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_edit_batch: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_edit_delete: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_edit_expense: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_edit_payment: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_edit_revenue: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_edit_student: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_transfer: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      get_active_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_cipher: { Args: { _user_id: string }; Returns: boolean }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_moderator: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "cipher" | "admin" | "moderator" | "user"
      company_role: "admin" | "moderator" | "viewer" | "data_entry_operator"
      student_status: "active" | "inactive" | "graduated"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["cipher", "admin", "moderator", "user"],
      company_role: ["admin", "moderator", "viewer", "data_entry_operator"],
      student_status: ["active", "inactive", "graduated"],
    },
  },
} as const
