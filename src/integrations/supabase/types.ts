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
            foreignKeyName: "budgets_tenant_id_fkey"
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
          created_at: string
          estado: string | null
          id: string
          logo_url: string | null
          logradouro: string | null
          numero: string | null
          status: string
          tenant_id: string
          trading_name: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          company_name: string
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          logo_url?: string | null
          logradouro?: string | null
          numero?: string | null
          status?: string
          tenant_id: string
          trading_name?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          company_name?: string
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          logo_url?: string | null
          logradouro?: string | null
          numero?: string | null
          status?: string
          tenant_id?: string
          trading_name?: string | null
          updated_at?: string
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
          beneficios: number
          cargo: string
          created_at: string
          decimo_terceiro: number
          effective_from: string
          effective_until: string | null
          employee_id: string
          encargos: number
          ferias: number
          fgts: number
          id: string
          inss_empresa: number
          jornada_diaria: number
          jornada_mensal: number
          pro_labore: number
          salario_liquido: number
          salario_mensal: number
          tipo_contratacao: string
        }
        Insert: {
          beneficios?: number
          cargo: string
          created_at?: string
          decimo_terceiro?: number
          effective_from?: string
          effective_until?: string | null
          employee_id: string
          encargos?: number
          ferias?: number
          fgts?: number
          id?: string
          inss_empresa?: number
          jornada_diaria?: number
          jornada_mensal?: number
          pro_labore?: number
          salario_liquido?: number
          salario_mensal?: number
          tipo_contratacao?: string
        }
        Update: {
          beneficios?: number
          cargo?: string
          created_at?: string
          decimo_terceiro?: number
          effective_from?: string
          effective_until?: string | null
          employee_id?: string
          encargos?: number
          ferias?: number
          fgts?: number
          id?: string
          inss_empresa?: number
          jornada_diaria?: number
          jornada_mensal?: number
          pro_labore?: number
          salario_liquido?: number
          salario_mensal?: number
          tipo_contratacao?: string
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
          auth_id: string | null
          beneficios: number
          bolsa_auxilio: number
          breakdown_json: Json | null
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
          is_gerente: boolean
          jornada_diaria: number
          jornada_mensal: number
          must_change_password: boolean
          nome: string
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
          auth_id?: string | null
          beneficios?: number
          bolsa_auxilio?: number
          breakdown_json?: Json | null
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
          is_gerente?: boolean
          jornada_diaria?: number
          jornada_mensal?: number
          must_change_password?: boolean
          nome: string
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
          auth_id?: string | null
          beneficios?: number
          bolsa_auxilio?: number
          breakdown_json?: Json | null
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
          is_gerente?: boolean
          jornada_diaria?: number
          jornada_mensal?: number
          must_change_password?: boolean
          nome?: string
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
      lead_interactions: {
        Row: {
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
          id: string
          is_archived: boolean
          is_read: boolean
          is_resolved: boolean
          message: string | null
          metadata: Json | null
          priority: string
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
          id?: string
          is_archived?: boolean
          is_read?: boolean
          is_resolved?: boolean
          message?: string | null
          metadata?: Json | null
          priority?: string
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
          id?: string
          is_archived?: boolean
          is_read?: boolean
          is_resolved?: boolean
          message?: string | null
          metadata?: Json | null
          priority?: string
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
          assignee_id: string | null
          blocked_reason: string | null
          card_number: number | null
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
          card_number?: number | null
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
          card_number?: number | null
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
          created_at: string
          id: string
          items: Json
          project_id: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          project_id: string
          tenant_id: string
          type: string
        }
        Update: {
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
      project_installments: {
        Row: {
          created_at: string
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
          hours: number
          id: string
          month_number: number
          project_member_id: string
        }
        Insert: {
          hours?: number
          id?: string
          month_number: number
          project_member_id: string
        }
        Update: {
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
          tenant_id?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
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
      strategy_initiatives: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          effort: number | null
          id: string
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
          effort?: number | null
          id?: string
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
          effort?: number | null
          id?: string
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
          id: string
          initial_value: number
          objective_id: string
          owner_id: string | null
          target_value: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          current_value?: number
          description?: string | null
          id?: string
          initial_value?: number
          objective_id: string
          owner_id?: string | null
          target_value: number
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          current_value?: number
          description?: string | null
          id?: string
          initial_value?: number
          objective_id?: string
          owner_id?: string | null
          target_value?: number
          tenant_id?: string
          title?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_budget_number: { Args: { p_tenant_id: string }; Returns: string }
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
      get_project_tenant_id: { Args: { _project_id: string }; Returns: string }
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
      update_overdue_installments: { Args: never; Returns: undefined }
      user_belongs_to_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "manager"
      budget_status:
        | "draft"
        | "sent"
        | "approved"
        | "rejected"
        | "expired"
        | "proposal"
        | "negotiation"
        | "active"
      installment_status: "pending" | "invoiced" | "received" | "overdue"
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
      app_role: ["admin", "user", "manager"],
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
      installment_status: ["pending", "invoiced", "received", "overdue"],
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
    },
  },
} as const
