import { PROSPECT_FUNNEL_STAGES, type ProspectStage, type ProspectWithCompany } from '@/types/prospect';
import type {
  ActivityLite,
  Milestone,
  ProspectMilestones,
  ProspectStageChangeDB,
  StageChangeSource,
} from '@/types/prospectMetrics';
import { localDay } from './periods';

/**
 * Marcos do funil por contato (28/09/2026): QUANDO cada contato chegou a cada etapa.
 *
 * Um marco é a primeira vez que o contato alcança a etapa OU uma adiante dela. Quem pula
 * de Respondeu direto para Reunião feita conta também em Reunião agendada — a mesma regra
 * acumulada do funil (`metrics.ts`).
 *
 * As fontes são as mais exatas de cada marco:
 *   - ativação: `first_touch_at`, imutável depois do 1º toque;
 *   - conversa: a 1ª atividade com resposta, com a data da atividade (que pode ser
 *     retroativa — a data da mudança de etapa seria a do registro, não a do fato);
 *   - reunião e qualificação: `prospect_stage_changes`, a única que tem essa data.
 */

/** Convertido fica depois de Qualificada: quem converteu passou por todas as etapas. */
const POSICAO = new Map<ProspectStage, number>(
  [...PROSPECT_FUNNEL_STAGES, 'convertido' as const].map((etapa, i) => [etapa, i]),
);

const posicaoDe = (etapa: ProspectStage) => POSICAO.get(etapa) ?? -1;

const NIVEL = {
  agendada: posicaoDe('reuniao_agendada'),
  feita: posicaoDe('reuniao_feita'),
  qualificada: posicaoDe('qualificado'),
};

/** Fontes com data real. `anterior` diz só onde o contato estava quando o histórico começou. */
const COM_DATA = new Set<StageChangeSource>(['registrado', 'reconstruido']);

export function hasRealDate(mudanca: Pick<ProspectStageChangeDB, 'source'>): boolean {
  return COM_DATA.has(mudanca.source);
}

function marco(nivel: number, atual: ProspectStage, mudancas: ProspectStageChangeDB[]): Milestone {
  const alcancam = mudancas.filter((m) => posicaoDe(m.to_stage) >= nivel);
  const semData = alcancam.some((m) => !hasRealDate(m));
  const datas = alcancam.filter(hasRealDate).map((m) => m.occurred_on).sort();
  return {
    reached: posicaoDe(atual) >= nivel || alcancam.length > 0,
    date: semData ? null : datas[0] ?? null,
  };
}

function agrupar<T>(itens: T[], chave: (item: T) => string): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const item of itens) {
    const k = chave(item);
    mapa.set(k, [...(mapa.get(k) ?? []), item]);
  }
  return mapa;
}

function primeiraRespostaPorContato(respostas: ActivityLite[]): Map<string, ActivityLite> {
  const primeira = new Map<string, ActivityLite>();
  for (const a of respostas) {
    const atual = primeira.get(a.prospect_id);
    if (a.got_response && (!atual || a.sequence_no < atual.sequence_no)) primeira.set(a.prospect_id, a);
  }
  return primeira;
}

export function buildMilestones(
  prospects: ProspectWithCompany[],
  respostas: ActivityLite[],
  mudancas: ProspectStageChangeDB[],
): ProspectMilestones[] {
  const resposta = primeiraRespostaPorContato(respostas);
  const porContato = agrupar(mudancas, (m) => m.prospect_id);
  return prospects.map((prospect) => {
    const doContato = porContato.get(prospect.id) ?? [];
    const primeira = resposta.get(prospect.id);
    return {
      prospect,
      cadastrado: localDay(prospect.created_at),
      ativado: prospect.first_touch_at ? prospect.first_touch_at.slice(0, 10) : null,
      conversa: primeira?.activity_date ?? null,
      toquesAteResponder: primeira?.sequence_no ?? null,
      agendada: marco(NIVEL.agendada, prospect.stage, doContato),
      feita: marco(NIVEL.feita, prospect.stage, doContato),
      qualificada: marco(NIVEL.qualificada, prospect.stage, doContato),
    };
  });
}

/**
 * O dia em que o histórico de etapa começou: o marco `anterior` mais antigo. `null` quando
 * a organização não tinha contatos antes dele — então não há período sem registro.
 */
export function historyStartOf(mudancas: ProspectStageChangeDB[]): string | null {
  const inicio = mudancas
    .filter((m) => !hasRealDate(m))
    .map((m) => m.occurred_on)
    .sort()[0];
  return inicio ?? null;
}
