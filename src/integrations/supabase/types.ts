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
      clients: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          company_name: string
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
      employees: {
        Row: {
          auth_id: string | null
          beneficios: number
          cargo: string
          cpf: string | null
          created_at: string
          data_admissao: string
          email: string
          encargos: number
          id: string
          is_gerente: boolean
          must_change_password: boolean
          nome: string
          salario_mensal: number
          status: string
          telefone: string | null
          temp_password: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          beneficios?: number
          cargo: string
          cpf?: string | null
          created_at?: string
          data_admissao: string
          email: string
          encargos?: number
          id?: string
          is_gerente?: boolean
          must_change_password?: boolean
          nome: string
          salario_mensal?: number
          status?: string
          telefone?: string | null
          temp_password?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          beneficios?: number
          cargo?: string
          cpf?: string | null
          created_at?: string
          data_admissao?: string
          email?: string
          encargos?: number
          id?: string
          is_gerente?: boolean
          must_change_password?: boolean
          nome?: string
          salario_mensal?: number
          status?: string
          telefone?: string | null
          temp_password?: string | null
          tenant_id?: string
          updated_at?: string
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
          id: string
          project_id: string
          role: string
          seniority: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          project_id: string
          role: string
          seniority?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
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
          end_date: string
          first_invoice_date: string | null
          id: string
          installments_count: number
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
          end_date: string
          first_invoice_date?: string | null
          id?: string
          installments_count?: number
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
          end_date?: string
          first_invoice_date?: string | null
          id?: string
          installments_count?: number
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
