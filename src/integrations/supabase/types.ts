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
      activity_employee_months: {
        Row: {
          activity_type_id: string
          created_at: string
          employee_id: string
          hours: number
          id: string
          month: number
          tenant_id: string
          updated_at: string
          year: number
        }
        Insert: {
          activity_type_id: string
          created_at?: string
          employee_id: string
          hours?: number
          id?: string
          month: number
          tenant_id: string
          updated_at?: string
          year: number
        }
        Update: {
          activity_type_id?: string
          created_at?: string
          employee_id?: string
          hours?: number
          id?: string
          month?: number
          tenant_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_employee_months_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_employee_months_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_employee_months_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_timesheet_edit_logs: {
        Row: {
          activity_timesheet_id: string
          edited_at: string
          edited_by: string
          id: string
          justification: string
          new_hours: number
          previous_hours: number
          reason_code: string
        }
        Insert: {
          activity_timesheet_id: string
          edited_at?: string
          edited_by: string
          id?: string
          justification: string
          new_hours: number
          previous_hours: number
          reason_code: string
        }
        Update: {
          activity_timesheet_id?: string
          edited_at?: string
          edited_by?: string
          id?: string
          justification?: string
          new_hours?: number
          previous_hours?: number
          reason_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_timesheet_edit_logs_activity_timesheet_id_fkey"
            columns: ["activity_timesheet_id"]
            isOneToOne: false
            referencedRelation: "activity_timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_timesheets: {
        Row: {
          activity_type_id: string
          created_at: string
          description: string | null
          employee_id: string
          hours: number
          id: string
          is_locked: boolean
          tenant_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          activity_type_id: string
          created_at?: string
          description?: string | null
          employee_id: string
          hours?: number
          id?: string
          is_locked?: boolean
          tenant_id: string
          updated_at?: string
          work_date: string
        }
        Update: {
          activity_type_id?: string
          created_at?: string
          description?: string | null
          employee_id?: string
          hours?: number
          id?: string
          is_locked?: boolean
          tenant_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_timesheets_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_timesheets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_type_employees: {
        Row: {
          activity_type_id: string
          employee_id: string
          id: string
        }
        Insert: {
          activity_type_id: string
          employee_id: string
          id?: string
        }
        Update: {
          activity_type_id?: string
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_type_employees_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_type_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_types: {
        Row: {
          applies_to_all: boolean
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          applies_to_all?: boolean
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          applies_to_all?: boolean
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      benefits: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "benefits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          auth_id: string
          blocked_at: string
        }
        Insert: {
          auth_id: string
          blocked_at?: string
        }
        Update: {
          auth_id?: string
          blocked_at?: string
        }
        Relationships: []
      }
      budget_materials: {
        Row: {
          budget_id: string
          created_at: string
          description: string
          id: string
          material_id: string | null
          value: number
        }
        Insert: {
          budget_id: string
          created_at?: string
          description: string
          id?: string
          material_id?: string | null
          value?: number
        }
        Update: {
          budget_id?: string
          created_at?: string
          description?: string
          id?: string
          material_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_materials_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_role_months: {
        Row: {
          budget_role_id: string
          hours: number
          id: string
          month_number: number
        }
        Insert: {
          budget_role_id: string
          hours?: number
          id?: string
          month_number: number
        }
        Update: {
          budget_role_id?: string
          hours?: number
          id?: string
          month_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_role_months_budget_role_id_fkey"
            columns: ["budget_role_id"]
            isOneToOne: false
            referencedRelation: "budget_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_roles: {
        Row: {
          budget_id: string
          created_at: string
          hourly_rate: number
          id: string
          role_name: string
          role_rate_id: string | null
          seniority: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          hourly_rate?: number
          id?: string
          role_name: string
          role_rate_id?: string | null
          seniority: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          hourly_rate?: number
          id?: string
          role_name?: string
          role_rate_id?: string | null
          seniority?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_roles_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_roles_role_rate_id_fkey"
            columns: ["role_rate_id"]
            isOneToOne: false
            referencedRelation: "role_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_subscriptions: {
        Row: {
          budget_id: string
          created_at: string
          description: string | null
          id: string
          is_recurring: boolean
          monthly_value: number
          name: string
          subscription_id: string | null
        }
        Insert: {
          budget_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          monthly_value?: number
          name: string
          subscription_id?: string | null
        }
        Update: {
          budget_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          monthly_value?: number
          name?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_subscriptions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_subscriptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_suppliers: {
        Row: {
          budget_id: string
          created_at: string
          description: string | null
          id: string
          monthly_value: number
          name: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          description?: string | null
          id?: string
          monthly_value?: number
          name: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          description?: string | null
          id?: string
          monthly_value?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_suppliers_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_versions: {
        Row: {
          budget_id: string
          change_reason: string | null
          change_summary: string | null
          created_at: string
          created_by: string | null
          id: string
          snapshot_data: Json
          version_number: number
        }
        Insert: {
          budget_id: string
          change_reason?: string | null
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot_data: Json
          version_number: number
        }
        Update: {
          budget_id?: string
          change_reason?: string | null
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot_data?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_versions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          admin_expenses_percent: number
          billing_type: string | null
          budget_number: string
          client_id: string | null
          commission_percent: number
          created_at: string
          created_by: string | null
          discount_value: number
          duration_months: number
          expected_revenue_12m: number | null
          final_total: number
          id: string
          is_recurring: boolean
          is_template: boolean
          lead_contact: string | null
          lead_name: string | null
          margin_override_approved: boolean
          margin_override_approved_at: string | null
          margin_override_approved_by: string | null
          margin_override_pending: boolean
          monthly_value: number | null
          net_margin_percent: number
          notes: string | null
          planned_costs: number | null
          project_start_date: string | null
          start_date: string
          status: Database["public"]["Enums"]["budget_status"]
          subtotal: number
          success_fee_percent: number | null
          success_fee_type: string | null
          taxes_percent: number
          template_for_service_id: string | null
          tenant_id: string
          title: string
          total_with_fees: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          admin_expenses_percent?: number
          billing_type?: string | null
          budget_number: string
          client_id?: string | null
          commission_percent?: number
          created_at?: string
          created_by?: string | null
          discount_value?: number
          duration_months?: number
          expected_revenue_12m?: number | null
          final_total?: number
          id?: string
          is_recurring?: boolean
          is_template?: boolean
          lead_contact?: string | null
          lead_name?: string | null
          margin_override_approved?: boolean
          margin_override_approved_at?: string | null
          margin_override_approved_by?: string | null
          margin_override_pending?: boolean
          monthly_value?: number | null
          net_margin_percent?: number
          notes?: string | null
          planned_costs?: number | null
          project_start_date?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["budget_status"]
          subtotal?: number
          success_fee_percent?: number | null
          success_fee_type?: string | null
          taxes_percent?: number
          template_for_service_id?: string | null
          tenant_id: string
          title: string
          total_with_fees?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          admin_expenses_percent?: number
          billing_type?: string | null
          budget_number?: string
          client_id?: string | null
          commission_percent?: number
          created_at?: string
          created_by?: string | null
          discount_value?: number
          duration_months?: number
          expected_revenue_12m?: number | null
          final_total?: number
          id?: string
          is_recurring?: boolean
          is_template?: boolean
          lead_contact?: string | null
          lead_name?: string | null
          margin_override_approved?: boolean
          margin_override_approved_at?: string | null
          margin_override_approved_by?: string | null
          margin_override_pending?: boolean
          monthly_value?: number | null
          net_margin_percent?: number
          notes?: string | null
          planned_costs?: number | null
          project_start_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["budget_status"]
          subtotal?: number
          success_fee_percent?: number | null
          success_fee_type?: string | null
          taxes_percent?: number
          template_for_service_id?: string | null
          tenant_id?: string
          title?: string
          total_with_fees?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_template_for_service_id_fkey"
            columns: ["template_for_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          company_name: string
          complemento: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          estado: string | null
          id: string
          logo_url: string | null
          logradouro: string | null
          notes: string | null
          numero: string | null
          segment: string | null
          status: string
          tenant_id: string
          trading_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          company_name: string
          complemento?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          logo_url?: string | null
          logradouro?: string | null
          notes?: string | null
          numero?: string | null
          segment?: string | null
          status?: string
          tenant_id: string
          trading_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          company_name?: string
          complemento?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          logo_url?: string | null
          logradouro?: string | null
          notes?: string | null
          numero?: string | null
          segment?: string | null
          status?: string
          tenant_id?: string
          trading_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_holidays: {
        Row: {
          created_at: string
          fixed_day: number | null
          fixed_month: number | null
          holiday_type: string
          id: string
          is_active: boolean
          name: string
          reference_year: number | null
          specific_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fixed_day?: number | null
          fixed_month?: number | null
          holiday_type: string
          id?: string
          is_active?: boolean
          name: string
          reference_year?: number | null
          specific_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fixed_day?: number | null
          fixed_month?: number | null
          holiday_type?: string
          id?: string
          is_active?: boolean
          name?: string
          reference_year?: number | null
          specific_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_holidays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_benefits: {
        Row: {
          created_at: string
          description: string | null
          employee_id: string
          id: string
          is_active: boolean
          monthly_value: number
          name: string
          origin: string
          origin_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          employee_id: string
          id?: string
          is_active?: boolean
          monthly_value?: number
          name: string
          origin?: string
          origin_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          employee_id?: string
          id?: string
          is_active?: boolean
          monthly_value?: number
          name?: string
          origin?: string
          origin_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_benefits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_terminations: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          exit_interview_completed: boolean | null
          exit_interview_notes: string | null
          final_payroll_adjustments: Json | null
          id: string
          notice_period_days: number | null
          notice_worked: boolean | null
          notification_date: string | null
          reason: string | null
          reason_category: Database["public"]["Enums"]["termination_reason_category"]
          severance_package: Json | null
          status: Database["public"]["Enums"]["termination_status"]
          termination_date: string
          termination_type: Database["public"]["Enums"]["termination_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          exit_interview_completed?: boolean | null
          exit_interview_notes?: string | null
          final_payroll_adjustments?: Json | null
          id?: string
          notice_period_days?: number | null
          notice_worked?: boolean | null
          notification_date?: string | null
          reason?: string | null
          reason_category?: Database["public"]["Enums"]["termination_reason_category"]
          severance_package?: Json | null
          status?: Database["public"]["Enums"]["termination_status"]
          termination_date: string
          termination_type: Database["public"]["Enums"]["termination_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          exit_interview_completed?: boolean | null
          exit_interview_notes?: string | null
          final_payroll_adjustments?: Json | null
          id?: string
          notice_period_days?: number | null
          notice_worked?: boolean | null
          notification_date?: string | null
          reason?: string | null
          reason_category?: Database["public"]["Enums"]["termination_reason_category"]
          severance_package?: Json | null
          status?: Database["public"]["Enums"]["termination_status"]
          termination_date?: string
          termination_type?: Database["public"]["Enums"]["termination_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_terminations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_tools: {
        Row: {
          annual_amount: number
          billing_cycle: string
          created_at: string
          description: string | null
          employee_id: string
          id: string
          is_active: boolean
          monthly_cost: number
          name: string
          updated_at: string
        }
        Insert: {
          annual_amount?: number
          billing_cycle?: string
          created_at?: string
          description?: string | null
          employee_id: string
          id?: string
          is_active?: boolean
          monthly_cost?: number
          name: string
          updated_at?: string
        }
        Update: {
          annual_amount?: number
          billing_cycle?: string
          created_at?: string
          description?: string | null
          employee_id?: string
          id?: string
          is_active?: boolean
          monthly_cost?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_tools_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_versions: {
        Row: {
          bank_account: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_name: string | null
          beneficios: number
          bolsa_auxilio: number | null
          breakdown_json: Json | null
          cargo: string
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_nascimento: string | null
          decimo_terceiro: number
          dividendos: number | null
          effective_from: string
          effective_until: string | null
          employee_id: string
          encargos: number
          ferias: number
          fgts: number
          foto_url: string | null
          id: string
          inss_empresa: number
          is_gerente: boolean | null
          jornada_diaria: number
          jornada_mensal: number
          nome: string | null
          pix_key: string | null
          pix_key_type: string | null
          pro_labore: number
          salario_liquido: number
          salario_mensal: number
          system_role: string | null
          telefone: string | null
          tipo_contratacao: string
          total_annual_cost_estimated: number | null
          total_benefits_cost: number | null
          total_monthly_cost_estimated: number | null
          total_tools_cost: number | null
          valor_contrato_pj: number | null
        }
        Insert: {
          bank_account?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          beneficios?: number
          bolsa_auxilio?: number | null
          breakdown_json?: Json | null
          cargo: string
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          decimo_terceiro?: number
          dividendos?: number | null
          effective_from?: string
          effective_until?: string | null
          employee_id: string
          encargos?: number
          ferias?: number
          fgts?: number
          foto_url?: string | null
          id?: string
          inss_empresa?: number
          is_gerente?: boolean | null
          jornada_diaria?: number
          jornada_mensal?: number
          nome?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pro_labore?: number
          salario_liquido?: number
          salario_mensal?: number
          system_role?: string | null
          telefone?: string | null
          tipo_contratacao?: string
          total_annual_cost_estimated?: number | null
          total_benefits_cost?: number | null
          total_monthly_cost_estimated?: number | null
          total_tools_cost?: number | null
          valor_contrato_pj?: number | null
        }
        Update: {
          bank_account?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          beneficios?: number
          bolsa_auxilio?: number | null
          breakdown_json?: Json | null
          cargo?: string
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          decimo_terceiro?: number
          dividendos?: number | null
          effective_from?: string
          effective_until?: string | null
          employee_id?: string
          encargos?: number
          ferias?: number
          fgts?: number
          foto_url?: string | null
          id?: string
          inss_empresa?: number
          is_gerente?: boolean | null
          jornada_diaria?: number
          jornada_mensal?: number
          nome?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pro_labore?: number
          salario_liquido?: number
          salario_mensal?: number
          system_role?: string | null
          telefone?: string | null
          tipo_contratacao?: string
          total_annual_cost_estimated?: number | null
          total_benefits_cost?: number | null
          total_monthly_cost_estimated?: number | null
          total_tools_cost?: number | null
          valor_contrato_pj?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_versions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          aloca_em_projetos: boolean
          auth_id: string | null
          bank_account: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_name: string | null
          beneficios: number
          bolsa_auxilio: number
          breakdown_json: Json | null
          candidate_id: string | null
          cargo: string
          cpf: string
          created_at: string
          data_admissao: string
          data_nascimento: string | null
          decimo_terceiro: number
          dividendos: number
          email: string
          encargos: number
          ferias: number
          fgts: number
          foto_url: string | null
          id: string
          inss_empresa: number
          invited_at: string | null
          is_gerente: boolean
          jornada_diaria: number
          jornada_mensal: number
          must_change_password: boolean
          nome: string
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          pix_key: string | null
          pix_key_type: string | null
          pro_labore: number
          provisao_13: number
          provisao_ferias: number
          provisao_recesso: number
          salario_liquido: number
          salario_mensal: number
          status: string
          system_role: string
          telefone: string
          tenant_id: string
          termination_id: string | null
          tipo_contratacao: string
          total_annual_cost_estimated: number
          total_monthly_cost_estimated: number
          updated_at: string
          valor_contrato_pj: number
        }
        Insert: {
          aloca_em_projetos?: boolean
          auth_id?: string | null
          bank_account?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          beneficios?: number
          bolsa_auxilio?: number
          breakdown_json?: Json | null
          candidate_id?: string | null
          cargo: string
          cpf: string
          created_at?: string
          data_admissao: string
          data_nascimento?: string | null
          decimo_terceiro?: number
          dividendos?: number
          email: string
          encargos?: number
          ferias?: number
          fgts?: number
          foto_url?: string | null
          id?: string
          inss_empresa?: number
          invited_at?: string | null
          is_gerente?: boolean
          jornada_diaria?: number
          jornada_mensal?: number
          must_change_password?: boolean
          nome: string
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pro_labore?: number
          provisao_13?: number
          provisao_ferias?: number
          provisao_recesso?: number
          salario_liquido?: number
          salario_mensal?: number
          status?: string
          system_role?: string
          telefone: string
          tenant_id: string
          termination_id?: string | null
          tipo_contratacao?: string
          total_annual_cost_estimated?: number
          total_monthly_cost_estimated?: number
          updated_at?: string
          valor_contrato_pj?: number
        }
        Update: {
          aloca_em_projetos?: boolean
          auth_id?: string | null
          bank_account?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          beneficios?: number
          bolsa_auxilio?: number
          breakdown_json?: Json | null
          candidate_id?: string | null
          cargo?: string
          cpf?: string
          created_at?: string
          data_admissao?: string
          data_nascimento?: string | null
          decimo_terceiro?: number
          dividendos?: number
          email?: string
          encargos?: number
          ferias?: number
          fgts?: number
          foto_url?: string | null
          id?: string
          inss_empresa?: number
          invited_at?: string | null
          is_gerente?: boolean
          jornada_diaria?: number
          jornada_mensal?: number
          must_change_password?: boolean
          nome?: string
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          pro_labore?: number
          provisao_13?: number
          provisao_ferias?: number
          provisao_recesso?: number
          salario_liquido?: number
          salario_mensal?: number
          status?: string
          system_role?: string
          telefone?: string
          tenant_id?: string
          termination_id?: string | null
          tipo_contratacao?: string
          total_annual_cost_estimated?: number
          total_monthly_cost_estimated?: number
          updated_at?: string
          valor_contrato_pj?: number
        }
        Relationships: [
          {
            foreignKeyName: "employees_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_termination_id_fkey"
            columns: ["termination_id"]
            isOneToOne: false
            referencedRelation: "employee_terminations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_settings: {
        Row: {
          admin_expenses_percent: number
          commission_percent: number
          created_at: string
          gross_margin_target_percent: number | null
          id: string
          margin_tolerance_pp: number
          net_margin_percent: number
          taxes_percent: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          admin_expenses_percent?: number
          commission_percent?: number
          created_at?: string
          gross_margin_target_percent?: number | null
          id?: string
          margin_tolerance_pp?: number
          net_margin_percent?: number
          taxes_percent?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          admin_expenses_percent?: number
          commission_percent?: number
          created_at?: string
          gross_margin_target_percent?: number | null
          id?: string
          margin_tolerance_pp?: number
          net_margin_percent?: number
          taxes_percent?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          date: string
          id: string
          is_national: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_national?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_national?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          created_at: string
          curriculo_nome: string | null
          curriculo_url: string | null
          email: string
          id: string
          justificativa_movimentacao: string | null
          linkedin: string | null
          motivacao: string
          nome: string
          responsavel_id: string | null
          status: string
          telefone: string
          tenant_id: string
          vaga_id: string | null
          vaga_pretendida: string | null
          vaga_titulo: string | null
        }
        Insert: {
          created_at?: string
          curriculo_nome?: string | null
          curriculo_url?: string | null
          email: string
          id?: string
          justificativa_movimentacao?: string | null
          linkedin?: string | null
          motivacao: string
          nome: string
          responsavel_id?: string | null
          status?: string
          telefone: string
          tenant_id: string
          vaga_id?: string | null
          vaga_pretendida?: string | null
          vaga_titulo?: string | null
        }
        Update: {
          created_at?: string
          curriculo_nome?: string | null
          curriculo_url?: string | null
          email?: string
          id?: string
          justificativa_movimentacao?: string | null
          linkedin?: string | null
          motivacao?: string
          nome?: string
          responsavel_id?: string | null
          status?: string
          telefone?: string
          tenant_id?: string
          vaga_id?: string | null
          vaga_pretendida?: string | null
          vaga_titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_openings: {
        Row: {
          area: string
          beneficios: string | null
          created_at: string
          created_by: string | null
          diferenciais: string | null
          id: string
          localizacao: string | null
          modalidade: string
          nao_divulgar_salario: boolean
          prazo_candidaturas: string | null
          public_url: string | null
          regime_contratacao: string
          requisitos_obrigatorios: string
          responsabilidades: string
          responsavel_id: string | null
          salario_ate: number | null
          salario_de: number | null
          senioridade: string | null
          sobre_a_vaga: string
          sobre_empresa: string
          status: string
          tenant_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          area: string
          beneficios?: string | null
          created_at?: string
          created_by?: string | null
          diferenciais?: string | null
          id?: string
          localizacao?: string | null
          modalidade: string
          nao_divulgar_salario?: boolean
          prazo_candidaturas?: string | null
          public_url?: string | null
          regime_contratacao: string
          requisitos_obrigatorios: string
          responsabilidades: string
          responsavel_id?: string | null
          salario_ate?: number | null
          salario_de?: number | null
          senioridade?: string | null
          sobre_a_vaga: string
          sobre_empresa: string
          status?: string
          tenant_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          area?: string
          beneficios?: string | null
          created_at?: string
          created_by?: string | null
          diferenciais?: string | null
          id?: string
          localizacao?: string | null
          modalidade?: string
          nao_divulgar_salario?: boolean
          prazo_candidaturas?: string | null
          public_url?: string | null
          regime_contratacao?: string
          requisitos_obrigatorios?: string
          responsabilidades?: string
          responsavel_id?: string | null
          salario_ate?: number | null
          salario_de?: number | null
          senioridade?: string | null
          sobre_a_vaga?: string
          sobre_empresa?: string
          status?: string
          tenant_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      key_result_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          confidence_level: string | null
          current_value: number | null
          id: string
          key_result_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          confidence_level?: string | null
          current_value?: number | null
          id?: string
          key_result_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          confidence_level?: string | null
          current_value?: number | null
          id?: string
          key_result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_result_history_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "project_key_results"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          lead_id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          lead_id: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          lead_id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activity_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activity_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_follow_ups: {
        Row: {
          assigned_to: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          lead_id: string
          notified: boolean
          scheduled_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          lead_id: string
          notified?: boolean
          scheduled_at: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          lead_id?: string
          notified?: boolean
          scheduled_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_follow_ups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_follow_ups_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_follow_ups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          attachments: Json
          channel: string
          created_at: string
          created_by: string | null
          id: string
          interaction_date: string
          lead_id: string
          message: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attachments?: Json
          channel: string
          created_at?: string
          created_by?: string | null
          id?: string
          interaction_date: string
          lead_id: string
          message: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attachments?: Json
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          interaction_date?: string
          lead_id?: string
          message?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interactions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_services: {
        Row: {
          created_at: string
          custom_billing_unit: string | null
          custom_value: number | null
          id: string
          lead_id: string
          notes: string | null
          service_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_billing_unit?: string | null
          custom_value?: number | null
          id?: string
          lead_id: string
          notes?: string | null
          service_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_billing_unit?: string | null
          custom_value?: number | null
          id?: string
          lead_id?: string
          notes?: string | null
          service_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_services_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          archive_notes: string | null
          archive_reason: string | null
          archived: boolean
          archived_at: string | null
          budget_id: string | null
          client_id: string | null
          closed_at: string | null
          company_name: string | null
          competitor_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          crm_stage: string
          estimated_value: number
          id: string
          name: string
          notes: string | null
          responsible_id: string | null
          restored_at: string | null
          service_line: string | null
          source: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archive_notes?: string | null
          archive_reason?: string | null
          archived?: boolean
          archived_at?: string | null
          budget_id?: string | null
          client_id?: string | null
          closed_at?: string | null
          company_name?: string | null
          competitor_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          crm_stage?: string
          estimated_value?: number
          id?: string
          name: string
          notes?: string | null
          responsible_id?: string | null
          restored_at?: string | null
          service_line?: string | null
          source?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archive_notes?: string | null
          archive_reason?: string | null
          archived?: boolean
          archived_at?: string | null
          budget_id?: string | null
          client_id?: string | null
          closed_at?: string | null
          company_name?: string | null
          competitor_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          crm_stage?: string
          estimated_value?: number
          id?: string
          name?: string
          notes?: string | null
          responsible_id?: string | null
          restored_at?: string | null
          service_line?: string | null
          source?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      market_analyses: {
        Row: {
          chat_history: Json | null
          created_at: string
          form_data: Json
          id: string
          module: string
          module_label: string
          pdf_url: string | null
          result_markdown: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_history?: Json | null
          created_at?: string
          form_data: Json
          id?: string
          module: string
          module_label: string
          pdf_url?: string | null
          result_markdown: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_history?: Json | null
          created_at?: string
          form_data?: Json
          id?: string
          module?: string
          module_label?: string
          pdf_url?: string | null
          result_markdown?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_analyses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      market_analysis_jobs: {
        Row: {
          created_at: string | null
          error_message: string | null
          form_data: Json
          id: string
          module: string
          module_label: string
          result_markdown: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          form_data: Json
          id?: string
          module: string
          module_label: string
          result_markdown?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          form_data?: Json
          id?: string
          module?: string
          module_label?: string
          result_markdown?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          notes: string | null
          sku: string | null
          status: string
          tenant_id: string
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          sku?: string | null
          status?: string
          tenant_id: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          sku?: string | null
          status?: string
          tenant_id?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_type: string | null
          action_url: string | null
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          is_archived: boolean
          is_read: boolean
          is_resolved: boolean
          message: string | null
          metadata: Json | null
          priority: string
          read_at: string | null
          recipient_id: string
          reference_id: string | null
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          action_type?: string | null
          action_url?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean
          is_resolved?: boolean
          message?: string | null
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          recipient_id: string
          reference_id?: string | null
          tenant_id: string
          title: string
          type: string
        }
        Update: {
          action_type?: string | null
          action_url?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean
          is_resolved?: boolean
          message?: string | null
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          recipient_id?: string
          reference_id?: string | null
          tenant_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      payroll_adjustments: {
        Row: {
          adjustment_type: Database["public"]["Enums"]["payroll_adjustment_type"]
          amount: number
          calculation_details: Json | null
          created_at: string
          description: string | null
          id: string
          is_credit: boolean
          termination_id: string
        }
        Insert: {
          adjustment_type: Database["public"]["Enums"]["payroll_adjustment_type"]
          amount?: number
          calculation_details?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_credit?: boolean
          termination_id: string
        }
        Update: {
          adjustment_type?: Database["public"]["Enums"]["payroll_adjustment_type"]
          amount?: number
          calculation_details?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_credit?: boolean
          termination_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_termination_id_fkey"
            columns: ["termination_id"]
            isOneToOne: false
            referencedRelation: "employee_terminations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_profiles: {
        Row: {
          apply_fgts_on_13th: boolean
          apply_fgts_on_vacation: boolean
          apply_inss_on_13th: boolean
          apply_inss_on_vacation: boolean
          apply_outros_on_13th: boolean
          apply_outros_on_vacation: boolean
          apply_rat_on_13th: boolean
          apply_rat_on_vacation: boolean
          apply_terceiros_on_13th: boolean
          apply_terceiros_on_vacation: boolean
          created_at: string
          fgts_prolabore_rate: number
          fgts_rate_apprentice: number
          fgts_rate_clt: number
          id: string
          inss_patronal_prolabore_rate: number
          inss_patronal_rate: number
          outros_rate: number
          rat_rate: number
          tenant_id: string
          terceiros_rate: number
          updated_at: string
        }
        Insert: {
          apply_fgts_on_13th?: boolean
          apply_fgts_on_vacation?: boolean
          apply_inss_on_13th?: boolean
          apply_inss_on_vacation?: boolean
          apply_outros_on_13th?: boolean
          apply_outros_on_vacation?: boolean
          apply_rat_on_13th?: boolean
          apply_rat_on_vacation?: boolean
          apply_terceiros_on_13th?: boolean
          apply_terceiros_on_vacation?: boolean
          created_at?: string
          fgts_prolabore_rate?: number
          fgts_rate_apprentice?: number
          fgts_rate_clt?: number
          id?: string
          inss_patronal_prolabore_rate?: number
          inss_patronal_rate?: number
          outros_rate?: number
          rat_rate?: number
          tenant_id: string
          terceiros_rate?: number
          updated_at?: string
        }
        Update: {
          apply_fgts_on_13th?: boolean
          apply_fgts_on_vacation?: boolean
          apply_inss_on_13th?: boolean
          apply_inss_on_vacation?: boolean
          apply_outros_on_13th?: boolean
          apply_outros_on_vacation?: boolean
          apply_rat_on_13th?: boolean
          apply_rat_on_vacation?: boolean
          apply_terceiros_on_13th?: boolean
          apply_terceiros_on_vacation?: boolean
          created_at?: string
          fgts_prolabore_rate?: number
          fgts_rate_apprentice?: number
          fgts_rate_clt?: number
          id?: string
          inss_patronal_prolabore_rate?: number
          inss_patronal_rate?: number
          outros_rate?: number
          rat_rate?: number
          tenant_id?: string
          terceiros_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_kanban_card_tags: {
        Row: {
          card_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_kanban_card_tags_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "personal_kanban_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_kanban_card_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "personal_kanban_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_kanban_cards: {
        Row: {
          column_id: string
          created_at: string
          description: string | null
          due_date: string | null
          employee_id: string
          id: string
          position: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          column_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          position?: number
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          column_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          position?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_kanban_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "personal_kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_kanban_cards_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_kanban_columns: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          name: string
          position: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          name: string
          position?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          name?: string
          position?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_kanban_columns_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_kanban_tags: {
        Row: {
          color: string
          created_at: string
          employee_id: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          employee_id: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          color?: string
          created_at?: string
          employee_id?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_kanban_tags_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_card_checklist: {
        Row: {
          card_id: string
          created_at: string
          id: string
          is_checked: boolean
          item_text: string
          position: number
          type: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          is_checked?: boolean
          item_text: string
          position?: number
          type: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          is_checked?: boolean
          item_text?: string
          position?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_card_checklist_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "project_activity_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_card_history: {
        Row: {
          card_id: string
          changed_at: string
          changed_by: string | null
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          tenant_id: string
        }
        Insert: {
          card_id: string
          changed_at?: string
          changed_by?: string | null
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          tenant_id: string
        }
        Update: {
          card_id?: string
          changed_at?: string
          changed_by?: string | null
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_card_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "project_activity_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_card_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_card_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_card_tags: {
        Row: {
          card_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_card_tags_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "project_activity_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_card_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "project_activity_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_cards: {
        Row: {
          acceptance_criteria: string | null
          archived_at: string | null
          archived_by: string | null
          assignee_id: string | null
          blocked_reason: string | null
          card_number: number | null
          card_type: string
          column_name: string
          created_at: string
          created_by: string
          id: string
          is_archived: boolean
          is_blocked: boolean
          points: number | null
          position: number
          project_id: string
          release_id: string | null
          sprint_id: string | null
          target_sprint_id: string | null
          tenant_id: string
          title: string
          updated_at: string
          user_story: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assignee_id?: string | null
          blocked_reason?: string | null
          card_number?: number | null
          card_type?: string
          column_name?: string
          created_at?: string
          created_by: string
          id?: string
          is_archived?: boolean
          is_blocked?: boolean
          points?: number | null
          position?: number
          project_id: string
          release_id?: string | null
          sprint_id?: string | null
          target_sprint_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          user_story?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assignee_id?: string | null
          blocked_reason?: string | null
          card_number?: number | null
          card_type?: string
          column_name?: string
          created_at?: string
          created_by?: string
          id?: string
          is_archived?: boolean
          is_blocked?: boolean
          points?: number | null
          position?: number
          project_id?: string
          release_id?: string | null
          sprint_id?: string | null
          target_sprint_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          user_story?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_cards_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_cards_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_cards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_cards_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "project_activity_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_cards_target_sprint_id_fkey"
            columns: ["target_sprint_id"]
            isOneToOne: false
            referencedRelation: "project_activity_sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_checklist_templates: {
        Row: {
          card_type: string | null
          created_at: string
          id: string
          items: Json
          project_id: string
          tenant_id: string
          type: string
        }
        Insert: {
          card_type?: string | null
          created_at?: string
          id?: string
          items?: Json
          project_id: string
          tenant_id: string
          type: string
        }
        Update: {
          card_type?: string | null
          created_at?: string
          id?: string
          items?: Json
          project_id?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_checklist_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_checklist_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_release_sprints: {
        Row: {
          id: string
          release_id: string
          sprint_id: string
        }
        Insert: {
          id?: string
          release_id: string
          sprint_id: string
        }
        Update: {
          id?: string
          release_id?: string
          sprint_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_release_sprints_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "project_activity_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_release_sprints_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "project_activity_sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_releases: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          released_at: string | null
          status: string
          target_date: string
          tenant_id: string
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          released_at?: string | null
          status?: string
          target_date: string
          tenant_id: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          released_at?: string | null
          status?: string
          target_date?: string
          tenant_id?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_releases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_settings: {
        Row: {
          id: string
          project_id: string
          sprint_duration_weeks: number
          sprint_naming_mode: string
          tenant_id: string
          wip_in_deploy: number | null
          wip_in_dev: number | null
          wip_in_test: number | null
        }
        Insert: {
          id?: string
          project_id: string
          sprint_duration_weeks?: number
          sprint_naming_mode?: string
          tenant_id: string
          wip_in_deploy?: number | null
          wip_in_dev?: number | null
          wip_in_test?: number | null
        }
        Update: {
          id?: string
          project_id?: string
          sprint_duration_weeks?: number
          sprint_naming_mode?: string
          tenant_id?: string
          wip_in_deploy?: number | null
          wip_in_dev?: number | null
          wip_in_test?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_sprints: {
        Row: {
          created_at: string
          end_date: string
          goal: string | null
          id: string
          name: string
          number: number
          project_id: string
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          goal?: string | null
          id?: string
          name: string
          number: number
          project_id: string
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          goal?: string | null
          id?: string
          name?: string
          number?: number
          project_id?: string
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_sprints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          project_id: string
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          project_id: string
          tenant_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity_tasks: {
        Row: {
          assignee_id: string | null
          card_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          position: number
          tenant_id: string
        }
        Insert: {
          assignee_id?: string | null
          card_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description: string
          due_date?: string | null
          id?: string
          position?: number
          tenant_id: string
        }
        Update: {
          assignee_id?: string | null
          card_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          position?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_tasks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "project_activity_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_cards: {
        Row: {
          acceptance_criteria: string | null
          assignee_id: string | null
          blocked_reason: string | null
          card_type: string
          column_name: string
          created_at: string
          created_by: string
          id: string
          is_blocked: boolean
          points: number | null
          position: number
          project_id: string
          sprint_id: string | null
          tenant_id: string
          title: string
          updated_at: string
          user_story: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          assignee_id?: string | null
          blocked_reason?: string | null
          card_type?: string
          column_name?: string
          created_at?: string
          created_by: string
          id?: string
          is_blocked?: boolean
          points?: number | null
          position?: number
          project_id: string
          sprint_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          user_story?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          assignee_id?: string | null
          blocked_reason?: string | null
          card_type?: string
          column_name?: string
          created_at?: string
          created_by?: string
          id?: string
          is_blocked?: boolean
          points?: number | null
          position?: number
          project_id?: string
          sprint_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          user_story?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_cards_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_commissions: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          commission_percent: number
          created_at: string
          id: string
          installment_id: string | null
          is_paid: boolean
          notes: string | null
          paid_date: string | null
          paid_to: string | null
          planned_value: number
          project_id: string
          rejection_reason: string | null
          requested_by: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          commission_percent?: number
          created_at?: string
          id?: string
          installment_id?: string | null
          is_paid?: boolean
          notes?: string | null
          paid_date?: string | null
          paid_to?: string | null
          planned_value?: number
          project_id: string
          rejection_reason?: string | null
          requested_by?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          commission_percent?: number
          created_at?: string
          id?: string
          installment_id?: string | null
          is_paid?: boolean
          notes?: string | null
          paid_date?: string | null
          paid_to?: string | null
          planned_value?: number
          project_id?: string
          rejection_reason?: string | null
          requested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_commissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_commissions_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "project_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_commissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_commissions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      project_cost_months: {
        Row: {
          actual_value: number | null
          cost_id: string
          created_at: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          month_number: number
          notes: string | null
          planned_value: number | null
          updated_at: string
        }
        Insert: {
          actual_value?: number | null
          cost_id: string
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          month_number: number
          notes?: string | null
          planned_value?: number | null
          updated_at?: string
        }
        Update: {
          actual_value?: number | null
          cost_id?: string
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          month_number?: number
          notes?: string | null
          planned_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_cost_months_cost_id_fkey"
            columns: ["cost_id"]
            isOneToOne: false
            referencedRelation: "project_costs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_costs: {
        Row: {
          actual_amount: number | null
          actual_amount_brl: number | null
          budget_supplier_id: string | null
          category: string
          cost_date: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          end_month: number | null
          exchange_rate: number
          id: string
          is_recurring: boolean
          month_number: number | null
          monthly_amount: number | null
          monthly_amount_brl: number | null
          notes: string | null
          original_currency: string
          planned_amount: number
          planned_amount_brl: number
          project_id: string
          start_month: number | null
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          actual_amount_brl?: number | null
          budget_supplier_id?: string | null
          category?: string
          cost_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          end_month?: number | null
          exchange_rate?: number
          id?: string
          is_recurring?: boolean
          month_number?: number | null
          monthly_amount?: number | null
          monthly_amount_brl?: number | null
          notes?: string | null
          original_currency?: string
          planned_amount?: number
          planned_amount_brl?: number
          project_id: string
          start_month?: number | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          actual_amount_brl?: number | null
          budget_supplier_id?: string | null
          category?: string
          cost_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          end_month?: number | null
          exchange_rate?: number
          id?: string
          is_recurring?: boolean
          month_number?: number | null
          monthly_amount?: number | null
          monthly_amount_brl?: number | null
          notes?: string | null
          original_currency?: string
          planned_amount?: number
          planned_amount_brl?: number
          project_id?: string
          start_month?: number | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_costs_budget_supplier_id_fkey"
            columns: ["budget_supplier_id"]
            isOneToOne: false
            referencedRelation: "budget_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_costs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      project_edit_logs: {
        Row: {
          changes_summary: string | null
          edited_at: string
          edited_by: string
          id: string
          justification: string
          project_id: string
        }
        Insert: {
          changes_summary?: string | null
          edited_at?: string
          edited_by: string
          id?: string
          justification: string
          project_id: string
        }
        Update: {
          changes_summary?: string | null
          edited_at?: string
          edited_by?: string
          id?: string
          justification?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_edit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          mime_type: string
          project_id: string
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          project_id: string
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          project_id?: string
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      project_installments: {
        Row: {
          created_at: string
          descricao: string
          due_date: string
          id: string
          installment_number: number
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          payment_date: string | null
          project_id: string
          status: Database["public"]["Enums"]["installment_status"]
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          descricao?: string
          due_date: string
          id?: string
          installment_number: number
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["installment_status"]
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          due_date?: string
          id?: string
          installment_number?: number
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["installment_status"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_installments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_key_results: {
        Row: {
          confidence_level: string | null
          created_at: string | null
          current_value: number | null
          description: string
          id: string
          okr_id: string
          target_value: number | null
          unit: string | null
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string | null
          current_value?: number | null
          description: string
          id?: string
          okr_id: string
          target_value?: number | null
          unit?: string | null
        }
        Update: {
          confidence_level?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string
          id?: string
          okr_id?: string
          target_value?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_key_results_okr_id_fkey"
            columns: ["okr_id"]
            isOneToOne: false
            referencedRelation: "project_okrs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_materials: {
        Row: {
          created_at: string
          description: string
          id: string
          is_realized: boolean
          material_id: string | null
          month_number: number | null
          project_id: string
          purchase_date: string | null
          value: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_realized?: boolean
          material_id?: string | null
          month_number?: number | null
          project_id: string
          purchase_date?: string | null
          value?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_realized?: boolean
          material_id?: string | null
          month_number?: number | null
          project_id?: string
          purchase_date?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_member_months: {
        Row: {
          cost_per_hour: number | null
          hours: number
          id: string
          month_number: number
          project_member_id: string
        }
        Insert: {
          cost_per_hour?: number | null
          hours?: number
          id?: string
          month_number: number
          project_member_id: string
        }
        Update: {
          cost_per_hour?: number | null
          hours?: number
          id?: string
          month_number?: number
          project_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_member_months_project_member_id_fkey"
            columns: ["project_member_id"]
            isOneToOne: false
            referencedRelation: "project_members"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          budget_role_id: string | null
          created_at: string
          employee_id: string | null
          hourly_rate: number
          hours_per_month: number
          id: string
          project_id: string
          role: string
          seniority: string
        }
        Insert: {
          budget_role_id?: string | null
          created_at?: string
          employee_id?: string | null
          hourly_rate?: number
          hours_per_month?: number
          id?: string
          project_id: string
          role: string
          seniority?: string
        }
        Update: {
          budget_role_id?: string | null
          created_at?: string
          employee_id?: string | null
          hourly_rate?: number
          hours_per_month?: number
          id?: string
          project_id?: string
          role?: string
          seniority?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_budget_role_id_fkey"
            columns: ["budget_role_id"]
            isOneToOne: false
            referencedRelation: "budget_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          completed_date: string | null
          created_at: string | null
          deliverables: string | null
          end_date: string
          id: string
          milestone_type: string
          project_id: string
          start_date: string
          status: string | null
          title: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          deliverables?: string | null
          end_date: string
          id?: string
          milestone_type?: string
          project_id: string
          start_date: string
          status?: string | null
          title: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          deliverables?: string | null
          end_date?: string
          id?: string
          milestone_type?: string
          project_id?: string
          start_date?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_okrs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          objective: string
          progress_percent: number | null
          project_id: string
          status: string | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          objective: string
          progress_percent?: number | null
          project_id: string
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          objective?: string
          progress_percent?: number | null
          project_id?: string
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_okrs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_role_allocation_edit_logs: {
        Row: {
          allocation_id: string
          created_at: string
          edited_by: string
          id: string
          justification: string | null
          new_hours: number
          previous_hours: number
          reason_code: string | null
        }
        Insert: {
          allocation_id: string
          created_at?: string
          edited_by: string
          id?: string
          justification?: string | null
          new_hours: number
          previous_hours: number
          reason_code?: string | null
        }
        Update: {
          allocation_id?: string
          created_at?: string
          edited_by?: string
          id?: string
          justification?: string | null
          new_hours?: number
          previous_hours?: number
          reason_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_role_allocation_edit_logs_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "project_role_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_role_allocations: {
        Row: {
          budget_role_id: string | null
          cost_per_hour: number | null
          created_at: string
          custom_role_name: string | null
          employee_id: string
          id: string
          month: number
          planned_hours: number | null
          project_id: string
          tenant_id: string
          updated_at: string
          year: number
        }
        Insert: {
          budget_role_id?: string | null
          cost_per_hour?: number | null
          created_at?: string
          custom_role_name?: string | null
          employee_id: string
          id?: string
          month: number
          planned_hours?: number | null
          project_id: string
          tenant_id: string
          updated_at?: string
          year: number
        }
        Update: {
          budget_role_id?: string | null
          cost_per_hour?: number | null
          created_at?: string
          custom_role_name?: string | null
          employee_id?: string
          id?: string
          month?: number
          planned_hours?: number | null
          project_id?: string
          tenant_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_role_allocations_budget_role_id_fkey"
            columns: ["budget_role_id"]
            isOneToOne: false
            referencedRelation: "budget_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_role_allocations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_role_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stakeholders: {
        Row: {
          action: string | null
          created_at: string | null
          email: string | null
          id: string
          influence_level: string | null
          interest_level: string | null
          job_title: string | null
          name: string
          notes: string | null
          organization: string | null
          phone: string | null
          project_id: string
          role: string
          sponsorship_level: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          influence_level?: string | null
          interest_level?: string | null
          job_title?: string | null
          name: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          project_id: string
          role: string
          sponsorship_level?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          influence_level?: string | null
          interest_level?: string | null
          job_title?: string | null
          name?: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          project_id?: string
          role?: string
          sponsorship_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_stakeholders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_subscriptions: {
        Row: {
          budget_subscription_id: string | null
          created_at: string
          description: string | null
          end_month: number | null
          id: string
          is_realized: boolean
          is_recurring: boolean
          monthly_value: number
          name: string
          project_id: string
          start_month: number
          subscription_id: string | null
        }
        Insert: {
          budget_subscription_id?: string | null
          created_at?: string
          description?: string | null
          end_month?: number | null
          id?: string
          is_realized?: boolean
          is_recurring?: boolean
          monthly_value?: number
          name: string
          project_id: string
          start_month?: number
          subscription_id?: string | null
        }
        Update: {
          budget_subscription_id?: string | null
          created_at?: string
          description?: string | null
          end_month?: number | null
          id?: string
          is_realized?: boolean
          is_recurring?: boolean
          monthly_value?: number
          name?: string
          project_id?: string
          start_month?: number
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_subscriptions_budget_subscription_id_fkey"
            columns: ["budget_subscription_id"]
            isOneToOne: false
            referencedRelation: "budget_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_subscriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_subscriptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_supplier_actuals: {
        Row: {
          created_at: string
          id: string
          invoice_date: string | null
          invoice_number: string | null
          month_number: number
          notes: string | null
          project_supplier_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          month_number: number
          notes?: string | null
          project_supplier_id: string
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          month_number?: number
          notes?: string | null
          project_supplier_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_supplier_actuals_project_supplier_id_fkey"
            columns: ["project_supplier_id"]
            isOneToOne: false
            referencedRelation: "project_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      project_supplier_months: {
        Row: {
          id: string
          month_number: number
          project_supplier_id: string
          value: number
        }
        Insert: {
          id?: string
          month_number: number
          project_supplier_id: string
          value?: number
        }
        Update: {
          id?: string
          month_number?: number
          project_supplier_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_supplier_months_project_supplier_id_fkey"
            columns: ["project_supplier_id"]
            isOneToOne: false
            referencedRelation: "project_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      project_suppliers: {
        Row: {
          budget_supplier_id: string | null
          created_at: string
          description: string | null
          end_month: number | null
          id: string
          monthly_value: number
          name: string
          project_id: string
          start_month: number
          supplier_id: string | null
        }
        Insert: {
          budget_supplier_id?: string | null
          created_at?: string
          description?: string | null
          end_month?: number | null
          id?: string
          monthly_value?: number
          name: string
          project_id: string
          start_month?: number
          supplier_id?: string | null
        }
        Update: {
          budget_supplier_id?: string | null
          created_at?: string
          description?: string | null
          end_month?: number | null
          id?: string
          monthly_value?: number
          name?: string
          project_id?: string
          start_month?: number
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_suppliers_budget_supplier_id_fkey"
            columns: ["budget_supplier_id"]
            isOneToOne: false
            referencedRelation: "budget_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_row_months: {
        Row: {
          id: string
          month: number
          planned_hours: number
          row_id: string
          year: number
        }
        Insert: {
          id?: string
          month: number
          planned_hours?: number
          row_id: string
          year: number
        }
        Update: {
          id?: string
          month?: number
          planned_hours?: number
          row_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_team_row_months_row_id_fkey"
            columns: ["row_id"]
            isOneToOne: false
            referencedRelation: "project_team_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_rows: {
        Row: {
          budget_role_id: string | null
          created_at: string
          custom_role_name: string | null
          deallocated_at: string | null
          deallocated_by: string | null
          employee_id: string | null
          id: string
          project_id: string
          reactivated_at: string | null
          row_type: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          budget_role_id?: string | null
          created_at?: string
          custom_role_name?: string | null
          deallocated_at?: string | null
          deallocated_by?: string | null
          employee_id?: string | null
          id?: string
          project_id: string
          reactivated_at?: string | null
          row_type: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          budget_role_id?: string | null
          created_at?: string
          custom_role_name?: string | null
          deallocated_at?: string | null
          deallocated_by?: string | null
          employee_id?: string | null
          id?: string
          project_id?: string
          reactivated_at?: string | null
          row_type?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_rows_budget_role_id_fkey"
            columns: ["budget_role_id"]
            isOneToOne: false
            referencedRelation: "budget_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_rows_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_rows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_timesheet_submissions: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          total_hours: number | null
          updated_at: string | null
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_hours?: number | null
          updated_at?: string | null
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_hours?: number | null
          updated_at?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_timesheet_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_timesheets: {
        Row: {
          cost_per_hour: number | null
          created_at: string
          created_by: string | null
          description: string | null
          hours: number
          id: string
          is_locked: boolean
          project_id: string
          project_member_id: string
          updated_at: string
          updated_by: string | null
          work_date: string
        }
        Insert: {
          cost_per_hour?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hours?: number
          id?: string
          is_locked?: boolean
          project_id: string
          project_member_id: string
          updated_at?: string
          updated_by?: string | null
          work_date: string
        }
        Update: {
          cost_per_hour?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hours?: number
          id?: string
          is_locked?: boolean
          project_id?: string
          project_member_id?: string
          updated_at?: string
          updated_by?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_timesheets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_timesheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_timesheets_project_member_id_fkey"
            columns: ["project_member_id"]
            isOneToOne: false
            referencedRelation: "project_members"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_id: string | null
          cancellation_notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string
          completed_date: string | null
          contract_url: string | null
          created_at: string
          description: string | null
          due_day: number
          duration_months: number
          end_date: string | null
          first_invoice_date: string | null
          id: string
          installments_count: number
          is_continuous: boolean
          lead_id: string | null
          manager_id: string
          name: string
          payment_method: string
          portfolio_stage: string | null
          renewal_date: string | null
          service_line: string | null
          start_date: string
          status: Database["public"]["Enums"]["project_status"]
          success_fee_percent: number | null
          tenant_id: string
          total_value: number
          updated_at: string
          value_book_url: string | null
        }
        Insert: {
          budget_id?: string | null
          cancellation_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id: string
          completed_date?: string | null
          contract_url?: string | null
          created_at?: string
          description?: string | null
          due_day?: number
          duration_months?: number
          end_date?: string | null
          first_invoice_date?: string | null
          id?: string
          installments_count?: number
          is_continuous?: boolean
          lead_id?: string | null
          manager_id: string
          name: string
          payment_method?: string
          portfolio_stage?: string | null
          renewal_date?: string | null
          service_line?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["project_status"]
          success_fee_percent?: number | null
          tenant_id: string
          total_value?: number
          updated_at?: string
          value_book_url?: string | null
        }
        Update: {
          budget_id?: string | null
          cancellation_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string
          completed_date?: string | null
          contract_url?: string | null
          created_at?: string
          description?: string | null
          due_day?: number
          duration_months?: number
          end_date?: string | null
          first_invoice_date?: string | null
          id?: string
          installments_count?: number
          is_continuous?: boolean
          lead_id?: string | null
          manager_id?: string
          name?: string
          payment_method?: string
          portfolio_stage?: string | null
          renewal_date?: string | null
          service_line?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["project_status"]
          success_fee_percent?: number | null
          tenant_id?: string
          total_value?: number
          updated_at?: string
          value_book_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reimbursement_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          reimbursement_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          reimbursement_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          reimbursement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reimbursement_attachments_reimbursement_id_fkey"
            columns: ["reimbursement_id"]
            isOneToOne: false
            referencedRelation: "reimbursement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reimbursement_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          expense_date: string
          id: string
          reimbursement_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          expense_date: string
          id?: string
          reimbursement_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          reimbursement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reimbursement_items_reimbursement_id_fkey"
            columns: ["reimbursement_id"]
            isOneToOne: false
            referencedRelation: "reimbursement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reimbursement_requests: {
        Row: {
          client_id: string | null
          corrected_from_id: string | null
          created_at: string
          description: string | null
          id: string
          is_internal: boolean
          paid_at: string | null
          paid_by: string | null
          project_id: string | null
          rejection_reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          corrected_from_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_internal?: boolean
          paid_at?: string | null
          paid_by?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          corrected_from_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_internal?: boolean
          paid_at?: string | null
          paid_by?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reimbursement_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimbursement_requests_corrected_from_id_fkey"
            columns: ["corrected_from_id"]
            isOneToOne: false
            referencedRelation: "reimbursement_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimbursement_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimbursement_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimbursement_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimbursement_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_rates: {
        Row: {
          created_at: string
          description: string | null
          hourly_rate: number
          id: string
          is_active: boolean
          role_name: string
          seniority: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hourly_rate?: number
          id?: string
          is_active?: boolean
          role_name: string
          seniority: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hourly_rate?: number
          id?: string
          is_active?: boolean
          role_name?: string
          seniority?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_lines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_revenue_models: {
        Row: {
          base_value: number | null
          billing_unit: string | null
          created_at: string
          id: string
          is_active: boolean
          model_type: string
          name: string
          service_id: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          base_value?: number | null
          billing_unit?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          model_type: string
          name: string
          service_id: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          base_value?: number | null
          billing_unit?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          model_type?: string
          name?: string
          service_id?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_revenue_models_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_revenue_models_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          billing_type: string | null
          billing_unit: string | null
          created_at: string
          default_value: number | null
          description: string | null
          has_default_value: boolean
          id: string
          is_active: boolean
          name: string
          project_type: string
          service_line_id: string | null
          template_budget_id: string | null
          tenant_id: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          billing_type?: string | null
          billing_unit?: string | null
          created_at?: string
          default_value?: number | null
          description?: string | null
          has_default_value?: boolean
          id?: string
          is_active?: boolean
          name: string
          project_type: string
          service_line_id?: string | null
          template_budget_id?: string | null
          tenant_id: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          billing_type?: string | null
          billing_unit?: string | null
          created_at?: string
          default_value?: number | null
          description?: string | null
          has_default_value?: boolean
          id?: string
          is_active?: boolean
          name?: string
          project_type?: string
          service_line_id?: string | null
          template_budget_id?: string | null
          tenant_id?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_service_line_id_fkey"
            columns: ["service_line_id"]
            isOneToOne: false
            referencedRelation: "service_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_template_budget_id_fkey"
            columns: ["template_budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_checkins: {
        Row: {
          checkin_date: string
          confidence: number
          created_at: string
          created_by: string | null
          current_value: number
          id: string
          key_result_id: string
          notes: string | null
          tenant_id: string
        }
        Insert: {
          checkin_date?: string
          confidence: number
          created_at?: string
          created_by?: string | null
          current_value: number
          id?: string
          key_result_id: string
          notes?: string | null
          tenant_id: string
        }
        Update: {
          checkin_date?: string
          confidence?: number
          created_at?: string
          created_by?: string | null
          current_value?: number
          id?: string
          key_result_id?: string
          notes?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_checkins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_checkins_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "strategy_key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_checkins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_cycles: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          start_date: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_cycles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_guardrails: {
        Row: {
          created_at: string
          current_value: number | null
          cycle_id: string
          description: string | null
          id: string
          operator: string
          tenant_id: string
          threshold: number
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          cycle_id: string
          description?: string | null
          id?: string
          operator?: string
          tenant_id: string
          threshold: number
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          cycle_id?: string
          description?: string | null
          id?: string
          operator?: string
          tenant_id?: string
          threshold?: number
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_guardrails_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "strategy_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_initiatives: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          due_date_notes: string | null
          effort: number | null
          id: string
          notes: string | null
          objective_id: string
          owner_id: string | null
          position: number
          priority: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_date_notes?: string | null
          effort?: number | null
          id?: string
          notes?: string | null
          objective_id: string
          owner_id?: string | null
          position?: number
          priority?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_date_notes?: string | null
          effort?: number | null
          id?: string
          notes?: string | null
          objective_id?: string
          owner_id?: string | null
          position?: number
          priority?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_initiatives_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "strategy_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_initiatives_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_initiatives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_key_results: {
        Row: {
          confidence: number
          created_at: string
          current_value: number
          description: string | null
          direction: string
          id: string
          initial_value: number
          objective_id: string
          owner_id: string | null
          target_value: number
          tenant_id: string
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          current_value?: number
          description?: string | null
          direction?: string
          id?: string
          initial_value?: number
          objective_id: string
          owner_id?: string | null
          target_value: number
          tenant_id: string
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          current_value?: number
          description?: string | null
          direction?: string
          id?: string
          initial_value?: number
          objective_id?: string
          owner_id?: string | null
          target_value?: number
          tenant_id?: string
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "strategy_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_key_results_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_key_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_objectives: {
        Row: {
          created_at: string
          cycle_id: string
          description: string | null
          id: string
          owner_id: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          description?: string | null
          id?: string
          owner_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          description?: string | null
          id?: string
          owner_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_objectives_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "strategy_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_objectives_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_objectives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          annual_cost: number
          billing_cycle: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          monthly_cost: number
          name: string
          notes: string | null
          tenant_id: string
          updated_at: string
          url: string | null
          vendor: string | null
        }
        Insert: {
          annual_cost?: number
          billing_cycle?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_cost?: number
          name: string
          notes?: string | null
          tenant_id: string
          updated_at?: string
          url?: string | null
          vendor?: string | null
        }
        Update: {
          annual_cost?: number
          billing_cycle?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_cost?: number
          name?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          url?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          bairro: string | null
          category: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          company_name: string
          complemento: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          estado: string | null
          id: string
          logo_url: string | null
          logradouro: string | null
          notes: string | null
          numero: string | null
          status: string
          tenant_id: string
          trading_name: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          category?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          company_name: string
          complemento?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          logo_url?: string | null
          logradouro?: string | null
          notes?: string | null
          numero?: string | null
          status?: string
          tenant_id: string
          trading_name?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          category?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          company_name?: string
          complemento?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          logo_url?: string | null
          logradouro?: string | null
          notes?: string | null
          numero?: string | null
          status?: string
          tenant_id?: string
          trading_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_entries: {
        Row: {
          aliquota_simples: number | null
          cofins: number | null
          created_at: string
          created_by: string | null
          csll: number | null
          description: string | null
          file_url: string | null
          id: string
          inss_cpp: number | null
          irpj: number | null
          iss: number | null
          payment_date: string
          pis_pasep: number | null
          rbt12: number | null
          reference_month: string
          rpa: number | null
          tenant_id: string
          total_value: number
          updated_at: string
        }
        Insert: {
          aliquota_simples?: number | null
          cofins?: number | null
          created_at?: string
          created_by?: string | null
          csll?: number | null
          description?: string | null
          file_url?: string | null
          id?: string
          inss_cpp?: number | null
          irpj?: number | null
          iss?: number | null
          payment_date: string
          pis_pasep?: number | null
          rbt12?: number | null
          reference_month: string
          rpa?: number | null
          tenant_id: string
          total_value?: number
          updated_at?: string
        }
        Update: {
          aliquota_simples?: number | null
          cofins?: number | null
          created_at?: string
          created_by?: string | null
          csll?: number | null
          description?: string | null
          file_url?: string | null
          id?: string
          inss_cpp?: number | null
          irpj?: number | null
          iss?: number | null
          payment_date?: string
          pis_pasep?: number | null
          rbt12?: number | null
          reference_month?: string
          rpa?: number | null
          tenant_id?: string
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          cnpj: string | null
          created_at: string
          employee_count: number | null
          id: string
          name: string
          segment: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          employee_count?: number | null
          id?: string
          name: string
          segment?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          employee_count?: number | null
          id?: string
          name?: string
          segment?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      termination_documents: {
        Row: {
          document_name: string
          document_type: Database["public"]["Enums"]["termination_document_type"]
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          termination_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          document_name: string
          document_type?: Database["public"]["Enums"]["termination_document_type"]
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          termination_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          document_name?: string
          document_type?: Database["public"]["Enums"]["termination_document_type"]
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          termination_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "termination_documents_termination_id_fkey"
            columns: ["termination_id"]
            isOneToOne: false
            referencedRelation: "employee_terminations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_adjustment_requests: {
        Row: {
          anexo_nome: string | null
          anexo_path: string | null
          created_at: string
          data_fim: string | null
          data_referencia: string
          decidido_em: string | null
          decidido_por: string | null
          employee_id: string
          entry_id_original: string | null
          horario_solicitado: string | null
          horas_solicitadas: number | null
          id: string
          motivo: string
          motivo_decisao: string | null
          status: string
          tenant_id: string
          tipo: string
          tipo_marcacao: Database["public"]["Enums"]["time_entry_type"] | null
        }
        Insert: {
          anexo_nome?: string | null
          anexo_path?: string | null
          created_at?: string
          data_fim?: string | null
          data_referencia: string
          decidido_em?: string | null
          decidido_por?: string | null
          employee_id: string
          entry_id_original?: string | null
          horario_solicitado?: string | null
          horas_solicitadas?: number | null
          id?: string
          motivo: string
          motivo_decisao?: string | null
          status?: string
          tenant_id: string
          tipo: string
          tipo_marcacao?: Database["public"]["Enums"]["time_entry_type"] | null
        }
        Update: {
          anexo_nome?: string | null
          anexo_path?: string | null
          created_at?: string
          data_fim?: string | null
          data_referencia?: string
          decidido_em?: string | null
          decidido_por?: string | null
          employee_id?: string
          entry_id_original?: string | null
          horario_solicitado?: string | null
          horas_solicitadas?: number | null
          id?: string
          motivo?: string
          motivo_decisao?: string | null
          status?: string
          tenant_id?: string
          tipo?: string
          tipo_marcacao?: Database["public"]["Enums"]["time_entry_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "time_adjustment_requests_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_adjustment_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_adjustment_requests_entry_id_original_fkey"
            columns: ["entry_id_original"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_adjustment_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      time_bank_ledger: {
        Row: {
          created_at: string
          data: string
          employee_id: string
          horas: number
          id: string
          origem: string
          referencia_id: string | null
          saldo_acumulado: number
          tenant_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          data: string
          employee_id: string
          horas: number
          id?: string
          origem?: string
          referencia_id?: string | null
          saldo_acumulado: number
          tenant_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          data?: string
          employee_id?: string
          horas?: number
          id?: string
          origem?: string
          referencia_id?: string | null
          saldo_acumulado?: number
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_bank_ledger_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_bank_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      time_daily_summary: {
        Row: {
          calculado_em: string
          data: string
          employee_id: string
          horas_extras: number
          horas_previstas: number
          horas_trabalhadas: number
          id: string
          saldo_dia: number
          status: string
          tenant_id: string
        }
        Insert: {
          calculado_em?: string
          data: string
          employee_id: string
          horas_extras?: number
          horas_previstas?: number
          horas_trabalhadas?: number
          id?: string
          saldo_dia?: number
          status?: string
          tenant_id: string
        }
        Update: {
          calculado_em?: string
          data?: string
          employee_id?: string
          horas_extras?: number
          horas_previstas?: number
          horas_trabalhadas?: number
          id?: string
          saldo_dia?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_daily_summary_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_daily_summary_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          ajuste_de_id: string | null
          created_at: string
          employee_id: string
          face_match_score: number | null
          face_match_status: string | null
          horario: string
          id: string
          ip_address: string | null
          is_ajuste: boolean
          latitude: number | null
          longitude: number | null
          origem: string
          selfie_path: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["time_entry_type"]
          user_agent: string | null
        }
        Insert: {
          ajuste_de_id?: string | null
          created_at?: string
          employee_id: string
          face_match_score?: number | null
          face_match_status?: string | null
          horario?: string
          id?: string
          ip_address?: string | null
          is_ajuste?: boolean
          latitude?: number | null
          longitude?: number | null
          origem?: string
          selfie_path?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["time_entry_type"]
          user_agent?: string | null
        }
        Update: {
          ajuste_de_id?: string | null
          created_at?: string
          employee_id?: string
          face_match_score?: number | null
          face_match_status?: string | null
          horario?: string
          id?: string
          ip_address?: string | null
          is_ajuste?: boolean
          latitude?: number | null
          longitude?: number | null
          origem?: string
          selfie_path?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["time_entry_type"]
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_ajuste_de_id_fkey"
            columns: ["ajuste_de_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      time_punch_face_profiles: {
        Row: {
          consentimento_aceito_em: string
          consentimento_versao: string
          created_at: string
          descriptor: Json
          employee_id: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          consentimento_aceito_em: string
          consentimento_versao: string
          created_at?: string
          descriptor: Json
          employee_id: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          consentimento_aceito_em?: string
          consentimento_versao?: string
          created_at?: string
          descriptor?: Json
          employee_id?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_punch_face_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_punch_face_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      time_tracking_audit_log: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          description: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_tracking_audit_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_tracking_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      time_tracking_period_locks: {
        Row: {
          ano: number
          fechado_em: string
          fechado_por: string | null
          id: string
          mes: number
          tenant_id: string
        }
        Insert: {
          ano: number
          fechado_em?: string
          fechado_por?: string | null
          id?: string
          mes: number
          tenant_id: string
        }
        Update: {
          ano?: number
          fechado_em?: string
          fechado_por?: string | null
          id?: string
          mes?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_tracking_period_locks_fechado_por_fkey"
            columns: ["fechado_por"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_tracking_period_locks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      time_tracking_settings: {
        Row: {
          created_at: string
          exigir_reconhecimento_facial: boolean
          exigir_selfie: boolean
          id: string
          intervalo_minimo_minutos: number
          limite_horas_extras_diarias: number
          tenant_id: string
          tolerancia_entrada_minutos: number
          tolerancia_saida_minutos: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          exigir_reconhecimento_facial?: boolean
          exigir_selfie?: boolean
          id?: string
          intervalo_minimo_minutos?: number
          limite_horas_extras_diarias?: number
          tenant_id: string
          tolerancia_entrada_minutos?: number
          tolerancia_saida_minutos?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          exigir_reconhecimento_facial?: boolean
          exigir_selfie?: boolean
          id?: string
          intervalo_minimo_minutos?: number
          limite_horas_extras_diarias?: number
          tenant_id?: string
          tolerancia_entrada_minutos?: number
          tolerancia_saida_minutos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_tracking_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_edit_logs: {
        Row: {
          edited_at: string
          edited_by: string
          id: string
          justification: string
          new_hours: number
          previous_hours: number
          reason_code: string
          timesheet_id: string
        }
        Insert: {
          edited_at?: string
          edited_by: string
          id?: string
          justification: string
          new_hours: number
          previous_hours: number
          reason_code?: string
          timesheet_id: string
        }
        Update: {
          edited_at?: string
          edited_by?: string
          id?: string
          justification?: string
          new_hours?: number
          previous_hours?: number
          reason_code?: string
          timesheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_edit_logs_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "project_timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_reminder_settings: {
        Row: {
          created_at: string
          employee_reminder_day: number
          employee_reminder_enabled: boolean
          employee_reminder_time: string
          id: string
          manager_alert_enabled: boolean
          manager_alert_time: string
          notification_channels: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_reminder_day?: number
          employee_reminder_enabled?: boolean
          employee_reminder_time?: string
          id?: string
          manager_alert_enabled?: boolean
          manager_alert_time?: string
          notification_channels?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_reminder_day?: number
          employee_reminder_enabled?: boolean
          employee_reminder_time?: string
          id?: string
          manager_alert_enabled?: boolean
          manager_alert_time?: string
          notification_channels?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_reminder_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_submissions: {
        Row: {
          created_at: string
          id: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          tenant_id: string
          total_hours: number
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id: string
          total_hours?: number
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id?: string
          total_hours?: number
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "tools_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_request_approvals: {
        Row: {
          approver_id: string
          created_at: string
          id: string
          project_id: string | null
          rejection_reason: string | null
          request_id: string
          reviewed_at: string | null
          status: string
        }
        Insert: {
          approver_id: string
          created_at?: string
          id?: string
          project_id?: string | null
          rejection_reason?: string | null
          request_id: string
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          approver_id?: string
          created_at?: string
          id?: string
          project_id?: string | null
          rejection_reason?: string | null
          request_id?: string
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_request_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_request_approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_request_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "vacation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_requests: {
        Row: {
          auto_approved: boolean
          created_at: string
          days_requested: number
          employee_id: string
          end_date: string
          id: string
          notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_approved?: boolean
          created_at?: string
          days_requested: number
          employee_id: string
          end_date: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_approved?: boolean
          created_at?: string
          days_requested?: number
          employee_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_absence_period: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_employee_id: string
          p_status: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      assign_employee_to_vacancy_row: {
        Args: { p_employee_id: string; p_row_id: string }
        Returns: undefined
      }
      attach_project_contract: {
        Args: {
          p_file_name: string
          p_file_size: number
          p_project_id: string
          p_storage_path: string
          p_tenant_id: string
        }
        Returns: string
      }
      calculate_employee_capacity_hours: {
        Args: {
          p_employee_id: string
          p_end_date: string
          p_start_date: string
          p_tenant_id: string
        }
        Returns: number
      }
      calculate_employee_hourly_cost_for_month: {
        Args: {
          p_employee_id: string
          p_month_start: string
          p_tenant_id: string
        }
        Returns: number
      }
      can_manage_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_project_document: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      cancel_scheduled_employee_version: {
        Args: { p_today: string; p_version_id: string }
        Returns: undefined
      }
      complete_onboarding: { Args: never; Returns: undefined }
      complete_password_change: { Args: never; Returns: undefined }
      count_employee_cost_business_days: {
        Args: { p_end_date: string; p_start_date: string; p_tenant_id: string }
        Returns: number
      }
      deallocate_project_member: {
        Args: { p_employee_id: string; p_project_id: string }
        Returns: undefined
      }
      first_access_status: { Args: { p_email: string }; Returns: string }
      generate_budget_number: { Args: { p_tenant_id: string }; Returns: string }
      get_allocation_employee_detail: {
        Args: {
          p_employee_id: string
          p_manager_id?: string
          p_project_id?: string
          p_team_key?: string
          p_tenant_id: string
          p_year: number
        }
        Returns: {
          actual_hours: number
          allocation_id: string
          client_name: string
          duration_months: number
          is_continuous: boolean
          item_id: string
          item_type: string
          manager_id: string
          manager_name: string
          month: number
          planned_hours: number
          project_end_date: string
          project_id: string
          project_member_id: string
          project_start_date: string
          subtitle: string
          team_key: string
          team_label: string
          title: string
        }[]
      }
      get_allocation_employee_month_summary: {
        Args: {
          p_manager_id?: string
          p_project_id?: string
          p_team_key?: string
          p_tenant_id: string
          p_year: number
        }
        Returns: {
          actual_hours: number
          capacity_hours: number
          cargo: string
          employee_id: string
          employee_name: string
          hire_date: string
          jornada_diaria: number
          month: number
          planned_hours: number
          status: string
          termination_date: string
        }[]
      }
      get_allocation_type_kpis: {
        Args: {
          p_current_month: number
          p_manager_id?: string
          p_project_id?: string
          p_team_key?: string
          p_tenant_id: string
          p_week_cutoff_date: string
          p_year: number
          p_ytd_cutoff_date: string
        }
        Returns: {
          activity_actual_annual: number
          activity_actual_month: number
          activity_actual_ytd: number
          activity_planned_annual: number
          activity_planned_month: number
          activity_planned_ytd: number
          project_actual_annual: number
          project_actual_month: number
          project_actual_ytd: number
          project_planned_annual: number
          project_planned_month: number
          project_planned_ytd: number
        }[]
      }
      get_crm_received_value: { Args: { p_tenant_id: string }; Returns: number }
      get_employee_status: { Args: { p_auth_id: string }; Returns: string }
      get_employee_version_at_date: {
        Args: { p_date?: string; p_employee_id: string }
        Returns: {
          beneficios: number
          cargo: string
          decimo_terceiro: number
          effective_from: string
          effective_until: string
          encargos: number
          ferias: number
          fgts: number
          inss_empresa: number
          jornada_mensal: number
          pro_labore: number
          salario_liquido: number
          salario_mensal: number
          tipo_contratacao: string
          version_id: string
        }[]
      }
      get_project_assignable_members: {
        Args: { p_project_id: string }
        Returns: {
          cargo: string
          employee_id: string
          foto_url: string
          nome: string
        }[]
      }
      get_project_tenant_id: { Args: { _project_id: string }; Returns: string }
      get_public_job_opening: {
        Args: { p_vaga_id: string }
        Returns: {
          area: string
          beneficios: string
          diferenciais: string
          id: string
          localizacao: string
          modalidade: string
          nao_divulgar_salario: boolean
          prazo_candidaturas: string
          public_url: string
          regime_contratacao: string
          requisitos_obrigatorios: string
          responsabilidades: string
          salario_ate: number
          salario_de: number
          senioridade: string
          sobre_a_vaga: string
          sobre_empresa: string
          status: string
          tenant_id: string
          titulo: string
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_manager_in_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_vacation_approver: {
        Args: { _request_id: string; _user_id: string }
        Returns: boolean
      }
      project_child_tenant_matches: {
        Args: { _project_id: string; _tenant_id: string }
        Returns: boolean
      }
      project_employee_has_actual_hours: {
        Args: { p_employee_id: string; p_project_id: string }
        Returns: boolean
      }
      reactivate_project_member: {
        Args: { p_employee_id: string; p_project_id: string }
        Returns: undefined
      }
      recalculate_employee_cost_snapshots: {
        Args: { p_employee_id: string }
        Returns: undefined
      }
      recompute_daily_summary: {
        Args: { p_data: string; p_employee_id: string }
        Returns: undefined
      }
      reprocess_time_bank_from_date: {
        Args: { p_data_inicio: string; p_employee_id: string }
        Returns: undefined
      }
      simulate_allocation_margin_impact: {
        Args: { p_employee_id: string; p_months: Json; p_project_id: string }
        Returns: {
          custo_estimado: number
          custo_hora_medio: number
          delta_pp: number
          has_baseline: boolean
          horas_total: number
          is_non_revenue: boolean
          margem_atual: number
          margem_baseline: number
          margem_simulada: number
          tol_pp: number
          verdict: string
        }[]
      }
      update_overdue_installments: { Args: never; Returns: undefined }
      user_belongs_to_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      vacation_request_is_admin: {
        Args: { _request_id: string; _user_id: string }
        Returns: boolean
      }
      vacation_request_owner_or_admin: {
        Args: { _request_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "manager" | "rh"
      budget_status:
        | "draft"
        | "sent"
        | "approved"
        | "rejected"
        | "expired"
        | "proposal"
        | "negotiation"
        | "active"
      installment_status:
        | "pending"
        | "invoiced"
        | "sent"
        | "received"
        | "overdue"
      payroll_adjustment_type:
        | "salary_proportional"
        | "vacation"
        | "thirteenth_salary"
        | "fgts"
        | "fgts_fine"
        | "overtime"
        | "benefits_discount"
        | "advance_discount"
        | "other"
      project_status:
        | "planning"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
      termination_document_type:
        | "resignation_letter"
        | "termination_letter"
        | "mutual_agreement"
        | "trct"
        | "homologation"
        | "receipt"
        | "other"
        | "medical_exam"
        | "final_report"
        | "performance_eval"
        | "contract_termination"
        | "quitacao"
        | "contract_amendment"
        | "meeting_minutes"
        | "quota_transfer"
        | "activity_report"
      termination_reason_category:
        | "performance"
        | "restructuring"
        | "personal_request"
        | "contract_expiration"
        | "disciplinary"
        | "other"
      termination_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "awaiting_documents"
      termination_type:
        | "voluntary"
        | "involuntary"
        | "contract_end"
        | "internship_end"
        | "retirement"
        | "mutual_agreement"
      time_entry_type:
        | "entrada"
        | "inicio_intervalo"
        | "fim_intervalo"
        | "saida"
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
      app_role: ["admin", "user", "manager", "rh"],
      budget_status: [
        "draft",
        "sent",
        "approved",
        "rejected",
        "expired",
        "proposal",
        "negotiation",
        "active",
      ],
      installment_status: [
        "pending",
        "invoiced",
        "sent",
        "received",
        "overdue",
      ],
      payroll_adjustment_type: [
        "salary_proportional",
        "vacation",
        "thirteenth_salary",
        "fgts",
        "fgts_fine",
        "overtime",
        "benefits_discount",
        "advance_discount",
        "other",
      ],
      project_status: [
        "planning",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      termination_document_type: [
        "resignation_letter",
        "termination_letter",
        "mutual_agreement",
        "trct",
        "homologation",
        "receipt",
        "other",
        "medical_exam",
        "final_report",
        "performance_eval",
        "contract_termination",
        "quitacao",
        "contract_amendment",
        "meeting_minutes",
        "quota_transfer",
        "activity_report",
      ],
      termination_reason_category: [
        "performance",
        "restructuring",
        "personal_request",
        "contract_expiration",
        "disciplinary",
        "other",
      ],
      termination_status: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
        "awaiting_documents",
      ],
      termination_type: [
        "voluntary",
        "involuntary",
        "contract_end",
        "internship_end",
        "retirement",
        "mutual_agreement",
      ],
      time_entry_type: [
        "entrada",
        "inicio_intervalo",
        "fim_intervalo",
        "saida",
      ],
    },
  },
} as const
