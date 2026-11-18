import { CnpjLookupLimitError, lookupCnpj } from '@/services/cnpjLookupService';
import { prospectCompanyService } from '@/services/prospectCompanyService';
import { createProspect, deleteProspect, fetchProspectById } from '@/services/prospectService';
import { saveCompanyReceita } from '@/services/receitaService';
import { tabela } from '@/services/prospectingTables';
import {
  PROSPECT_TERMINAL_STAGES,
  type AberturaDaBase,
  type AbrirOportunidadeInput,
  type FaturamentoBase,
  type ItemParaAbordar,
  type OportunidadeEmAndamento,
  type ProspectCompanyDB,
  type ResultadoParaAbordar,
} from '@/types/prospect';

/**
 * Mover empresas da base da Receita para abordar (US-0008).
 *
 * A empresa é cadastrada pelo mesmo caminho da importação por CNPJ (ADR-0041): consulta
 * a Receita, cria a empresa e grava o retrato e a rede de sócios. Se ela já existe no tenant, é
 * reaproveitada; se já tem oportunidade em andamento, nada é aberto. A oportunidade nasce em
 * A abordar (padrão do banco), sem contato nem alavanca: a alavanca é o canal de chegada e é
 * definida ao abordar (decisão de 18/11/2026). O tipo de conta vai para a empresa.
 */

const CALCULADO: FaturamentoBase = 'calculado';
const CANAL_PADRAO = 'email';
// Entre consultas à Receita, como na importação: a BrasilAPI limita as consultas por minuto.
const PAUSA_ENTRE_CONSULTAS_MS = 1200;
const ESPERA_DO_LIMITE_MS = 60_000;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Oportunidade em andamento da empresa, se houver (etapa fora das encerradas). */
async function emAndamento(companyId: string): Promise<OportunidadeEmAndamento | null> {
  const encerradas = `(${PROSPECT_TERMINAL_STAGES.join(',')})`;
  const { data, error } = await tabela('prospects')
    .select('id, stage, owner_id')
    .eq('company_id', companyId)
    .not('stage', 'in', encerradas)
    .limit(1);
  if (error) throw error;
  return (data?.[0] as OportunidadeEmAndamento | undefined) ?? null;
}

/** Uma nova tentativa depois de um minuto, se a BrasilAPI recusou pelo limite. */
async function consultarReceita(cnpj: string) {
  try {
    return await lookupCnpj(cnpj);
  } catch (erro) {
    if (!(erro instanceof CnpjLookupLimitError)) throw erro;
    await esperar(ESPERA_DO_LIMITE_MS);
    return lookupCnpj(cnpj);
  }
}

/** Cria a empresa com os dados da Receita; a consulta que falha impede colocar (cenário 10). */
async function criarEmpresa(input: AbrirOportunidadeInput): Promise<ProspectCompanyDB> {
  const receita = await consultarReceita(input.cnpj);
  const faturamento = input.faturamentoEstimado ? { faturamento_anual: input.faturamentoEstimado, faturamento_anual_base: CALCULADO } : {};
  const empresa = await prospectCompanyService.create(
    { name: receita.nomeFantasia ?? receita.razaoSocial, cnpj: input.cnpj, segment: receita.segmento, tipo_conta: input.tipoConta, ...faturamento },
    input.tenantId,
    input.employeeId,
  );
  // Como na importação: sem o retrato, a empresa existe e a ficha oferece "Atualizar".
  await saveCompanyReceita(empresa.id, receita).catch(() => undefined);
  return empresa;
}

/** Empresa que já existe: grava o tipo e, se faltar, o faturamento calculado. */
async function completarEmpresa(empresa: ProspectCompanyDB, input: AbrirOportunidadeInput) {
  await prospectCompanyService.setTipoDeConta(empresa.id, input.tipoConta);
  if (empresa.faturamento_anual == null && input.faturamentoEstimado) {
    await prospectCompanyService.setFaturamento(empresa.id, input.faturamentoEstimado, CALCULADO);
  }
}

export async function abrirOportunidadeDaBase(input: AbrirOportunidadeInput): Promise<AberturaDaBase> {
  const [existente] = await prospectCompanyService.findByCnpjs([input.cnpj], input.tenantId);
  if (existente) {
    const andamento = await emAndamento(existente.id);
    if (andamento) return { aberta: false, emAndamento: andamento, empresa: existente };
    await completarEmpresa(existente, input);
  }
  const empresa = existente ?? (await criarEmpresa(input));
  const prospect = await createProspect({
    tenant_id: input.tenantId,
    company_id: empresa.id,
    primary_channel: CANAL_PADRAO,
    owner_id: input.ownerId,
    created_by: input.employeeId,
  });
  return { aberta: true, prospect, empresaCriada: !existente };
}

/**
 * Várias empresas, uma por vez (cenários 2, 5 e 10): a falha de uma não impede as outras.
 * `aoAvancar` informa o andamento para a janela.
 */
export async function colocarParaAbordar(
  itens: ItemParaAbordar[],
  comum: Pick<AbrirOportunidadeInput, 'tenantId' | 'employeeId' | 'ownerId'>,
  aoAvancar?: (feitas: number) => void,
): Promise<ResultadoParaAbordar[]> {
  const resultados: ResultadoParaAbordar[] = [];
  for (const [i, item] of itens.entries()) {
    try {
      resultados.push({ item, resultado: await abrirOportunidadeDaBase({ ...item, ...comum }) });
    } catch (erro) {
      resultados.push({ item, erro });
    }
    aoAvancar?.(i + 1);
    if (i < itens.length - 1) await esperar(PAUSA_ENTRE_CONSULTAS_MS); // harness-ok: pausa proposital entre consultas à Receita
  }
  return resultados;
}

export class NaoDaMaisParaDesfazer extends Error {
  constructor() {
    super('A oportunidade já tem atividade, tarefa ou contato. Registre a Perda no Pipeline.');
  }
}

async function temAlgo(tabelaFilha: 'prospect_tasks' | 'prospect_opportunity_contacts', prospectId: string): Promise<boolean> {
  const { count, error } = await tabela(tabelaFilha).select('prospect_id', { count: 'exact', head: true }).eq('prospect_id', prospectId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/**
 * Desfazer (cenário 7): apaga só a oportunidade, enquanto ela não tem atividade, tarefa nem
 * contato. O cadastro da empresa fica, com os dados da Receita e o tipo de conta.
 */
export async function desfazerAbertura(prospectId: string): Promise<void> {
  const prospect = await fetchProspectById(prospectId);
  if (!prospect) return;
  const usada = prospect.activity_count > 0
    || (await temAlgo('prospect_tasks', prospectId))
    || (await temAlgo('prospect_opportunity_contacts', prospectId));
  if (usada) throw new NaoDaMaisParaDesfazer();
  await deleteProspect(prospectId);
}

/** Desfaz várias; devolve quantas não deu para desfazer. */
export async function desfazerAberturas(prospectIds: string[]): Promise<number> {
  let ficaram = 0;
  for (const id of prospectIds) {
    try {
      await desfazerAbertura(id);
    } catch {
      ficaram += 1;
    }
  }
  return ficaram;
}
