import type { ProspectActivityWithOwner, ProspectWithCompany } from '@/types/prospect';

/**
 * As quatro métricas da prospecção, calculadas em memória.
 *
 * Todas dividem por CONTATO TOCADO, não por atividade: a pergunta é "de cada dez pessoas
 * abordadas, quantas responderam", e dividir por atividade faria quem insiste mais parecer
 * pior do que é.
 */

export type ProspectCut = 'lever' | 'ring' | 'tier' | 'owner';

export interface ResponseByTouch {
  sequenceNo: number;
  activities: number;
  responses: number;
  rate: number | null;
}

export interface ActivityPerPerson {
  ownerId: string;
  activities: number;
  perBusinessDay: number;
}

export interface ProspectMetrics {
  touchedContacts: number;
  totalActivities: number;
  responseRate: number | null;
  meetingRate: number | null;
  responseByTouch: ResponseByTouch[];
  activitiesPerPerson: ActivityPerPerson[];
}

/** Etapas que provam que houve reunião — ou que o contato já passou dela. */
const MEETING_REACHED = new Set(['reuniao_agendada', 'qualificado', 'convertido']);

export function calculateProspectMetrics(
  prospects: ProspectWithCompany[],
  activities: ProspectActivityWithOwner[],
  businessDays: number,
): ProspectMetrics {
  const porContato = new Map<string, ProspectActivityWithOwner[]>();
  activities.forEach((a) => {
    const lista = porContato.get(a.prospect_id) ?? [];
    lista.push(a);
    porContato.set(a.prospect_id, lista);
  });

  const tocados = prospects.filter((p) => porContato.has(p.id));
  const responderam = tocados.filter((p) =>
    (porContato.get(p.id) ?? []).some((a) => a.got_response),
  ).length;
  const comReuniao = tocados.filter((p) => MEETING_REACHED.has(p.stage)).length;

  return {
    touchedContacts: tocados.length,
    totalActivities: activities.length,
    responseRate: taxa(responderam, tocados.length),
    meetingRate: taxa(comReuniao, tocados.length),
    responseByTouch: responseByTouch(activities),
    activitiesPerPerson: activitiesPerPerson(activities, businessDays),
  };
}

/**
 * A métrica que quase ninguém tem: em que toque a resposta aparece.
 *
 * É ela que diz se a cadência deve ter 3 ou 6 toques — se a taxa despenca depois do
 * terceiro, insistir mais é desperdício; se ainda rende no quinto, encurtar joga fora
 * resposta que viria.
 */
export function responseByTouch(activities: ProspectActivityWithOwner[]): ResponseByTouch[] {
  const mapa = new Map<number, { activities: number; responses: number }>();
  activities.forEach((a) => {
    const atual = mapa.get(a.sequence_no) ?? { activities: 0, responses: 0 };
    atual.activities += 1;
    if (a.got_response) atual.responses += 1;
    mapa.set(a.sequence_no, atual);
  });

  return [...mapa.entries()]
    .map(([sequenceNo, v]) => ({
      sequenceNo,
      activities: v.activities,
      responses: v.responses,
      rate: taxa(v.responses, v.activities),
    }))
    .sort((a, b) => a.sequenceNo - b.sequenceNo);
}

function activitiesPerPerson(
  activities: ProspectActivityWithOwner[],
  businessDays: number,
): ActivityPerPerson[] {
  const mapa = new Map<string, number>();
  activities.forEach((a) => {
    if (!a.owner_id) return;
    mapa.set(a.owner_id, (mapa.get(a.owner_id) ?? 0) + 1);
  });

  const dias = Math.max(businessDays, 1);
  return [...mapa.entries()]
    .map(([ownerId, total]) => ({
      ownerId,
      activities: total,
      perBusinessDay: total / dias,
    }))
    .sort((a, b) => b.activities - a.activities);
}

/** O valor do corte escolhido, para agrupar. "—" quando o campo não foi preenchido. */
export function cutValue(prospect: ProspectWithCompany, cut: ProspectCut): string {
  if (cut === 'lever') return prospect.lever?.trim() || '—';
  if (cut === 'ring') return prospect.company?.ring?.trim() || '—';
  if (cut === 'tier') return prospect.company?.tier?.trim() || '—';
  return prospect.owner_id ?? '—';
}

export function groupByCut(
  prospects: ProspectWithCompany[],
  activities: ProspectActivityWithOwner[],
  cut: ProspectCut,
  businessDays: number,
): Array<{ key: string; metrics: ProspectMetrics }> {
  const grupos = new Map<string, ProspectWithCompany[]>();
  prospects.forEach((p) => {
    const chave = cutValue(p, cut);
    const lista = grupos.get(chave) ?? [];
    lista.push(p);
    grupos.set(chave, lista);
  });

  return [...grupos.entries()]
    .map(([key, lista]) => {
      const ids = new Set(lista.map((p) => p.id));
      const doGrupo = activities.filter((a) => ids.has(a.prospect_id));
      return { key, metrics: calculateProspectMetrics(lista, doGrupo, businessDays) };
    })
    .filter((g) => g.metrics.touchedContacts > 0)
    .sort((a, b) => b.metrics.touchedContacts - a.metrics.touchedContacts);
}

/**
 * Dias úteis entre duas datas ISO, inclusive.
 *
 * Sem denominador não existe "atividades por dia" — e usar dia corrido faria a meta parecer
 * cumprida em semana com feriado. Feriado municipal não entra: é aproximação consciente.
 */
export function countBusinessDays(startISO: string, endISO: string): number {
  const inicio = new Date(`${startISO}T00:00:00`);
  const fim = new Date(`${endISO}T00:00:00`);
  let dias = 0;
  for (const cursor = inicio; cursor <= fim; cursor.setDate(cursor.getDate() + 1)) {
    const diaDaSemana = cursor.getDay();
    if (diaDaSemana !== 0 && diaDaSemana !== 6) dias += 1;
  }
  return dias;
}

/** Sem base, a taxa é nula — nunca 0%, que seria lido como "ninguém respondeu". */
function taxa(parte: number, total: number): number | null {
  if (total <= 0) return null;
  return parte / total;
}

export function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}
