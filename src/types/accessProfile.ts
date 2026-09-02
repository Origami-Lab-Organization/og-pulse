/**
 * Perfis de acesso — papéis do tenant e as capacidades que cada um concede.
 *
 * O vocabulário de capacidades é imutável em runtime (semeado por migration; ver
 * ADR-0027), então `Capability` é dado lido, nunca escrito pela interface. O que a tela
 * edita é a matriz papel × capacidade e, quando necessário, a exceção por pessoa.
 */

/** Uma capacidade do vocabulário. `key` é o identificador usado por `has_capability`. */
export interface CapabilityDB {
  key: string;
  domain: string;
  label: string;
  is_sensitive: boolean;
}

export interface TenantRoleDB {
  id: string;
  tenant_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleCapabilityDB {
  role_id: string;
  capability: string;
  enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface UserCapabilityOverrideDB {
  user_id: string;
  tenant_id: string;
  capability: string;
  enabled: boolean;
  reason: string | null;
  updated_at: string;
  updated_by: string | null;
}

/** Papel com a contagem de pessoas atribuídas — o que a listagem precisa mostrar. */
export interface TenantRoleWithUsage extends TenantRoleDB {
  people_count: number;
}

/** Capacidades agrupadas por domínio, para a grade não virar uma lista de 48 linhas. */
export interface CapabilityGroup {
  domain: string;
  capabilities: CapabilityDB[];
}

/** Rótulos de domínio para exibição. Nomenclatura das jornadas: Oportunidade/Pipeline. */
export const DOMAIN_LABELS: Record<string, string> = {
  financeiro: 'Financeiro de projeto',
  folha: 'Folha e remuneração',
  pessoas: 'Pessoas',
  comercial: 'Pipeline e comercial',
  projeto: 'Projeto e portfólio',
  alocacao: 'Alocação',
  timesheet: 'Timesheet',
  ponto: 'Ponto',
  recrutamento: 'Recrutamento',
  estrategia: 'Estratégia',
};

/** A capacidade que a invariante do banco protege — ver 20260902170000. */
export const PROFILE_ADMIN_CAPABILITY = 'pessoa:editar-papel';
