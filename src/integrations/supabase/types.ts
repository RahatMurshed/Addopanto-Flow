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
          course_id: string | null
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
          course_id?: string | null
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
          course_id?: string | null
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
          {
            foreignKeyName: "batches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
      company_creation_requests: {
        Row: {
          company_name: string
          company_slug: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          estimated_students: number | null
          id: string
          industry: string | null
          logo_url: string | null
          reason: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          company_name: string
          company_slug: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          estimated_students?: number | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          company_name?: string
          company_slug?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          estimated_students?: number | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
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
          can_add_expense: boolean
          can_add_expense_source: boolean
          can_add_revenue: boolean
          can_manage_students: boolean
          can_transfer: boolean
          can_view_employees: boolean
          can_view_reports: boolean
          company_id: string
          data_entry_mode: boolean
          deo_batches: boolean
          deo_courses: boolean
          deo_finance: boolean
          deo_payments: boolean
          deo_students: boolean
          id: string
          joined_at: string
          mod_batches_add: boolean
          mod_batches_delete: boolean
          mod_batches_edit: boolean
          mod_courses_add: boolean
          mod_courses_delete: boolean
          mod_courses_edit: boolean
          mod_expenses_add: boolean
          mod_expenses_delete: boolean
          mod_expenses_edit: boolean
          mod_payments_add: boolean
          mod_payments_delete: boolean
          mod_payments_edit: boolean
          mod_revenue_add: boolean
          mod_revenue_delete: boolean
          mod_revenue_edit: boolean
          mod_students_add: boolean
          mod_students_delete: boolean
          mod_students_edit: boolean
          role: Database["public"]["Enums"]["company_role"]
          status: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          can_add_expense?: boolean
          can_add_expense_source?: boolean
          can_add_revenue?: boolean
          can_manage_students?: boolean
          can_transfer?: boolean
          can_view_employees?: boolean
          can_view_reports?: boolean
          company_id: string
          data_entry_mode?: boolean
          deo_batches?: boolean
          deo_courses?: boolean
          deo_finance?: boolean
          deo_payments?: boolean
          deo_students?: boolean
          id?: string
          joined_at?: string
          mod_batches_add?: boolean
          mod_batches_delete?: boolean
          mod_batches_edit?: boolean
          mod_courses_add?: boolean
          mod_courses_delete?: boolean
          mod_courses_edit?: boolean
          mod_expenses_add?: boolean
          mod_expenses_delete?: boolean
          mod_expenses_edit?: boolean
          mod_payments_add?: boolean
          mod_payments_delete?: boolean
          mod_payments_edit?: boolean
          mod_revenue_add?: boolean
          mod_revenue_delete?: boolean
          mod_revenue_edit?: boolean
          mod_students_add?: boolean
          mod_students_delete?: boolean
          mod_students_edit?: boolean
          role?: Database["public"]["Enums"]["company_role"]
          status?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          can_add_expense?: boolean
          can_add_expense_source?: boolean
          can_add_revenue?: boolean
          can_manage_students?: boolean
          can_transfer?: boolean
          can_view_employees?: boolean
          can_view_reports?: boolean
          company_id?: string
          data_entry_mode?: boolean
          deo_batches?: boolean
          deo_courses?: boolean
          deo_finance?: boolean
          deo_payments?: boolean
          deo_students?: boolean
          id?: string
          joined_at?: string
          mod_batches_add?: boolean
          mod_batches_delete?: boolean
          mod_batches_edit?: boolean
          mod_courses_add?: boolean
          mod_courses_delete?: boolean
          mod_courses_edit?: boolean
          mod_expenses_add?: boolean
          mod_expenses_delete?: boolean
          mod_expenses_edit?: boolean
          mod_payments_add?: boolean
          mod_payments_delete?: boolean
          mod_payments_edit?: boolean
          mod_revenue_add?: boolean
          mod_revenue_delete?: boolean
          mod_revenue_edit?: boolean
          mod_students_add?: boolean
          mod_students_delete?: boolean
          mod_students_edit?: boolean
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
      courses: {
        Row: {
          category: string | null
          company_id: string
          course_code: string
          course_name: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_months: number | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          company_id: string
          course_code: string
          course_name: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_months?: number | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          company_id?: string
          course_code?: string
          course_name?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_months?: number | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_company_id_fkey"
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
      dashboard_access_logs: {
        Row: {
          anomaly_reason: string | null
          company_id: string | null
          created_at: string
          id: string
          is_anomaly: boolean
          is_cipher: boolean
          membership_role: string | null
          user_email: string | null
          user_id: string
          view_path: string
        }
        Insert: {
          anomaly_reason?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_anomaly?: boolean
          is_cipher?: boolean
          membership_role?: string | null
          user_email?: string | null
          user_id: string
          view_path?: string
        }
        Update: {
          anomaly_reason?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          is_anomaly?: boolean
          is_cipher?: boolean
          membership_role?: string | null
          user_email?: string | null
          user_id?: string
          view_path?: string
        }
        Relationships: []
      }
      duplicate_dismissals: {
        Row: {
          company_id: string
          created_at: string
          dismissed_by: string
          id: string
          student_id_a: string
          student_id_b: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dismissed_by: string
          id?: string
          student_id_a: string
          student_id_b: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dismissed_by?: string
          id?: string
          student_id_a?: string
          student_id_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_dismissals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_dismissals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_dismissals_student_id_a_fkey"
            columns: ["student_id_a"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_dismissals_student_id_a_fkey"
            columns: ["student_id_a"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_dismissals_student_id_b_fkey"
            columns: ["student_id_b"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_dismissals_student_id_b_fkey"
            columns: ["student_id_b"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_attendance: {
        Row: {
          company_id: string
          created_at: string
          date: string
          employee_id: string
          id: string
          marked_by: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          date: string
          employee_id: string
          id?: string
          marked_by: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          marked_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_leaves: {
        Row: {
          approval_status: string
          approved_by: string | null
          company_id: string
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          approved_by?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date: string
          user_id: string
        }
        Update: {
          approval_status?: string
          approved_by?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_leaves_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leaves_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          deductions: number | null
          description: string | null
          employee_id: string
          id: string
          month: string
          net_amount: number
          payment_date: string
          payment_method: string
          user_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          deductions?: number | null
          description?: string | null
          employee_id: string
          id?: string
          month: string
          net_amount: number
          payment_date?: string
          payment_method?: string
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          deductions?: number | null
          description?: string | null
          employee_id?: string
          id?: string
          month?: string
          net_amount?: number
          payment_date?: string
          payment_method?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          aadhar_national_id: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          blood_group: string | null
          company_id: string
          contact_number: string
          created_at: string
          created_by: string
          current_address: string | null
          date_of_birth: string | null
          department: string | null
          designation: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          employee_id_number: string
          employment_status: string
          employment_type: string
          full_name: string
          gender: string | null
          id: string
          join_date: string
          monthly_salary: number
          notes: string | null
          permanent_address: string | null
          permanent_address_same: boolean | null
          previous_experience: string | null
          profile_picture_url: string | null
          qualifications: string | null
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          aadhar_national_id?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          blood_group?: string | null
          company_id: string
          contact_number: string
          created_at?: string
          created_by: string
          current_address?: string | null
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          employee_id_number: string
          employment_status?: string
          employment_type?: string
          full_name: string
          gender?: string | null
          id?: string
          join_date: string
          monthly_salary?: number
          notes?: string | null
          permanent_address?: string | null
          permanent_address_same?: boolean | null
          previous_experience?: string | null
          profile_picture_url?: string | null
          qualifications?: string | null
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          aadhar_national_id?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          blood_group?: string | null
          company_id?: string
          contact_number?: string
          created_at?: string
          created_by?: string
          current_address?: string | null
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          employee_id_number?: string
          employment_status?: string
          employment_type?: string
          full_name?: string
          gender?: string | null
          id?: string
          join_date?: string
          monthly_salary?: number
          notes?: string | null
          permanent_address?: string | null
          permanent_address_same?: boolean | null
          previous_experience?: string | null
          profile_picture_url?: string | null
          qualifications?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
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
      investments: {
        Row: {
          company_id: string
          company_valuation_at_investment: number | null
          created_at: string
          exit_amount: number | null
          exit_date: string | null
          id: string
          investment_amount: number
          investment_date: string
          investment_type: string
          ownership_percentage: number
          profit_share_percentage: number
          stakeholder_id: string
          status: string
          terms_and_conditions: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          company_valuation_at_investment?: number | null
          created_at?: string
          exit_amount?: number | null
          exit_date?: string | null
          id?: string
          investment_amount: number
          investment_date: string
          investment_type?: string
          ownership_percentage?: number
          profit_share_percentage?: number
          stakeholder_id: string
          status?: string
          terms_and_conditions?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          company_valuation_at_investment?: number | null
          created_at?: string
          exit_amount?: number | null
          exit_date?: string | null
          id?: string
          investment_amount?: number
          investment_date?: string
          investment_type?: string
          ownership_percentage?: number
          profit_share_percentage?: number
          stakeholder_id?: string
          status?: string
          terms_and_conditions?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investments_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
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
      loan_repayments: {
        Row: {
          amount_paid: number
          company_id: string
          created_at: string
          days_overdue: number | null
          id: string
          interest_portion: number
          loan_id: string
          notes: string | null
          payment_method: string
          payment_status: string
          principal_portion: number
          receipt_number: string | null
          recorded_by: string
          remaining_balance: number
          repayment_date: string
        }
        Insert: {
          amount_paid: number
          company_id: string
          created_at?: string
          days_overdue?: number | null
          id?: string
          interest_portion?: number
          loan_id: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          principal_portion?: number
          receipt_number?: string | null
          recorded_by: string
          remaining_balance: number
          repayment_date: string
        }
        Update: {
          amount_paid?: number
          company_id?: string
          created_at?: string
          days_overdue?: number | null
          id?: string
          interest_portion?: number
          loan_id?: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          principal_portion?: number
          receipt_number?: string | null
          recorded_by?: string
          remaining_balance?: number
          repayment_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_repayments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          collateral_description: string | null
          company_id: string
          created_at: string
          id: string
          interest_amount: number
          interest_rate: number
          loan_agreement_url: string | null
          loan_amount: number
          loan_date: string
          loan_purpose: string | null
          monthly_installment: number | null
          notes: string | null
          remaining_balance: number
          repayment_due_date: string
          repayment_start_date: string | null
          repayment_type: string
          stakeholder_id: string
          status: string
          total_repayable: number
          updated_at: string
          user_id: string
        }
        Insert: {
          collateral_description?: string | null
          company_id: string
          created_at?: string
          id?: string
          interest_amount?: number
          interest_rate?: number
          loan_agreement_url?: string | null
          loan_amount: number
          loan_date: string
          loan_purpose?: string | null
          monthly_installment?: number | null
          notes?: string | null
          remaining_balance: number
          repayment_due_date: string
          repayment_start_date?: string | null
          repayment_type?: string
          stakeholder_id: string
          status?: string
          total_repayable: number
          updated_at?: string
          user_id: string
        }
        Update: {
          collateral_description?: string | null
          company_id?: string
          created_at?: string
          id?: string
          interest_amount?: number
          interest_rate?: number
          loan_agreement_url?: string | null
          loan_amount?: number
          loan_date?: string
          loan_purpose?: string | null
          monthly_installment?: number | null
          notes?: string | null
          remaining_balance?: number
          repayment_due_date?: string
          repayment_start_date?: string | null
          repayment_type?: string
          stakeholder_id?: string
          status?: string
          total_repayable?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
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
          {
            foreignKeyName: "monthly_fee_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          color: string
          company_id: string
          created_at: string
          icon: string
          id: string
          is_system: boolean
          name: string
          slug: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          icon?: string
          id?: string
          is_system?: boolean
          name: string
          slug: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          icon?: string
          id?: string
          is_system?: boolean
          name?: string
          slug?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sales: {
        Row: {
          company_id: string
          created_at: string
          customer_name: string | null
          id: string
          notes: string | null
          payment_method: string
          product_id: string
          quantity: number
          sale_date: string
          source_id: string | null
          student_id: string | null
          total_amount: number
          unit_price: number
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_name?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          product_id: string
          quantity?: number
          sale_date?: string
          source_id?: string | null
          student_id?: string | null
          total_amount: number
          unit_price: number
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_name?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          product_id?: string
          quantity?: number
          sale_date?: string
          source_id?: string | null
          student_id?: string | null
          total_amount?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "revenue_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock_movements: {
        Row: {
          company_id: string
          created_at: string
          id: string
          movement_type: string
          new_stock: number
          previous_stock: number
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          movement_type: string
          new_stock: number
          previous_stock: number
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          movement_type?: string
          new_stock?: number
          previous_stock?: number
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          linked_course_id: string | null
          price: number
          product_code: string
          product_name: string
          purchase_price: number | null
          reorder_level: number | null
          sku: string | null
          status: string
          stock_quantity: number | null
          supplier_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode?: string | null
          category?: string
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          linked_course_id?: string | null
          price?: number
          product_code: string
          product_name: string
          purchase_price?: number | null
          reorder_level?: number | null
          sku?: string | null
          status?: string
          stock_quantity?: number | null
          supplier_id?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string | null
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          linked_course_id?: string | null
          price?: number
          product_code?: string
          product_name?: string
          purchase_price?: number | null
          reorder_level?: number | null
          sku?: string | null
          status?: string
          stock_quantity?: number | null
          supplier_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_linked_course_id_fkey"
            columns: ["linked_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profit_distributions: {
        Row: {
          amount_paid: number
          calculated_amount: number
          company_id: string
          created_at: string
          distributed_by: string
          distribution_date: string
          id: string
          investment_id: string
          investor_share_percentage: number
          notes: string | null
          payment_method: string
          payment_reference: string | null
          profit_period_end: string
          profit_period_start: string
          status: string
          total_company_profit: number
        }
        Insert: {
          amount_paid: number
          calculated_amount: number
          company_id: string
          created_at?: string
          distributed_by: string
          distribution_date: string
          id?: string
          investment_id: string
          investor_share_percentage: number
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          profit_period_end: string
          profit_period_start: string
          status?: string
          total_company_profit: number
        }
        Update: {
          amount_paid?: number
          calculated_amount?: number
          company_id?: string
          created_at?: string
          distributed_by?: string
          distribution_date?: string
          id?: string
          investment_id?: string
          investor_share_percentage?: number
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          profit_period_end?: string
          profit_period_start?: string
          status?: string
          total_company_profit?: number
        }
        Relationships: [
          {
            foreignKeyName: "profit_distributions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profit_distributions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profit_distributions_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
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
          product_sale_id: string | null
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
          product_sale_id?: string | null
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
          product_sale_id?: string | null
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
            foreignKeyName: "revenues_product_sale_id_fkey"
            columns: ["product_sale_id"]
            isOneToOne: false
            referencedRelation: "product_sales"
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
      stakeholders: {
        Row: {
          address: string | null
          category: string
          company_id: string
          contact_number: string | null
          created_at: string
          email: string | null
          id: string
          id_number: string | null
          name: string
          relationship_notes: string | null
          stakeholder_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          category?: string
          company_id: string
          contact_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          id_number?: string | null
          name: string
          relationship_notes?: string | null
          stakeholder_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          category?: string
          company_id?: string
          contact_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          id_number?: string | null
          name?: string
          relationship_notes?: string | null
          stakeholder_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      student_batch_history: {
        Row: {
          company_id: string
          from_batch_id: string | null
          id: string
          reason: string | null
          student_id: string
          to_batch_id: string | null
          transferred_at: string
          transferred_by: string
        }
        Insert: {
          company_id: string
          from_batch_id?: string | null
          id?: string
          reason?: string | null
          student_id: string
          to_batch_id?: string | null
          transferred_at?: string
          transferred_by: string
        }
        Update: {
          company_id?: string
          from_batch_id?: string | null
          id?: string
          reason?: string | null
          student_id?: string
          to_batch_id?: string | null
          transferred_at?: string
          transferred_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_batch_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_batch_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_batch_history_from_batch_id_fkey"
            columns: ["from_batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_batch_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_batch_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_batch_history_to_batch_id_fkey"
            columns: ["to_batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
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
          source_id: string | null
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
          source_id?: string | null
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
          source_id?: string | null
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
            foreignKeyName: "student_payments_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "revenue_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      student_siblings: {
        Row: {
          age: number | null
          company_id: string
          contact: string | null
          created_at: string
          id: string
          name: string | null
          occupation_school: string | null
          student_id: string
        }
        Insert: {
          age?: number | null
          company_id: string
          contact?: string | null
          created_at?: string
          id?: string
          name?: string | null
          occupation_school?: string | null
          student_id: string
        }
        Update: {
          age?: number | null
          company_id?: string
          contact?: string | null
          created_at?: string
          id?: string
          name?: string | null
          occupation_school?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_siblings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_siblings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_siblings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_siblings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          aadhar_id_number: string | null
          academic_year: string | null
          address_area: string | null
          address_city: string | null
          address_house: string | null
          address_pin_zip: string | null
          address_state: string | null
          address_street: string | null
          admission_fee_total: number
          alt_contact_number: string | null
          batch_id: string | null
          billing_start_month: string
          blood_group: string | null
          board_university: string | null
          class_grade: string | null
          company_id: string
          course_end_month: string | null
          course_start_month: string | null
          created_at: string
          date_of_birth: string | null
          distance_from_institution: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          enrollment_date: string
          extracurricular_interests: string | null
          father_annual_income: number | null
          father_contact: string | null
          father_name: string | null
          father_occupation: string | null
          gender: string | null
          guardian_contact: string | null
          guardian_name: string | null
          guardian_relationship: string | null
          id: string
          language_proficiency: string | null
          monthly_fee_amount: number
          mother_contact: string | null
          mother_name: string | null
          mother_occupation: string | null
          name: string
          nationality: string | null
          notes: string | null
          perm_address_area: string | null
          perm_address_city: string | null
          perm_address_house: string | null
          perm_address_pin_zip: string | null
          perm_address_state: string | null
          perm_address_street: string | null
          permanent_address_same: boolean | null
          phone: string | null
          previous_percentage: string | null
          previous_qualification: string | null
          previous_school: string | null
          religion_category: string | null
          roll_number: string | null
          section_division: string | null
          special_needs_medical: string | null
          status: Database["public"]["Enums"]["student_status"]
          student_id_number: string | null
          transportation_mode: string | null
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          aadhar_id_number?: string | null
          academic_year?: string | null
          address_area?: string | null
          address_city?: string | null
          address_house?: string | null
          address_pin_zip?: string | null
          address_state?: string | null
          address_street?: string | null
          admission_fee_total?: number
          alt_contact_number?: string | null
          batch_id?: string | null
          billing_start_month: string
          blood_group?: string | null
          board_university?: string | null
          class_grade?: string | null
          company_id: string
          course_end_month?: string | null
          course_start_month?: string | null
          created_at?: string
          date_of_birth?: string | null
          distance_from_institution?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          enrollment_date: string
          extracurricular_interests?: string | null
          father_annual_income?: number | null
          father_contact?: string | null
          father_name?: string | null
          father_occupation?: string | null
          gender?: string | null
          guardian_contact?: string | null
          guardian_name?: string | null
          guardian_relationship?: string | null
          id?: string
          language_proficiency?: string | null
          monthly_fee_amount?: number
          mother_contact?: string | null
          mother_name?: string | null
          mother_occupation?: string | null
          name: string
          nationality?: string | null
          notes?: string | null
          perm_address_area?: string | null
          perm_address_city?: string | null
          perm_address_house?: string | null
          perm_address_pin_zip?: string | null
          perm_address_state?: string | null
          perm_address_street?: string | null
          permanent_address_same?: boolean | null
          phone?: string | null
          previous_percentage?: string | null
          previous_qualification?: string | null
          previous_school?: string | null
          religion_category?: string | null
          roll_number?: string | null
          section_division?: string | null
          special_needs_medical?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_id_number?: string | null
          transportation_mode?: string | null
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          aadhar_id_number?: string | null
          academic_year?: string | null
          address_area?: string | null
          address_city?: string | null
          address_house?: string | null
          address_pin_zip?: string | null
          address_state?: string | null
          address_street?: string | null
          admission_fee_total?: number
          alt_contact_number?: string | null
          batch_id?: string | null
          billing_start_month?: string
          blood_group?: string | null
          board_university?: string | null
          class_grade?: string | null
          company_id?: string
          course_end_month?: string | null
          course_start_month?: string | null
          created_at?: string
          date_of_birth?: string | null
          distance_from_institution?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          enrollment_date?: string
          extracurricular_interests?: string | null
          father_annual_income?: number | null
          father_contact?: string | null
          father_name?: string | null
          father_occupation?: string | null
          gender?: string | null
          guardian_contact?: string | null
          guardian_name?: string | null
          guardian_relationship?: string | null
          id?: string
          language_proficiency?: string | null
          monthly_fee_amount?: number
          mother_contact?: string | null
          mother_name?: string | null
          mother_occupation?: string | null
          name?: string
          nationality?: string | null
          notes?: string | null
          perm_address_area?: string | null
          perm_address_city?: string | null
          perm_address_house?: string | null
          perm_address_pin_zip?: string | null
          perm_address_state?: string | null
          perm_address_street?: string | null
          permanent_address_same?: boolean | null
          phone?: string | null
          previous_percentage?: string | null
          previous_qualification?: string | null
          previous_school?: string | null
          religion_category?: string | null
          roll_number?: string | null
          section_division?: string | null
          special_needs_medical?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_id_number?: string | null
          transportation_mode?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
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
      suppliers: {
        Row: {
          address: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          status: string
          supplier_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string
          supplier_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string
          supplier_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_company_id_fkey"
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
          address: string | null
          alt_phone: string | null
          avatar_url: string | null
          bio: string | null
          business_name: string | null
          city: string | null
          country: string | null
          created_at: string
          currency: string
          date_of_birth: string | null
          department: string | null
          email: string | null
          employee_id: string | null
          fiscal_year_start_month: number
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_company_id?: string | null
          address?: string | null
          alt_phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          employee_id?: string | null
          fiscal_year_start_month?: number
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_company_id?: string | null
          address?: string | null
          alt_phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          employee_id?: string | null
          fiscal_year_start_month?: number
          full_name?: string | null
          id?: string
          phone?: string | null
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
      students_safe: {
        Row: {
          academic_year: string | null
          admission_fee_total: number | null
          batch_id: string | null
          billing_start_month: string | null
          class_grade: string | null
          company_id: string | null
          course_end_month: string | null
          course_start_month: string | null
          created_at: string | null
          enrollment_date: string | null
          gender: string | null
          id: string | null
          monthly_fee_amount: number | null
          name: string | null
          notes: string | null
          roll_number: string | null
          section_division: string | null
          status: Database["public"]["Enums"]["student_status"] | null
          student_id_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          academic_year?: string | null
          admission_fee_total?: number | null
          batch_id?: string | null
          billing_start_month?: string | null
          class_grade?: string | null
          company_id?: string | null
          course_end_month?: string | null
          course_start_month?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          gender?: string | null
          id?: string | null
          monthly_fee_amount?: number | null
          name?: string | null
          notes?: string | null
          roll_number?: string | null
          section_division?: string | null
          status?: Database["public"]["Enums"]["student_status"] | null
          student_id_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          academic_year?: string | null
          admission_fee_total?: number | null
          batch_id?: string | null
          billing_start_month?: string | null
          class_grade?: string | null
          company_id?: string | null
          course_end_month?: string | null
          course_start_month?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          gender?: string | null
          id?: string | null
          monthly_fee_amount?: number | null
          name?: string | null
          notes?: string | null
          roll_number?: string | null
          section_division?: string | null
          status?: Database["public"]["Enums"]["student_status"] | null
          student_id_number?: string | null
          updated_at?: string | null
          user_id?: string | null
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
    }
    Functions: {
      browse_companies_safe: {
        Args: never
        Returns: {
          description: string
          id: string
          logo_url: string
          name: string
          slug: string
        }[]
      }
      can_add_expense: { Args: { _user_id: string }; Returns: boolean }
      can_add_expense_source: { Args: { _user_id: string }; Returns: boolean }
      can_add_revenue: { Args: { _user_id: string }; Returns: boolean }
      can_edit_delete: { Args: { _user_id: string }; Returns: boolean }
      can_transfer: { Args: { _user_id: string }; Returns: boolean }
      can_view_user: { Args: { _target_user_id: string }; Returns: boolean }
      check_student_duplicates_single: {
        Args: {
          _aadhar?: string
          _company_id: string
          _email?: string
          _exclude_student_id?: string
          _name?: string
          _phone?: string
        }
        Returns: {
          match_criteria: string
          student_id: string
          student_name: string
        }[]
      }
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
      company_can_manage_employees: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_transfer: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      company_can_view_employees: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      find_duplicate_students: {
        Args: { _company_id: string }
        Returns: {
          group_id: number
          is_primary: boolean
          match_criteria: string
          student_id: string
        }[]
      }
      get_active_company_id: { Args: { _user_id: string }; Returns: string }
      get_cipher_user_ids: { Args: never; Returns: string[] }
      get_company_members_filtered: {
        Args: { _company_id: string }
        Returns: {
          approved_by: string | null
          can_add_expense: boolean
          can_add_expense_source: boolean
          can_add_revenue: boolean
          can_manage_students: boolean
          can_transfer: boolean
          can_view_employees: boolean
          can_view_reports: boolean
          company_id: string
          data_entry_mode: boolean
          deo_batches: boolean
          deo_courses: boolean
          deo_finance: boolean
          deo_payments: boolean
          deo_students: boolean
          id: string
          joined_at: string
          mod_batches_add: boolean
          mod_batches_delete: boolean
          mod_batches_edit: boolean
          mod_courses_add: boolean
          mod_courses_delete: boolean
          mod_courses_edit: boolean
          mod_expenses_add: boolean
          mod_expenses_delete: boolean
          mod_expenses_edit: boolean
          mod_payments_add: boolean
          mod_payments_delete: boolean
          mod_payments_edit: boolean
          mod_revenue_add: boolean
          mod_revenue_delete: boolean
          mod_revenue_edit: boolean
          mod_students_add: boolean
          mod_students_delete: boolean
          mod_students_edit: boolean
          role: Database["public"]["Enums"]["company_role"]
          status: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "company_memberships"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
      is_data_entry_moderator: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "cipher" | "admin" | "moderator" | "user"
      company_role: "admin" | "moderator" | "viewer" | "data_entry_operator"
      student_status:
        | "active"
        | "inactive"
        | "graduated"
        | "dropout"
        | "transferred"
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
      student_status: [
        "active",
        "inactive",
        "graduated",
        "dropout",
        "transferred",
      ],
    },
  },
} as const
