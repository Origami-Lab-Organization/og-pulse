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
      budget_materials: {
        Row: {
          budget_id: string
          created_at: string
          description: string
          id: string
          value: number
        }
        Insert: {
          budget_id: string
          created_at?: string
          description: string
          id?: string
          value?: number
        }
        Update: {
          budget_id?: string
          created_at?: string
          description?: string
          id?: string
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
      budgets: {
        Row: {
          admin_expenses_percent: number
          budget_number: string
          client_id: string | null
          commission_percent: number
          created_at: string
          created_by: string | null
          discount_percent: number
          duration_months: number
          final_total: number
          id: string
          lead_contact: string | null
          lead_name: string | null
          net_margin_percent: number
          notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["budget_status"]
          subtotal: number
          taxes_percent: number
          tenant_id: string
          title: string
          total_with_fees: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          admin_expenses_percent?: number
          budget_number: string
          client_id?: string | null
          commission_percent?: number
          created_at?: string
          created_by?: string | null
          discount_percent?: number
          duration_months?: number
          final_total?: number
          id?: string
          lead_contact?: string | null
          lead_name?: string | null
          net_margin_percent?: number
          notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["budget_status"]
          subtotal?: number
          taxes_percent?: number
          tenant_id: string
          title: string
          total_with_fees?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          admin_expenses_percent?: number
          budget_number?: string
          client_id?: string | null
          commission_percent?: number
          created_at?: string
          created_by?: string | null
          discount_percent?: number
          duration_months?: number
          final_total?: number
          id?: string
          lead_contact?: string | null
          lead_name?: string | null
          net_margin_percent?: number
          notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["budget_status"]
          subtotal?: number
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
          telefone: string
          temp_password: string | null
          tenant_id: string
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
          telefone: string
          temp_password?: string | null
          tenant_id: string
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
          telefone?: string
          temp_password?: string | null
          tenant_id?: string
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
        ]
      }
      financial_settings: {
        Row: {
          admin_expenses_percent: number
          commission_percent: number
          created_at: string
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
      project_members: {
        Row: {
          created_at: string
          employee_id: string
          hours_per_month: number
          id: string
          project_id: string
          role: string
          seniority: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          hours_per_month?: number
          id?: string
          project_id: string
          role: string
          seniority?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          hours_per_month?: number
          id?: string
          project_id?: string
          role?: string
          seniority?: string
        }
        Relationships: [
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
      projects: {
        Row: {
          budget_id: string | null
          client_id: string
          contract_url: string | null
          created_at: string
          description: string | null
          due_day: number
          end_date: string | null
          first_invoice_date: string | null
          id: string
          installments_count: number
          is_continuous: boolean
          manager_id: string
          name: string
          payment_method: string
          start_date: string
          status: Database["public"]["Enums"]["project_status"]
          tenant_id: string
          total_value: number
          updated_at: string
        }
        Insert: {
          budget_id?: string | null
          client_id: string
          contract_url?: string | null
          created_at?: string
          description?: string | null
          due_day?: number
          end_date?: string | null
          first_invoice_date?: string | null
          id?: string
          installments_count?: number
          is_continuous?: boolean
          manager_id: string
          name: string
          payment_method?: string
          start_date: string
          status?: Database["public"]["Enums"]["project_status"]
          tenant_id: string
          total_value?: number
          updated_at?: string
        }
        Update: {
          budget_id?: string | null
          client_id?: string
          contract_url?: string | null
          created_at?: string
          description?: string | null
          due_day?: number
          end_date?: string | null
          first_invoice_date?: string | null
          id?: string
          installments_count?: number
          is_continuous?: boolean
          manager_id?: string
          name?: string
          payment_method?: string
          start_date?: string
          status?: Database["public"]["Enums"]["project_status"]
          tenant_id?: string
          total_value?: number
          updated_at?: string
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
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      update_overdue_installments: { Args: never; Returns: undefined }
      user_belongs_to_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "manager"
      budget_status: "draft" | "sent" | "approved" | "rejected" | "expired"
      installment_status: "pending" | "invoiced" | "received" | "overdue"
      project_status:
        | "planning"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
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
      budget_status: ["draft", "sent", "approved", "rejected", "expired"],
      installment_status: ["pending", "invoiced", "received", "overdue"],
      project_status: [
        "planning",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
