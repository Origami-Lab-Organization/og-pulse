/**
 * Configuração financeira do tenant — agora VERSIONADA (PUL-260).
 *
 * Cada linha da tabela é uma versão que passa a valer num dia (`effective_from`). Ler a
 * configuração é sempre "qual versão valia na data X", nunca "a linha da empresa": mudar o
 * percentual hoje não pode reescrever a meta que um projeto de janeiro tinha de bater.
 */

export interface FinancialSettings {
  id: string;
  tenant_id: string;
  admin_expenses_percent: number;
  taxes_percent: number;
  commission_percent: number;
  net_margin_percent: number;
  gross_margin_target_percent: number;
  /** Dia em que esta versão passa a valer (yyyy-MM-dd). */
  effective_from: string;
  /** Quem gravou. NULL quando veio da semente da empresa nova. */
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Uma versão com o nome de quem gravou, para a tabela de histórico. */
export interface FinancialSettingsVersion extends FinancialSettings {
  autorNome: string | null;
}

export interface FinancialSettingsFormData {
  admin_expenses_percent: number;
  taxes_percent: number;
  commission_percent: number;
  net_margin_percent: number;
  gross_margin_target_percent: number;
  /** "Vale a partir de" (yyyy-MM-dd). */
  effective_from: string;
}
