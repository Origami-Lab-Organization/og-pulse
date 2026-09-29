/**
 * Duplicidade de empresa e contato na Prospecção.
 *
 * A tela avisa que CNPJ ou LinkedIn evitam empresa duplicada, e o banco recusa os dois
 * repetidos (índices únicos por organização). O nome não tem índice único: homônimo é
 * legítimo quando o CNPJ ou o LinkedIn provam que são empresas diferentes. Por isso a
 * ordem é CNPJ → LinkedIn → nome, e o nome só reaproveita quando nada o contradiz.
 *
 * Nada aqui escreve no banco: decide qual empresa usar, e quem grava é `data.ts`.
 */

import { companyProspectStatus, type CompanyProspectStatus } from '@/lib/prospecting/companyStatus';
import type { ProspectCompanyDB, ProspectWithCompany } from '@/types/prospect';
import * as db from './data.js';
import type { CompanyFields, CompanyLookup, CompanyMatch, CompanyMatches, CompanyTarget } from './types.js';

const digitos = (valor?: string | null) => (valor ?? '').replace(/\D/g, '');
const linkedin = (valor?: string | null) => (valor ?? '').trim().toLowerCase();

/** Um identificador forte diferente dos dois lados prova que são empresas distintas. */
function contradiz(existente: ProspectCompanyDB, busca: CompanyLookup): boolean {
  const cnpjDiverge = !!digitos(busca.cnpj) && !!existente.cnpj && existente.cnpj !== digitos(busca.cnpj);
  const linkedinDiverge =
    !!linkedin(busca.linkedin_url) && !!existente.linkedin_url && linkedin(existente.linkedin_url) !== linkedin(busca.linkedin_url);
  return cnpjDiverge || linkedinDiverge;
}

/** Todas as empresas que batem com a busca, por critério — para mostrar antes de cadastrar. */
export async function candidatas(busca: CompanyLookup): Promise<CompanyMatches> {
  const [porCnpj, porLinkedin, homonimas] = await Promise.all([
    busca.cnpj ? db.empresaPorCnpj(busca.cnpj) : null,
    busca.linkedin_url ? db.empresaPorLinkedin(busca.linkedin_url) : null,
    busca.nome ? db.empresasPorNomeExato(busca.nome) : [],
  ]);
  const fortes: CompanyMatch[] = [
    ...(porCnpj ? [{ empresa: porCnpj, criterio: 'CNPJ' as const }] : []),
    ...(porLinkedin && porLinkedin.id !== porCnpj?.id ? [{ empresa: porLinkedin, criterio: 'LinkedIn' as const }] : []),
  ];
  const jaAchadas = new Set(fortes.map((f) => f.empresa.id));
  const porNome = homonimas
    .filter((empresa) => !jaAchadas.has(empresa.id))
    .map((empresa) => ({ empresa, criterio: 'nome' as const }));
  return { fortes, porNome };
}

/**
 * A empresa já cadastrada que corresponde aos dados, ou `null` se é nova de fato.
 * Mais de um homônimo sem identificador que os separe: para e pede o `company_id`.
 */
export async function empresaExistente(busca: CompanyLookup & { nome: string }): Promise<CompanyMatch | null> {
  const { fortes, porNome } = await candidatas(busca);
  if (fortes.length > 0) return fortes[0];

  const compativeis = porNome.filter((a) => !contradiz(a.empresa, busca));
  if (compativeis.length <= 1) return compativeis[0] ?? null;
  throw new db.ProspeccaoError(
    `Há ${compativeis.length} empresas chamadas "${busca.nome}" e nada nos dados as diferencia:\n` +
      compativeis.map((a) => `- ${a.empresa.name} — ID: \`${a.empresa.id}\``).join('\n') +
      '\nInforme o company_id da certa, ou o CNPJ/LinkedIn da empresa.',
  );
}

/** Resolve a empresa do contato novo: a informada, a já cadastrada, ou uma recém-criada. */
export async function resolverEmpresa(
  companyId: string | undefined,
  nova: (CompanyFields & { name: string }) | undefined,
): Promise<CompanyTarget> {
  if (!!companyId === !!nova) {
    throw new db.ProspeccaoError('Envie company_id (empresa existente) OU empresa (dados da empresa nova) — um dos dois.');
  }
  if (companyId) return { empresa: await db.buscarEmpresa(companyId), origem: 'informada' };

  // Cliente já ligado a uma empresa da Prospecção vence tudo: é a mesma conta.
  const doCliente = nova.client_id ? await db.empresaPorCliente(nova.client_id) : null;
  if (doCliente) return { empresa: doCliente, criterio: 'cliente', origem: 'reaproveitada' };

  const existente = await empresaExistente({ nome: nova.name, cnpj: nova.cnpj, linkedin_url: nova.linkedin_url });
  if (existente) return { ...existente, origem: 'reaproveitada' };
  return { empresa: await db.criarEmpresa(nova), origem: 'criada' };
}

const semAcento = (texto?: string | null) =>
  (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** Mesmo nome (sem acento nem caixa) ou mesmo e-mail na mesma empresa é o mesmo contato. */
export function contatoRepetido(
  contatos: ProspectWithCompany[],
  nome: string,
  email?: string,
): ProspectWithCompany | null {
  const alvoNome = semAcento(nome);
  const alvoEmail = email?.trim().toLowerCase();
  return (
    contatos.find(
      (c) => semAcento(c.contact_name) === alvoNome || (!!alvoEmail && c.contact_email?.trim().toLowerCase() === alvoEmail),
    ) ?? null
  );
}

/** Situação da empresa pela mesma regra da tela Empresas, a partir de todos os contatos dela. */
export async function situacaoDe(empresa: ProspectCompanyDB): Promise<{
  status: CompanyProspectStatus;
  contatos: ProspectWithCompany[];
}> {
  const contatos = await db.listarContatos({ companyId: empresa.id, incluirEncerrados: true, limite: 200 });
  return { status: companyProspectStatus(empresa, contatos), contatos };
}
