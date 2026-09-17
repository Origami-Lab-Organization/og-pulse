import type { ProspectActivityWithOwner, ProspectWithCompany } from '@/types/prospect';

/**
 * O funil de prospecção fria, na definição do documento do time.
 *
 * Só a parte de prospecção: termina em Oportunidade qualificada (SQO). Contrato fechado e
 * valor de pipeline são do comercial e não entram aqui — pôr receita neste módulo é
 * exatamente o que a separação entre os dois pipelines existe para impedir.
 *
 * "Reuniões realizadas" (taxa de comparecimento) fica de fora: o módulo não guarda
 * presença em reunião, e um passo que ninguém alimenta viraria número decorativo.
 *
 * Todas as taxas dividem por CONTATO, nunca por atividade: a pergunta é "de cada dez
 * pessoas abordadas, quantas responderam". Dividir por atividade faria quem insiste mais
 * parecer pior do que é.
 */

/** Etapas que provam que a reunião foi agendada — ou que o contato já passou disso. */
const REUNIAO_ALCANCADA = new Set(['reuniao_agendada', 'qualificado', 'convertido']);
const QUALIFICACAO_ALCANCADA = new Set(['qualificado', 'convertido']);

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
  const reunioes = tocados.filter((p) => REUNIAO_ALCANCADA.has(p.stage)).length;
  const qualificadas = tocados.filter((p) => QUALIFICACAO_ALCANCADA.has(p.stage)).length;

  return {
    steps: [
      {
        key: 'contas',
        label: 'Contas abertas',
        value: contas,
        question: 'O topo do funil está secando?',
      },
      {
        key: 'contatos',
        label: 'Contatos ativados',
        value: contatos,
        question: 'Estou prospectando ou apenas disparando mensagem?',
      },
      {
        key: 'conversas',
        label: 'Conversas iniciadas',
        value: conversas,
        question: 'A lista e a mensagem de abertura estão certas?',
      },
      {
        key: 'reunioes',
        label: 'Reuniões agendadas',
        value: reunioes,
        question: 'O esforço da semana virou agenda?',
      },
      {
        key: 'qualificadas',
        label: 'Oportunidades qualificadas',
        value: qualificadas,
        question: 'A conversa virou negócio de verdade?',
      },
    ],
    rates: [
      { value: formatRatio(contatos, contas), label: 'contatos por conta' },
      { value: formatRate(taxa(conversas, contatos)), label: 'taxa de resposta' },
      { value: formatRate(taxa(reunioes, conversas)), label: 'taxa de agendamento' },
      { value: formatRate(taxa(qualificadas, reunioes)), label: 'taxa de qualificação' },
    ],
  };
}

export interface AccountCoverage {
  /** Contas da lista que receberam atividade no período. */
  abertas: number;
  /** Tamanho da lista a abordar: toda conta com ao menos um contato cadastrado. */
  naLista: number;
  /** abertas ÷ naLista. `null` quando não há lista — nunca 0%, que seria lido como fracasso. */
  taxa: number | null;
  /** Contas que nunca receberam atividade nenhuma, em nenhum período. */
  nuncaAbordadas: number;
}

/**
 * Cobertura de contas: do que está na lista, quanto de fato virou trabalho.
 *
 * Fica fora do funil de propósito. O funil mede o que acontece DEPOIS de abrir a conta;
 * esta taxa mede se a lista está sendo consumida — uma lista grande e parada produz um
 * funil de aparência saudável com volume minúsculo, e só este número denuncia isso.
 *
 * `nuncaAbordadas` não olha o período: é a dívida acumulada da lista, e o número que
 * responde "o que eu ainda nem comecei".
 */
export function calculateAccountCoverage(
  prospects: ProspectWithCompany[],
  activities: ProspectActivityWithOwner[],
): AccountCoverage {
  const tocadosNoPeriodo = new Set(activities.map((a) => a.prospect_id));

  const naLista = new Set(prospects.map((p) => p.company_id));
  const abertas = new Set(
    prospects.filter((p) => tocadosNoPeriodo.has(p.id)).map((p) => p.company_id),
  );
  const jaTocadasAlgumaVez = new Set(
    prospects.filter((p) => p.activity_count > 0).map((p) => p.company_id),
  );

  return {
    abertas: abertas.size,
    naLista: naLista.size,
    taxa: taxa(abertas.size, naLista.size),
    nuncaAbordadas: naLista.size - jaTocadasAlgumaVez.size,
  };
}

export type ProspectCut = 'lever' | 'ring' | 'tier' | 'owner';

export interface CutRow {
  key: string;
  contatos: number;
  conversas: number;
  reunioes: number;
  qualificadas: number;
}

/** O mesmo funil quebrado por alavanca, anel, tier ou responsável. */
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
      const [, contatos, conversas, reunioes, qualificadas] = funil.steps;
      return {
        key,
        contatos: contatos.value,
        conversas: conversas.value,
        reunioes: reunioes.value,
        qualificadas: qualificadas.value,
      };
    })
    .filter((linha) => linha.contatos > 0)
    .sort((a, b) => b.contatos - a.contatos);
}

export function cutValue(prospect: ProspectWithCompany, cut: ProspectCut): string {
  if (cut === 'lever') return prospect.lever?.trim() || '—';
  if (cut === 'ring') return prospect.company?.ring?.trim() || '—';
  if (cut === 'tier') return prospect.company?.tier?.trim() || '—';
  return prospect.owner_id ?? '—';
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

function formatRatio(parte: number, total: number): string {
  if (total <= 0) return '—';
  return (parte / total).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
