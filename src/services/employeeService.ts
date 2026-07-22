import { supabase } from "@/integrations/supabase/client";
import {
  EmployeeTool,
  CreateEmployeeToolInput,
  EmployeeBenefit,
  CreateEmployeeBenefitInput,
  ContractType,
  SystemRole,
  PixKeyType,
  BankAccountType,
} from "@/types/employee";
import { employeeVersionService, type EmployeeVersionDB } from "./employeeVersionService";
import {
  CostBreakdown,
  calculateEmployeeCost,
} from "@/lib/employeeCostCalculator";
import { PayrollProfile } from "@/types/payrollProfile";
import { Json } from "@/integrations/supabase/types";
import { todayLocalDateString } from "@/lib/formatters";

export interface EmployeeDB {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  cpf: string;
  data_admissao: string;
  is_gerente: boolean;
  system_role: string;
  aloca_em_projetos: boolean;
  status: string;
  salario_mensal: number;
  beneficios: number;
  encargos: number;
  tipo_contratacao: string;
  jornada_mensal: number;
  jornada_diaria: number;
  salario_liquido: number;
  fgts: number;
  inss_empresa: number;
  decimo_terceiro: number;
  ferias: number;
  pro_labore: number;
  // New fields
  bolsa_auxilio: number;
  valor_contrato_pj: number;
  dividendos: number;
  provisao_13: number;
  provisao_ferias: number;
  provisao_recesso: number;
  total_monthly_cost_estimated: number;
  total_annual_cost_estimated: number;
  breakdown_json: Json | null;
  data_nascimento: string | null;
  foto_url: string | null;
  pix_key_type: string | null;
  pix_key: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_account_type: string | null;
  tenant_id: string;
  auth_id: string | null;
  must_change_password: boolean;

  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeInput {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  cpf: string;
  dataAdmissao: string;
  isGerente: boolean;
  systemRole: SystemRole;
  alocaEmProjetos: boolean;
  status: string;
  salarioMensal: number;
  beneficios: number;
  encargos: number;
  tipoContratacao: ContractType;
  jornadaMensal: number;
  jornadaDiaria?: number;
  salarioLiquido: number;
  fgts: number;
  inssEmpresa: number;
  decimoTerceiro: number;
  ferias: number;
  proLabore: number;
  // New fields
  bolsaAuxilio?: number;
  valorContratoPj?: number;
  dividendos?: number;
  provisao13?: number;
  provisaoFerias?: number;
  provisaoRecesso?: number;
  totalMonthlyCostEstimated?: number;
  totalAnnualCostEstimated?: number;
  breakdownJson?: CostBreakdown;
  dataNascimento?: string;
  fotoUrl?: string;
  pixKeyType?: PixKeyType | null;
  pixKey?: string | null;
  bankName?: string | null;
  bankAgency?: string | null;
  bankAccount?: string | null;
  bankAccountType?: BankAccountType | null;
  candidateId?: string | null;
}

export const employeeService = {
  async getAll(tenantId: string): Promise<
    (EmployeeDB & {
      employee_tools: { monthly_cost: number; is_active: boolean }[];
      employee_benefits: { monthly_value: number; is_active: boolean }[];
    })[]
  > {
    const { data, error } = await supabase
      .from("employees")
      .select(
        "*, employee_tools(monthly_cost, is_active), employee_benefits(monthly_value, is_active)",
      )
      .eq("tenant_id", tenantId)
      .order("nome");

    if (error) {
      console.error("Error fetching employees:", error);
      throw error;
    }

    return (data || []) as (EmployeeDB & {
      employee_tools: { monthly_cost: number; is_active: boolean }[];
      employee_benefits: { monthly_value: number; is_active: boolean }[];
    })[];
  },

  async getById(id: string, tenantId?: string): Promise<EmployeeDB | null> {
    let query = supabase.from("employees").select("*").eq("id", id);
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data, error } = await query.single();

    if (error) {
      console.error("Error fetching employee:", error);
      return null;
    }

    return data as EmployeeDB;
  },

  async create(
    input: CreateEmployeeInput,
    tenantId: string,
    loginUrl: string,
  ): Promise<EmployeeDB> {
    const { data, error } = await supabase.functions.invoke(
      "create-employee-user",
      {
        body: {
          ...input,
          tenantId,
          loginUrl,
        },
      },
    );

    if (error) {
      // Extract the actual message from the edge function response body
      let message = error.message || "Failed to create employee";
      try {
        const body = JSON.parse(message);
        if (body?.error) message = body.error;
      } catch {
        // keep original message if not JSON
      }
      throw new Error(message);
    }

    if (!data?.employee) {
      throw new Error("Failed to create employee");
    }

    return data.employee as EmployeeDB;
  },

  async update(
    id: string,
    updates: Partial<CreateEmployeeInput>,
    createNewVersion: boolean = false,
    effectiveFrom?: string,
  ): Promise<EmployeeDB> {
    const dbUpdates: Record<string, unknown> = {};

    if (updates.nome !== undefined) dbUpdates.nome = updates.nome;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.telefone !== undefined) dbUpdates.telefone = updates.telefone;
    if (updates.cargo !== undefined) dbUpdates.cargo = updates.cargo;
    if (updates.cpf !== undefined) dbUpdates.cpf = updates.cpf;
    if (updates.dataAdmissao !== undefined)
      dbUpdates.data_admissao = updates.dataAdmissao;
    if (updates.isGerente !== undefined)
      dbUpdates.is_gerente = updates.isGerente;
    if (updates.systemRole !== undefined)
      dbUpdates.system_role = updates.systemRole;
    if (updates.alocaEmProjetos !== undefined)
      dbUpdates.aloca_em_projetos = updates.alocaEmProjetos;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.salarioMensal !== undefined)
      dbUpdates.salario_mensal = updates.salarioMensal;
    if (updates.beneficios !== undefined)
      dbUpdates.beneficios = updates.beneficios;
    if (updates.encargos !== undefined) dbUpdates.encargos = updates.encargos;
    if (updates.tipoContratacao !== undefined)
      dbUpdates.tipo_contratacao = updates.tipoContratacao;
    if (updates.jornadaMensal !== undefined)
      dbUpdates.jornada_mensal = updates.jornadaMensal;
    if (updates.jornadaDiaria !== undefined)
      dbUpdates.jornada_diaria = updates.jornadaDiaria;
    if (updates.salarioLiquido !== undefined)
      dbUpdates.salario_liquido = updates.salarioLiquido;
    if (updates.fgts !== undefined) dbUpdates.fgts = updates.fgts;
    if (updates.inssEmpresa !== undefined)
      dbUpdates.inss_empresa = updates.inssEmpresa;
    if (updates.decimoTerceiro !== undefined)
      dbUpdates.decimo_terceiro = updates.decimoTerceiro;
    if (updates.ferias !== undefined) dbUpdates.ferias = updates.ferias;
    if (updates.proLabore !== undefined)
      dbUpdates.pro_labore = updates.proLabore;
    // New fields
    if (updates.bolsaAuxilio !== undefined)
      dbUpdates.bolsa_auxilio = updates.bolsaAuxilio;
    if (updates.valorContratoPj !== undefined)
      dbUpdates.valor_contrato_pj = updates.valorContratoPj;
    if (updates.dividendos !== undefined)
      dbUpdates.dividendos = updates.dividendos;
    if (updates.provisao13 !== undefined)
      dbUpdates.provisao_13 = updates.provisao13;
    if (updates.provisaoFerias !== undefined)
      dbUpdates.provisao_ferias = updates.provisaoFerias;
    if (updates.provisaoRecesso !== undefined)
      dbUpdates.provisao_recesso = updates.provisaoRecesso;
    if (updates.totalMonthlyCostEstimated !== undefined)
      dbUpdates.total_monthly_cost_estimated =
        updates.totalMonthlyCostEstimated;
    if (updates.totalAnnualCostEstimated !== undefined)
      dbUpdates.total_annual_cost_estimated = updates.totalAnnualCostEstimated;
    if (updates.breakdownJson !== undefined)
      dbUpdates.breakdown_json = updates.breakdownJson;
    if (updates.dataNascimento !== undefined)
      dbUpdates.data_nascimento = updates.dataNascimento;
    if (updates.fotoUrl !== undefined) dbUpdates.foto_url = updates.fotoUrl;
    if (updates.pixKeyType !== undefined)
      dbUpdates.pix_key_type = updates.pixKeyType;
    if (updates.pixKey !== undefined) dbUpdates.pix_key = updates.pixKey;
    if (updates.bankName !== undefined) dbUpdates.bank_name = updates.bankName;
    if (updates.bankAgency !== undefined)
      dbUpdates.bank_agency = updates.bankAgency;
    if (updates.bankAccount !== undefined)
      dbUpdates.bank_account = updates.bankAccount;
    if (updates.bankAccountType !== undefined)
      dbUpdates.bank_account_type = updates.bankAccountType;

    // Campos versionados com effectiveFrom futuro ficam de fora do UPDATE agora — o cron
    // activate_scheduled_employee_versions os aplica quando o dia chegar.
    const VERSIONED_DB_FIELDS = [
      "tipo_contratacao",
      "salario_mensal",
      "salario_liquido",
      "beneficios",
      "encargos",
      "fgts",
      "inss_empresa",
      "decimo_terceiro",
      "ferias",
      "pro_labore",
      "jornada_mensal",
      "jornada_diaria",
      "cargo",
      "total_monthly_cost_estimated",
      "bolsa_auxilio",
      // Dados pessoais (aba "Dados") — também versionados, mas sem efeito em nenhum cálculo
      // de folha; servem só para o histórico da aba Histórico (EmployeeVersionsTimeline).
      // system_role/is_gerente/aloca_em_projetos ficam de FORA de propósito: são flags de
      // permissão/elegibilidade que precisam valer IMEDIATAMENTE, nunca adiadas.
      "nome",
      "telefone",
      "cpf",
      "data_nascimento",
      "data_admissao",
      "foto_url",
      "pix_key_type",
      "pix_key",
      "bank_name",
      "bank_account_type",
      "bank_agency",
      "bank_account",
      // valor_contrato_pj/dividendos: base de custo de PJ/Sócio (mesmo papel de bolsa_auxilio
      // para Estágio) — versionados para não perder o valor histórico numa troca de contrato.
      "valor_contrato_pj",
      "dividendos",
      // total_annual_cost_estimated/breakdown_json: derivados, sem efeito em nenhum cálculo,
      // só snapshot para a aba Histórico.
      "total_annual_cost_estimated",
      "breakdown_json",
      // Sem coluna em employee_versions (nada para o cron ativar depois) — adiados mesmo assim
      // para não vazar o valor novo antes de effectiveFrom; ficam no valor antigo até o próximo save.
      "provisao_13",
      "provisao_ferias",
      "provisao_recesso",
    ] as const;

    const todayStr = todayLocalDateString();
    const isFutureDated =
      createNewVersion && !!effectiveFrom && effectiveFrom > todayStr;

    // Estado anterior — usado para prorrogar campos versionados (mudança futura) e para
    // criar a versão de abertura (bootstrap) se o colaborador ainda não tiver nenhuma.
    let oldEmployee: EmployeeDB | null = null;
    let oldBenefitsTotal = 0;
    let oldToolsTotal = 0;
    const pendingVersionedUpdates: Record<string, unknown> = {};
    if (createNewVersion) {
      const { data: current } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .single();
      oldEmployee = current as EmployeeDB | null;

      const [{ data: oldBenefits }, { data: oldTools }] = await Promise.all([
        supabase
          .from("employee_benefits")
          .select("monthly_value, is_active")
          .eq("employee_id", id),
        supabase
          .from("employee_tools")
          .select("monthly_cost, is_active")
          .eq("employee_id", id),
      ]);
      oldBenefitsTotal = (oldBenefits || [])
        .filter((b) => b.is_active !== false)
        .reduce((sum, b) => sum + Number(b.monthly_value), 0);
      oldToolsTotal = (oldTools || [])
        .filter((t) => t.is_active !== false)
        .reduce((sum, t) => sum + Number(t.monthly_cost), 0);

      if (isFutureDated) {
        for (const field of VERSIONED_DB_FIELDS) {
          if (field in dbUpdates) pendingVersionedUpdates[field] = dbUpdates[field];
          delete dbUpdates[field];
        }
      }
    }

    const { data, error } = await supabase
      .from("employees")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating employee:", error);
      throw error;
    }

    const updatedEmployee = data as EmployeeDB;

    // system_role on employees is display data — user_roles is what RLS's
    // has_role() actually checks, so it must be kept in sync on every change.
    if (updates.systemRole !== undefined && updatedEmployee.auth_id) {
      const { error: roleDeleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", updatedEmployee.auth_id)
        .eq("tenant_id", updatedEmployee.tenant_id);

      if (roleDeleteError) {
        console.error("Error clearing previous user role:", roleDeleteError);
        throw roleDeleteError;
      }

      const { error: roleInsertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: updatedEmployee.auth_id,
          tenant_id: updatedEmployee.tenant_id,
          role: updates.systemRole,
        });

      if (roleInsertError) {
        console.error("Error updating user role:", roleInsertError);
        throw roleInsertError;
      }
    }

    // Create a new version if requested (for financial/charge changes)
    if (createNewVersion && oldEmployee) {
      try {
        const effectiveFromDate = effectiveFrom || todayStr;

        const { data: anyVersion } = await supabase
          .from("employee_versions")
          .select("id")
          .eq("employee_id", id)
          .limit(1)
          .maybeSingle();

        // Nenhuma versão ainda existe para este colaborador: registra o estado ANTERIOR
        // (Menor Aprendiz, por ex.) como versão de abertura antes de criar a nova — sem
        // isso, o histórico anterior a `effectiveFrom` seria perdido no momento do save.
        if (!anyVersion && oldEmployee.data_admissao < effectiveFromDate) {
          await employeeVersionService.createVersion({
            employeeId: id,
            effectiveFrom: oldEmployee.data_admissao,
            salarioMensal: oldEmployee.salario_mensal,
            salarioLiquido: oldEmployee.salario_liquido,
            beneficios: oldEmployee.beneficios,
            encargos: oldEmployee.encargos,
            fgts: oldEmployee.fgts,
            inssEmpresa: oldEmployee.inss_empresa,
            decimoTerceiro: oldEmployee.decimo_terceiro,
            ferias: oldEmployee.ferias,
            proLabore: oldEmployee.pro_labore,
            jornadaMensal: oldEmployee.jornada_mensal,
            jornadaDiaria: oldEmployee.jornada_diaria,
            tipoContratacao: oldEmployee.tipo_contratacao,
            cargo: oldEmployee.cargo,
            totalMonthlyCostEstimated: oldEmployee.total_monthly_cost_estimated,
            bolsaAuxilio: oldEmployee.bolsa_auxilio,
            nome: oldEmployee.nome,
            telefone: oldEmployee.telefone,
            cpf: oldEmployee.cpf,
            dataNascimento: oldEmployee.data_nascimento,
            dataAdmissao: oldEmployee.data_admissao,
            fotoUrl: oldEmployee.foto_url,
            systemRole: oldEmployee.system_role,
            isGerente: oldEmployee.is_gerente,
            pixKeyType: oldEmployee.pix_key_type,
            pixKey: oldEmployee.pix_key,
            bankName: oldEmployee.bank_name,
            bankAccountType: oldEmployee.bank_account_type,
            bankAgency: oldEmployee.bank_agency,
            bankAccount: oldEmployee.bank_account,
            valorContratoPj: oldEmployee.valor_contrato_pj,
            dividendos: oldEmployee.dividendos,
            totalAnnualCostEstimated: oldEmployee.total_annual_cost_estimated,
            breakdownJson: oldEmployee.breakdown_json,
          });
        }

        // Versão vigente no instante anterior a `effectiveFromDate` — pode não ser "a versão
        // aberta" se já existir uma futura agendada por uma edição anterior (ver createVersion
        // em employeeVersionService.ts, que encaixa a nova versão na linha do tempo).
        const { data: supersededVersion } = await supabase
          .from("employee_versions")
          .select("*")
          .eq("employee_id", id)
          .lte("effective_from", effectiveFromDate)
          .or(`effective_until.is.null,effective_until.gt.${effectiveFromDate}`)
          .order("effective_from", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Congela o custo/benefícios/ferramentas do período que está sendo substituído —
        // não necessariamente "a versão aberta" (idem acima).
        if (supersededVersion) {
          await supabase
            .from("employee_versions")
            .update({
              total_monthly_cost_estimated: oldEmployee.total_monthly_cost_estimated,
              total_benefits_cost: oldBenefitsTotal,
              total_tools_cost: oldToolsTotal,
              bolsa_auxilio: oldEmployee.bolsa_auxilio,
              nome: oldEmployee.nome,
              telefone: oldEmployee.telefone,
              cpf: oldEmployee.cpf,
              data_nascimento: oldEmployee.data_nascimento,
              data_admissao: oldEmployee.data_admissao,
              foto_url: oldEmployee.foto_url,
              system_role: oldEmployee.system_role,
              is_gerente: oldEmployee.is_gerente,
              pix_key_type: oldEmployee.pix_key_type,
              pix_key: oldEmployee.pix_key,
              bank_name: oldEmployee.bank_name,
              bank_account_type: oldEmployee.bank_account_type,
              bank_agency: oldEmployee.bank_agency,
              bank_account: oldEmployee.bank_account,
              valor_contrato_pj: oldEmployee.valor_contrato_pj,
              dividendos: oldEmployee.dividendos,
              total_annual_cost_estimated: oldEmployee.total_annual_cost_estimated,
              breakdown_json: oldEmployee.breakdown_json,
            })
            .eq("id", supersededVersion.id);
        }

        // Futuro: parte da versão substituída (pode já não ser o cadastro atual — ex.: reajuste
        // agendado após uma transição de contrato já agendada), não de `employees`/`updatedEmployee`.
        // system_role/is_gerente sempre vêm de `updatedEmployee` mesmo aqui — nunca são adiados
        // (aplicam-se imediatamente em employees + user_roles), então o snapshot da versão deve
        // refletir o valor atual, não o de `base` (que ficaria com o valor anterior ao edit).
        const base: EmployeeDB | EmployeeVersionDB = supersededVersion ?? oldEmployee;
        const next = isFutureDated
          ? {
              ...base,
              ...pendingVersionedUpdates,
              system_role: updatedEmployee.system_role,
              is_gerente: updatedEmployee.is_gerente,
            }
          : updatedEmployee;

        await employeeVersionService.createVersion({
          employeeId: id,
          effectiveFrom,
          salarioMensal: next.salario_mensal,
          salarioLiquido: next.salario_liquido,
          beneficios: next.beneficios,
          encargos: next.encargos,
          fgts: next.fgts,
          inssEmpresa: next.inss_empresa,
          decimoTerceiro: next.decimo_terceiro,
          ferias: next.ferias,
          proLabore: next.pro_labore,
          jornadaMensal: next.jornada_mensal,
          jornadaDiaria: next.jornada_diaria,
          tipoContratacao: next.tipo_contratacao,
          cargo: next.cargo,
          totalMonthlyCostEstimated: next.total_monthly_cost_estimated,
          bolsaAuxilio: next.bolsa_auxilio,
          nome: next.nome,
          telefone: next.telefone,
          cpf: next.cpf,
          dataNascimento: next.data_nascimento,
          dataAdmissao: next.data_admissao,
          fotoUrl: next.foto_url,
          systemRole: next.system_role,
          isGerente: next.is_gerente,
          pixKeyType: next.pix_key_type,
          pixKey: next.pix_key,
          bankName: next.bank_name,
          bankAccountType: next.bank_account_type,
          bankAgency: next.bank_agency,
          bankAccount: next.bank_account,
          valorContratoPj: next.valor_contrato_pj,
          dividendos: next.dividendos,
          totalAnnualCostEstimated: next.total_annual_cost_estimated,
          breakdownJson: next.breakdown_json,
        });
      } catch (versionError) {
        console.error("Error creating employee version:", versionError);
        // Don't throw - the employee was updated successfully
      }
    }

    return updatedEmployee;
  },

  async block(id: string): Promise<EmployeeDB> {
    const { data, error } = await supabase
      .from("employees")
      .update({ status: "bloqueado" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error blocking employee:", error);
      throw error;
    }

    return data as EmployeeDB;
  },

  async unblock(
    id: string,
    previousStatus: "ativo" | "aguardando_confirmacao" = "ativo",
  ): Promise<EmployeeDB> {
    const { data, error } = await supabase
      .from("employees")
      .update({ status: previousStatus })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error unblocking employee:", error);
      throw error;
    }

    return data as EmployeeDB;
  },

  async archive(id: string): Promise<EmployeeDB> {
    const { data, error } = await supabase
      .from("employees")
      .update({ status: "arquivado" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error archiving employee:", error);
      throw error;
    }

    return data as EmployeeDB;
  },

  async resendInvite(id: string, loginUrl: string): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-employee-invite`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          employeeId: id,
          loginUrl,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to resend invite");
    }
  },

  async search(query: string, tenantId: string): Promise<EmployeeDB[]> {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("tenant_id", tenantId)
      .or(`nome.ilike.%${query}%,cargo.ilike.%${query}%,email.ilike.%${query}%`)
      .order("nome");

    if (error) {
      console.error("Error searching employees:", error);
      throw error;
    }

    return (data || []) as EmployeeDB[];
  },

  // Employee Tools
  async getTools(employeeId: string): Promise<EmployeeTool[]> {
    const { data, error } = await supabase
      .from("employee_tools")
      .select("*")
      .eq("employee_id", employeeId)
      .order("name");

    if (error) {
      console.error("Error fetching employee tools:", error);
      throw error;
    }

    return (data || []) as EmployeeTool[];
  },

  async addTool(input: CreateEmployeeToolInput): Promise<EmployeeTool> {
    const { data, error } = await supabase
      .from("employee_tools")
      .insert({
        employee_id: input.employeeId,
        name: input.name,
        description: input.description || null,
        monthly_cost: input.monthlyCost,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding employee tool:", error);
      throw error;
    }

    return data as EmployeeTool;
  },

  async updateTool(
    id: string,
    updates: Partial<Omit<CreateEmployeeToolInput, "employeeId">>,
  ): Promise<EmployeeTool> {
    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.monthlyCost !== undefined)
      updateData.monthly_cost = updates.monthlyCost;

    const { data, error } = await supabase
      .from("employee_tools")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating employee tool:", error);
      throw error;
    }

    return data as EmployeeTool;
  },

  async deleteTool(id: string): Promise<void> {
    const { error } = await supabase
      .from("employee_tools")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting employee tool:", error);
      throw error;
    }
  },

  // Employee Benefits
  async getBenefits(employeeId: string): Promise<EmployeeBenefit[]> {
    const { data, error } = await supabase
      .from("employee_benefits")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching employee benefits:", error);
      throw error;
    }

    return (data || []) as EmployeeBenefit[];
  },

  async addBenefit(
    input: CreateEmployeeBenefitInput,
  ): Promise<EmployeeBenefit> {
    const { data, error } = await supabase
      .from("employee_benefits")
      .insert({
        employee_id: input.employeeId,
        name: input.name,
        description: input.description || null,
        monthly_value: input.monthlyValue,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding employee benefit:", error);
      throw error;
    }

    return data as EmployeeBenefit;
  },

  async updateBenefit(
    id: string,
    updates: Partial<Omit<CreateEmployeeBenefitInput, "employeeId">>,
  ): Promise<EmployeeBenefit> {
    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.monthlyValue !== undefined)
      updateData.monthly_value = updates.monthlyValue;

    const { data, error } = await supabase
      .from("employee_benefits")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating employee benefit:", error);
      throw error;
    }

    return data as EmployeeBenefit;
  },

  async deleteBenefit(id: string): Promise<void> {
    const { error } = await supabase
      .from("employee_benefits")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting employee benefit:", error);
      throw error;
    }
  },

  /** Soma dos benefícios/ferramentas ATIVOS hoje — usada tanto para recalcular o custo
   * corrente quanto para congelar "o valor de antes" na versão que está sendo substituída. */
  async getBenefitsToolsTotals(
    employeeId: string,
  ): Promise<{ benefitsTotal: number; toolsTotal: number }> {
    const [{ data: benefits }, { data: tools }] = await Promise.all([
      supabase
        .from("employee_benefits")
        .select("monthly_value")
        .eq("employee_id", employeeId)
        .eq("is_active", true),
      supabase
        .from("employee_tools")
        .select("monthly_cost")
        .eq("employee_id", employeeId)
        .eq("is_active", true),
    ]);
    return {
      benefitsTotal: (benefits || []).reduce(
        (s, b) => s + Number(b.monthly_value),
        0,
      ),
      toolsTotal: (tools || []).reduce(
        (s, t) => s + Number(t.monthly_cost),
        0,
      ),
    };
  },

  /**
   * Chamado ANTES de inserir/editar/remover um benefício ou ferramenta — fecha a versão
   * vigente (congelando total_benefits_cost/total_tools_cost com os valores de ANTES desta
   * mudança, único jeito correto já que a mutação em employee_benefits/employee_tools ainda
   * não aconteceu neste ponto) e abre uma nova versão (total_benefits_cost/total_tools_cost
   * ficam null nela — versão aberta usa a soma ao vivo, que após a mutação já reflete o novo
   * valor). Mesmo padrão de bootstrap/supersede de `update()`, mas sem nenhum campo do
   * cadastro mudando — só o motivo da nova versão é "mudou benefício/ferramenta".
   */
  async snapshotVersionForBenefitsToolsChange(
    employeeId: string,
    effectiveFrom: string,
  ): Promise<void> {
    const employee = await this.getById(employeeId);
    if (!employee) throw new Error("Employee not found");

    const { benefitsTotal: oldBenefitsTotal, toolsTotal: oldToolsTotal } =
      await this.getBenefitsToolsTotals(employeeId);

    try {
      const { data: anyVersion } = await supabase
        .from("employee_versions")
        .select("id")
        .eq("employee_id", employeeId)
        .limit(1)
        .maybeSingle();

      if (!anyVersion && employee.data_admissao < effectiveFrom) {
        await employeeVersionService.createVersion({
          employeeId,
          effectiveFrom: employee.data_admissao,
          salarioMensal: Number(employee.salario_mensal),
          salarioLiquido: Number(employee.salario_liquido),
          beneficios: Number(employee.beneficios),
          encargos: Number(employee.encargos),
          fgts: Number(employee.fgts),
          inssEmpresa: Number(employee.inss_empresa),
          decimoTerceiro: Number(employee.decimo_terceiro),
          ferias: Number(employee.ferias),
          proLabore: Number(employee.pro_labore),
          jornadaMensal: Number(employee.jornada_mensal),
          jornadaDiaria: Number(employee.jornada_diaria),
          tipoContratacao: employee.tipo_contratacao,
          cargo: employee.cargo,
          totalMonthlyCostEstimated: employee.total_monthly_cost_estimated,
          bolsaAuxilio: Number(employee.bolsa_auxilio),
          nome: employee.nome,
          telefone: employee.telefone,
          cpf: employee.cpf,
          dataNascimento: employee.data_nascimento,
          dataAdmissao: employee.data_admissao,
          fotoUrl: employee.foto_url,
          systemRole: employee.system_role,
          isGerente: employee.is_gerente,
          pixKeyType: employee.pix_key_type,
          pixKey: employee.pix_key,
          bankName: employee.bank_name,
          bankAccountType: employee.bank_account_type,
          bankAgency: employee.bank_agency,
          bankAccount: employee.bank_account,
          valorContratoPj: Number(employee.valor_contrato_pj),
          dividendos: Number(employee.dividendos),
          totalAnnualCostEstimated: employee.total_annual_cost_estimated,
          breakdownJson: employee.breakdown_json,
        });
      }

      const { data: supersededVersion } = await supabase
        .from("employee_versions")
        .select("id")
        .eq("employee_id", employeeId)
        .lte("effective_from", effectiveFrom)
        .or(`effective_until.is.null,effective_until.gt.${effectiveFrom}`)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (supersededVersion) {
        await supabase
          .from("employee_versions")
          .update({
            total_monthly_cost_estimated: employee.total_monthly_cost_estimated,
            total_benefits_cost: oldBenefitsTotal,
            total_tools_cost: oldToolsTotal,
            bolsa_auxilio: employee.bolsa_auxilio,
            valor_contrato_pj: employee.valor_contrato_pj,
            dividendos: employee.dividendos,
            total_annual_cost_estimated: employee.total_annual_cost_estimated,
            breakdown_json: employee.breakdown_json,
            nome: employee.nome,
            telefone: employee.telefone,
            cpf: employee.cpf,
            data_nascimento: employee.data_nascimento,
            data_admissao: employee.data_admissao,
            foto_url: employee.foto_url,
            system_role: employee.system_role,
            is_gerente: employee.is_gerente,
            pix_key_type: employee.pix_key_type,
            pix_key: employee.pix_key,
            bank_name: employee.bank_name,
            bank_account_type: employee.bank_account_type,
            bank_agency: employee.bank_agency,
            bank_account: employee.bank_account,
          })
          .eq("id", supersededVersion.id);
      }

      await employeeVersionService.createVersion({
        employeeId,
        effectiveFrom,
        salarioMensal: Number(employee.salario_mensal),
        salarioLiquido: Number(employee.salario_liquido),
        beneficios: Number(employee.beneficios),
        encargos: Number(employee.encargos),
        fgts: Number(employee.fgts),
        inssEmpresa: Number(employee.inss_empresa),
        decimoTerceiro: Number(employee.decimo_terceiro),
        ferias: Number(employee.ferias),
        proLabore: Number(employee.pro_labore),
        jornadaMensal: Number(employee.jornada_mensal),
        jornadaDiaria: Number(employee.jornada_diaria),
        tipoContratacao: employee.tipo_contratacao,
        cargo: employee.cargo,
        totalMonthlyCostEstimated: employee.total_monthly_cost_estimated,
        bolsaAuxilio: Number(employee.bolsa_auxilio),
        nome: employee.nome,
        telefone: employee.telefone,
        cpf: employee.cpf,
        dataNascimento: employee.data_nascimento,
        dataAdmissao: employee.data_admissao,
        fotoUrl: employee.foto_url,
        systemRole: employee.system_role,
        isGerente: employee.is_gerente,
        pixKeyType: employee.pix_key_type,
        pixKey: employee.pix_key,
        bankName: employee.bank_name,
        bankAccountType: employee.bank_account_type,
        bankAgency: employee.bank_agency,
        bankAccount: employee.bank_account,
        valorContratoPj: Number(employee.valor_contrato_pj),
        dividendos: Number(employee.dividendos),
        totalAnnualCostEstimated: employee.total_annual_cost_estimated,
        breakdownJson: employee.breakdown_json,
        // total_benefits_cost/total_tools_cost ficam de fora -> null (versão aberta, soma ao vivo).
      });
    } catch (versionError) {
      console.error("Error snapshotting employee version:", versionError);
    }
  },

  /**
   * Chamado DEPOIS de inserir/editar/remover um benefício ou ferramenta — recalcula o custo
   * total do colaborador com a soma ATUAL (já refletindo a mudança) e atualiza `employees`.
   * `effectiveFrom` futuro só adia esse UPDATE (o cron aplica quando a data chegar) — nunca
   * afeta o versionamento, que já foi feito por `snapshotVersionForBenefitsToolsChange`.
   */
  async refreshEmployeeCostFields(
    employeeId: string,
    payrollProfile?: Partial<PayrollProfile>,
    effectiveFrom?: string,
  ): Promise<void> {
    const employee = await this.getById(employeeId);
    if (!employee) throw new Error("Employee not found");

    const { benefitsTotal, toolsTotal } =
      await this.getBenefitsToolsTotals(employeeId);

    const breakdown = calculateEmployeeCost({
      tipoContratacao: employee.tipo_contratacao as ContractType,
      salarioBruto: Number(employee.salario_mensal),
      bolsaAuxilio: Number(employee.bolsa_auxilio),
      valorContratoPj: Number(employee.valor_contrato_pj),
      proLabore: Number(employee.pro_labore),
      dividendos: Number(employee.dividendos),
      benefitsTotalMonthly: benefitsTotal,
      toolsTotalMonthly: toolsTotal,
      payrollProfile: payrollProfile || undefined,
    });

    const todayStr = todayLocalDateString();
    const isFutureDated = !!effectiveFrom && effectiveFrom > todayStr;
    if (isFutureDated) return;

    const { error: updateError } = await supabase
      .from("employees")
      .update({
        beneficios: benefitsTotal,
        total_monthly_cost_estimated: breakdown.totalMonthlyCost,
        total_annual_cost_estimated: breakdown.totalAnnualCost,
        breakdown_json: breakdown as unknown as Json,
        encargos: breakdown.chargesAmount,
        fgts: breakdown.details.fgts,
        inss_empresa: breakdown.details.inss,
        decimo_terceiro: breakdown.details.provisao13,
        ferias: breakdown.details.provisaoFerias,
        provisao_13: breakdown.details.provisao13,
        provisao_ferias: breakdown.details.provisaoFerias,
      })
      .eq("id", employeeId);

    if (updateError) {
      console.error("Error updating employee cost:", updateError);
      throw updateError;
    }
  },
};
