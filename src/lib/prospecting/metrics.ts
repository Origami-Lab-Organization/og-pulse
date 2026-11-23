import type { ProspectActivityWithOwner, ProspectWithCompany } from '@/types/prospect';

/**
 * O funil de prospecção fria, na definição do documento do time.
 *
 * Só a parte de prospecção: termina em Oportunidade qualificada (SQO). Contrato fechado e
 * valor de pipeline são do comercial e não entram aqui — pôr receita neste módulo é
 * exatamente o que a separação entre os dois pipelines existe para impedir.
 *
 * Desde 17/09/2026 o funil separa reunião AGENDADA de reunião FEITA, o que torna a taxa
 * de comparecimento calculável — é ela que mostra quando a agenda enche e a conversa não
 * acontece.
 *
 * Todas as taxas dividem por CONTATO, nunca por atividade: a pergunta é "de cada dez
 * pessoas abordadas, quantas responderam". Dividir por atividade faria quem insiste mais
 * parecer pior do que é.
 */

/**
 * Cada etapa é "alcançada" por quem está nela OU adiante — o funil é acumulado, senão
 * avançar um contato o faria sumir do passo anterior e a conversão passaria de 100%.
 */
const AGENDAMENTO_ALCANCADO = new Set([
  'reuniao_agendada', 'reuniao_feita', 'qualificado', 'ganho', 'convertido',
]);
const REUNIAO_FEITA_ALCANCADA = new Set(['reuniao_feita', 'qualificado', 'ganho', 'convertido']);
// Ganho (28/09/2026) só vem de Reunião feita em diante: quem vendeu também qualificou.
const QUALIFICACAO_ALCANCADA = new Set(['qualificado', 'ganho', 'convertido']);

export interface FunnelStep {
  key: string;
  label: string;
  value: number;
  /** O que a etapa responde, na linguagem do documento do time. */
  question: string;
}

export interface FunnelRate {
  /** Texto já formatado: "15%" ou "2,4". */
  value: string;
  label: string;
}

export interface ProspectingFunnel {
  steps: FunnelStep[];
  /** Uma taxa entre cada par de etapas: sempre `steps.length - 1` itens. */
  rates: FunnelRate[];
}

/** As seis etapas do funil, em ordem — rótulo e pergunta de cada uma. */
export const FUNNEL_STEP_META: ReadonlyArray<Omit<FunnelStep, 'value'>> = [
  { key: 'contas', label: 'Contas abertas', question: 'O topo do funil está secando?' },
  { key: 'contatos', label: 'Contatos ativados', question: 'Estou prospectando ou apenas disparando mensagem?' },
  { key: 'conversas', label: 'Conversas iniciadas', question: 'A lista e a mensagem de abertura estão certas?' },
  { key: 'agendadas', label: 'Reuniões agendadas', question: 'O esforço da semana virou agenda?' },
  { key: 'feitas', label: 'Reuniões feitas', question: 'O trabalho virou conversa real com quem pode comprar?' },
  { key: 'qualificadas', label: 'Oportunidades qualificadas', question: 'A conversa virou negócio de verdade?' },
];

/** A taxa entre cada par de etapas, na mesma ordem. */
export const FUNNEL_RATE_LABELS = [
  'contatos por conta',
  'taxa de resposta',
  'taxa de agendamento',
  'taxa de comparecimento',
  'taxa de qualificação',
] as const;

export function funnelSteps(values: readonly number[]): FunnelStep[] {
  return FUNNEL_STEP_META.map((meta, i) => ({ ...meta, value: values[i] ?? 0 }));
}

export function calculateProspectingFunnel(
  prospects: ProspectWithCompany[],
  activities: ProspectActivityWithOwner[],
): ProspectingFunnel {
  const tocadosIds = new Set(activities.map((a) => a.prospect_id));
  const responderamIds = new Set(
    activities.filter((a) => a.got_response).map((a) => a.prospect_id),
  );

  const tocados = prospects.filter((p) => tocadosIds.has(p.id));
  const contas = new Set(tocados.map((p) => p.company_id)).size;
  const contatos = tocados.length;
  const conversas = tocados.filter((p) => responderamIds.has(p.id)).length;
  const agendadas = tocados.filter((p) => AGENDAMENTO_ALCANCADO.has(p.stage)).length;
  const feitas = tocados.filter((p) => REUNIAO_FEITA_ALCANCADA.has(p.stage)).length;
  const qualificadas = tocados.filter((p) => QUALIFICACAO_ALCANCADA.has(p.stage)).length;

  return {
    steps: funnelSteps([contas, contatos, conversas, agendadas, feitas, qualificadas]),
    rates: [
      { value: formatRatio(contatos, contas), label: FUNNEL_RATE_LABELS[0] },
      { value: formatRate(taxa(conversas, contatos)), label: FUNNEL_RATE_LABELS[1] },
      { value: formatRate(taxa(agendadas, conversas)), label: FUNNEL_RATE_LABELS[2] },
      { value: formatRate(taxa(feitas, agendadas)), label: FUNNEL_RATE_LABELS[3] },
      { value: formatRate(taxa(qualificadas, feitas)), label: FUNNEL_RATE_LABELS[4] },
    ],
  };
}

// A "Cobertura da lista" (contas cadastradas trabalhadas e nunca abordadas) saiu em 23/11/2026:
// a lista de contas saiu da tela, e a triagem da Base e o "A abordar parado" ocupam o lugar
// (US-0021, `qualificacaoMetrics.ts`).

export type ProspectCut = 'lever' | 'owner' | 'tipo_conta';

export interface CutRow {
  key: string;
  contatos: number;
  conversas: number;
  agendadas: number;
  feitas: number;
  qualificadas: number;
}

/** O mesmo funil quebrado por alavanca, responsável ou tipo de conta. */
export function funnelByCut(
  prospects: ProspectWithCompany[],
  activities: ProspectActivityWithOwner[],
  cut: ProspectCut,
): CutRow[] {
  const grupos = new Map<string, ProspectWithCompany[]>();
  prospects.forEach((p) => {
    const chave = cutValue(p, cut);
    grupos.set(chave, [...(grupos.get(chave) ?? []), p]);
  });

  return [...grupos.entries()]
    .map(([key, lista]) => {
      const ids = new Set(lista.map((p) => p.id));
      const doGrupo = activities.filter((a) => ids.has(a.prospect_id));
      const funil = calculateProspectingFunnel(lista, doGrupo);
      const [, contatos, conversas, agendadas, feitas, qualificadas] = funil.steps;
      return {
        key,
        contatos: contatos.value,
        conversas: conversas.value,
        agendadas: agendadas.value,
        feitas: feitas.value,
        qualificadas: qualificadas.value,
      };
    })
    .filter((linha) => linha.contatos > 0)
    .sort((a, b) => b.contatos - a.contatos);
}

/** O grupo de quem não tem valor no recorte: sem alavanca, sem responsável ou sem tipo de conta. */
export const SEM_RECORTE = '—';

export function cutValue(prospect: ProspectWithCompany, cut: ProspectCut): string {
  if (cut === 'lever') return prospect.lever?.trim() || SEM_RECORTE;
  if (cut === 'tipo_conta') return prospect.company?.tipo_conta ?? SEM_RECORTE;
  return prospect.owner_id ?? SEM_RECORTE;
}

/** Sem base, a taxa é nula — nunca 0%, que seria lido como "ninguém respondeu". */
function taxa(parte: number, total: number): number | null {
  if (total <= 0) return null;
  return parte / total;
}

export function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  return `${Math.round(rate * 100)}%`;
}

export function formatRatio(parte: number, total: number): string {
  if (total <= 0) return '—';
  return (parte / total).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
