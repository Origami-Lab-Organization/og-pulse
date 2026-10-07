import type { ProspectCompanyInput } from '@/services/prospectCompanyService';
import type { ProspectCompanyDB } from '@/types/prospect';

/**
 * O que a edição de uma empresa pode levar para outra que já existe sem sobrescrever nada.
 * Nome, CNPJ e LinkedIn ficam de fora: o nome é o da empresa cadastrada, e CNPJ e LinkedIn
 * são únicos por organização — a empresa de origem continua com os dela.
 */
const CAMPOS_COMPLETAVEIS = ['instagram_url', 'website', 'segment', 'ring', 'tier'] as const;

/** O cadastro como entrada de `update`: o service grava todos os campos, então vão todos. */
function entradaDe(empresa: ProspectCompanyDB): ProspectCompanyInput {
  return {
    name: empresa.name,
    cnpj: empresa.cnpj,
    linkedin_url: empresa.linkedin_url,
    instagram_url: empresa.instagram_url,
    website: empresa.website,
    segment: empresa.segment,
    ring: empresa.ring,
    tier: empresa.tier,
    client_id: empresa.client_id,
    notes: empresa.notes,
    faturamento_anual: empresa.faturamento_anual ?? null,
    faturamento_anual_base: empresa.faturamento_anual_base ?? null,
  };
}

/** Valor e base andam juntos: só vêm da edição quando a empresa existente não tem valor. */
function faturamentoQueFalta(existente: ProspectCompanyDB, edicao: ProspectCompanyInput) {
  if (existente.faturamento_anual || !edicao.faturamento_anual) return null;
  return { faturamento_anual: edicao.faturamento_anual, faturamento_anual_base: edicao.faturamento_anual_base };
}

/**
 * A empresa existente com as lacunas preenchidas pela edição, ou `null` se não falta nada.
 * O cadastro existente vence: a edição só completa o que está vazio lá (07/10/2026).
 */
export function completarEmpresa(
  existente: ProspectCompanyDB,
  edicao: ProspectCompanyInput,
): ProspectCompanyInput | null {
  const lacunas = CAMPOS_COMPLETAVEIS.filter((campo) => !existente[campo]?.trim() && edicao[campo]?.trim());
  const faturamento = faturamentoQueFalta(existente, edicao);
  if (lacunas.length === 0 && !faturamento) return null;
  return {
    ...entradaDe(existente),
    ...Object.fromEntries(lacunas.map((campo) => [campo, edicao[campo]])),
    ...faturamento,
  };
}
