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
  /** Escopo em uma frase: o que inclui e, onde confunde, o que não inclui. */
  description: string | null;
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
  configuracao: 'Configuração da empresa',
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

/**
 * Uma exceção por pessoa, já com o nome de quem ela afeta e o rótulo da capacidade — a
 * listagem existe para tornar a exceção visível, e id cru não torna nada visível.
 */
export interface OverrideWithPerson extends UserCapabilityOverrideDB {
  nome: string;
  cargo: string;
  /** Nome do papel da pessoa, para a linha dizer de que perfil a exceção está desviando. */
  roleName: string | null;
  /** O papel da pessoa já concede esta capacidade? Define se a exceção é redundante. */
  grantedByRole: boolean;
}

/** Exceções de uma mesma capacidade. Muitas na mesma linha são sinal de perfil faltando. */
export interface OverrideGroup {
  capability: string;
  label: string;
  domain: string;
  is_sensitive: boolean;
  overrides: OverrideWithPerson[];
}

/**
 * A partir de quantas pessoas com a mesma exceção o ADR-0027 considera que falta um perfil
 * ("papéis que diferem em uma única capacidade provavelmente eram um papel mais um
 * override" — e o inverso também vale).
 */
export const OVERRIDE_CROWD_THRESHOLD = 3;

/** Uma pessoa do tenant e o perfil que ela tem hoje. */
export interface PersonWithRole {
  employeeId: string;
  /** `employees.auth_id` — é a chave do vínculo, porque perfil é de conta, não de cadastro. */
  userId: string;
  nome: string;
  cargo: string;
  status: string;
  roleId: string | null;
}
