import { bestFit, companyFit } from '@/lib/prospecting/fit';
import type { ProspectContactRole, ProspectStage, ProspectWithCompany } from '@/types/prospect';
import type {
  BantDaOportunidade,
  EstadoBant,
  EvidenciaBantDB,
  IndicioDoPulse,
  LetraBant,
  LetraDoBant,
  SituacaoEvidencia,
} from '@/types/bant';

/**
 * Regras do BANT da oportunidade (US-0022, decisões de 19/11/2026). Módulo puro: a tela e o MCP
 * usam as mesmas regras (TD-0022).
 *
 * - Estado da letra = a evidência aceita mais recente; sem nenhuma, o indício do Pulse; senão
 *   "não sei". A IA só propõe: proposta não conta até a pessoa aceitar.
 * - Nota = pontos ÷ 8, de 0 a 100 (indício 1, confirmado 2). Pesos iguais para as quatro letras.
 * - A meta da etapa só orienta; a entrada em "Oportunidade qualificada" exige nota 75 e nenhuma
 *   letra "não atende".
 */

export const LETRAS_BANT: ReadonlyArray<{ letra: LetraBant; nome: string; pergunta: string }> = [
  { letra: 'B', nome: 'Budget', pergunta: 'Tem porte e verba para o nosso ticket?' },
  { letra: 'A', nome: 'Authority', pergunta: 'Quem decide, e como chegamos nessa pessoa?' },
  { letra: 'N', nome: 'Need', pergunta: 'Há uma dor que resolvemos?' },
  { letra: 'T', nome: 'Timing', pergunta: 'Por que agora?' },
];

export const ESTADOS_BANT: ReadonlyArray<{ valor: EstadoBant; rotulo: string }> = [
  { valor: 'nao_sei', rotulo: 'Não sei' },
  { valor: 'indicio', rotulo: 'Indício' },
  { valor: 'confirmado', rotulo: 'Confirmado' },
  { valor: 'nao_atende', rotulo: 'Não atende' },
];

const ACEITA: SituacaoEvidencia = 'aceita';
const PROPOSTA: SituacaoEvidencia = 'proposta';
const NAO_ATENDE: EstadoBant = 'nao_atende';
const INDICIO: EstadoBant = 'indicio';
const NAO_SEI: EstadoBant = 'nao_sei';

const PONTOS: Record<EstadoBant, number> = { nao_sei: 0, indicio: 1, confirmado: 2, nao_atende: 0 };
const PONTOS_MAXIMOS = 8;

export const NOTA_PARA_QUALIFICAR = 75;

/** Meta da nota por etapa (19/11/2026). Desfechos não têm meta. */
const META_POR_ETAPA: Partial<Record<ProspectStage, number>> = {
  qualificacao: 38,
  a_abordar: 38,
  em_cadencia: 38,
  respondeu: 38,
  reuniao_agendada: 50,
  reuniao_feita: 50,
  qualificado: NOTA_PARA_QUALIFICAR,
};

export function metaDaEtapa(etapa: ProspectStage): number | null {
  return META_POR_ETAPA[etapa] ?? null;
}

export function rotuloDoEstado(estado: EstadoBant): string {
  return ESTADOS_BANT.find((e) => e.valor === estado)?.rotulo ?? estado;
}

// ---------- indícios do Pulse (regra, sem IA — ADR-0042) ----------

const DEZ_MILHOES = 10_000_000;
const FIT_QUE_INDICA_NECESSIDADE = 60;
const DECISOR: ProspectContactRole = 'decisor';

const emMilhoes = (valor: number) => `R$ ${(valor / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;

function indicioDeBudget(p: ProspectWithCompany): IndicioDoPulse | null {
  const faturamento = p.company?.faturamento_anual;
  if (faturamento == null || faturamento < DEZ_MILHOES) return null;
  return { letra: 'B', texto: `Faturamento de ${emMilhoes(faturamento)}, no porte das nossas contas.`, fonte: 'Faturamento da empresa no Pulse' };
}

function indicioDeAutoridade(p: ProspectWithCompany): IndicioDoPulse | null {
  const decisor = (p.contacts ?? []).find((c) => c.role === DECISOR);
  if (!decisor?.contact) return null;
  return { letra: 'A', texto: `${decisor.contact.name} está na oportunidade como Decisor.`, fonte: 'Contatos da oportunidade' };
}

function indicioDeNecessidade(p: ProspectWithCompany): IndicioDoPulse | null {
  if (!p.company) return null;
  const melhor = bestFit(companyFit(p.company, p.company.fomento ?? null));
  if (!melhor || melhor.nota < FIT_QUE_INDICA_NECESSIDADE) return null;
  return { letra: 'N', texto: `Fit ${melhor.nota} em ${melhor.rotulo}.`, fonte: 'Nota de fit do Pulse' };
}

/** B pelo faturamento, A pelo Decisor, N pelo fit. Timing ainda não tem regra (US-0022). */
export function indiciosDoPulse(p: ProspectWithCompany): IndicioDoPulse[] {
  return [indicioDeBudget(p), indicioDeAutoridade(p), indicioDeNecessidade(p)].filter((i): i is IndicioDoPulse => !!i);
}

// ---------- estado, nota, meta ----------

const quando = (e: EvidenciaBantDB) => e.decidida_em ?? e.created_at;

function aceitaMaisRecente(evidencias: EvidenciaBantDB[], letra: LetraBant): EvidenciaBantDB | null {
  const daLetra = evidencias.filter((e) => e.letra === letra && e.situacao === ACEITA);
  return daLetra.sort((a, b) => quando(b).localeCompare(quando(a)))[0] ?? null;
}

function letraDoBant(letra: LetraBant, evidencias: EvidenciaBantDB[], indicios: IndicioDoPulse[]): LetraDoBant {
  const evidencia = aceitaMaisRecente(evidencias, letra);
  const indicio = indicios.find((i) => i.letra === letra) ?? null;
  if (evidencia) return { letra, estado: evidencia.estado, evidencia, indicio };
  return { letra, estado: indicio ? INDICIO : NAO_SEI, evidencia: null, indicio };
}

export function bantDaOportunidade(p: ProspectWithCompany, evidencias: EvidenciaBantDB[]): BantDaOportunidade {
  const indicios = indiciosDoPulse(p);
  const lista = LETRAS_BANT.map(({ letra }) => letraDoBant(letra, evidencias, indicios));
  const pontos = lista.reduce((soma, l) => soma + PONTOS[l.estado], 0);
  return {
    letras: Object.fromEntries(lista.map((l) => [l.letra, l])) as Record<LetraBant, LetraDoBant>,
    nota: Math.round((pontos / PONTOS_MAXIMOS) * 100),
    meta: metaDaEtapa(p.stage),
    temNaoAtende: lista.some((l) => l.estado === NAO_ATENDE),
    propostas: evidencias.filter((e) => e.situacao === PROPOSTA),
  };
}

/**
 * O que impede a entrada em "Oportunidade qualificada", em português; nulo quando pode entrar.
 * Ex.: "Nota 63: confirme mais uma letra (precisa de 75)".
 */
export function oQueFaltaParaQualificar(bant: BantDaOportunidade): string | null {
  const contra = Object.values(bant.letras).filter((l) => l.estado === NAO_ATENDE).map((l) => l.letra);
  if (contra.length) return `${contra.join(', ')} marcado como "Não atende". Revise antes de qualificar, ou registre a Perda.`;
  if (bant.nota >= NOTA_PARA_QUALIFICAR) return null;
  return `BANT ${bant.nota}: precisa de ${NOTA_PARA_QUALIFICAR} (três letras confirmadas, ou duas confirmadas e duas com indício).`;
}

/** "Não atende" sugere a Perda com o motivo da lista fechada; Authority não tem motivo próprio. */
const MOTIVO_DA_PERDA: Partial<Record<LetraBant, string>> = { B: 'sem_orcamento', N: 'sem_fit', T: 'momento_errado' };

export function motivoDePerdaSugerido(letra: LetraBant): string | null {
  return MOTIVO_DA_PERDA[letra] ?? null;
}
