/**
 * Texto das respostas. Rótulos SEMPRE derivados de `src/types/prospect.ts` e
 * `src/lib/interactionChannels.ts`, para a conversa usar os mesmos nomes da tela.
 */

import { getChannelLabel } from '@/lib/interactionChannels';
import {
  COMPANY_ACTION_LABEL,
  COMPANY_STATUS_META,
  type CompanyProspectStatus,
} from '@/lib/prospecting/companyStatus';
import {
  getDiscardReasonLabel,
  getLeverLabel,
  getProspectStageLabel,
  isTaskOverdue,
  type ProspectActivityDB,
  type ProspectCompanyDB,
  type ProspectTaskDB,
  type ProspectWithCompany,
} from '@/types/prospect';

type Valor = string | number | null | undefined;
type Par = [rotulo: string, valor: Valor];

/** Valor em reais. A coluna é numeric(14,2): já vem em centavos, não há o que arredondar. */
export function reais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function data(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function cnpj(valor: string | null): string | null {
  return valor?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') ?? null;
}

function rotulado(pares: Par[], separador: string): string {
  return pares
    .filter(([, valor]) => valor !== null && valor !== undefined && valor !== '')
    .map(([rotulo, valor]) => (rotulo ? `${rotulo}: ${valor}` : String(valor)))
    .join(separador);
}

function juntar(itens: Valor[]): string {
  return rotulado(itens.map((v) => ['', v]), ' · ');
}

function prefixado(prefixo: string, valor: string | null): string | null {
  return valor ? `${prefixo} ${valor}` : null;
}

export function empresaResumo(e: ProspectCompanyDB, contatos?: number): string {
  const detalhes = juntar([
    prefixado('CNPJ', cnpj(e.cnpj)),
    e.segment,
    prefixado('Anel', e.ring),
    prefixado('Tier', e.tier),
    contatos === undefined ? null : `${contatos} contato(s)`,
  ]);
  return `- **${e.name}**${detalhes ? ` — ${detalhes}` : ''}\n  ID: \`${e.id}\``;
}

export function empresaCompleta(e: ProspectCompanyDB): string {
  return rotulado(
    [
      ['', `**${e.name}**`],
      ['CNPJ', cnpj(e.cnpj)],
      ['Segmento', e.segment],
      ['Anel', e.ring],
      ['Tier', e.tier],
      ['Site', e.website],
      ['LinkedIn', e.linkedin_url],
      ['Instagram', e.instagram_url],
      ['Observações', e.notes],
      ['ID', `\`${e.id}\``],
    ],
    '\n',
  );
}

export function contatoResumo(p: ProspectWithCompany, pessoas: Map<string, string>): string {
  const detalhes = juntar([
    p.company?.name,
    p.contact_role,
    getProspectStageLabel(p.stage),
    `${p.activity_count} atividade(s)`,
    prefixado('próxima em', p.next_activity_on && data(p.next_activity_on)),
    pessoas.get(p.owner_id ?? ''),
  ]);
  return `- **${p.contact_name}** — ${detalhes}\n  ID: \`${p.id}\``;
}

function motivoDaPerda(p: ProspectWithCompany): string | null {
  return p.discard_reason ? getDiscardReasonLabel(p.discard_reason) : null;
}

const ETAPA_GANHO: ProspectWithCompany['stage'] = 'ganho';

/** Ganho sem valor é pendência, não zero: o card da tela fica sinalizado até alguém preencher. */
function valorDoGanho(p: ProspectWithCompany): string | null {
  if (p.stage !== ETAPA_GANHO) return null;
  return p.won_value === null ? 'sem valor — pendente de registro' : reais(Number(p.won_value));
}

export function contatoCompleto(p: ProspectWithCompany, pessoas: Map<string, string>): string {
  return rotulado(
    [
      ['', `## ${p.contact_name}`],
      ['Empresa', p.company?.name],
      ['Cargo', p.contact_role],
      ['Etapa', getProspectStageLabel(p.stage)],
      ['Ganho em', p.stage === ETAPA_GANHO ? data(p.won_on) : null],
      ['Valor vendido', valorDoGanho(p)],
      ['Motivo da perda', motivoDaPerda(p)],
      ['E-mail', p.contact_email],
      ['Telefone', p.contact_phone],
      ['LinkedIn', p.linkedin_url],
      ['Instagram', p.instagram_url],
      ['Canal principal', getChannelLabel(p.primary_channel)],
      ['Alavanca', getLeverLabel(p.lever)],
      ['Responsável', pessoas.get(p.owner_id ?? '') ?? p.owner_id],
      ['Atividades', p.activity_count],
      ['1º toque', p.first_touch_at && data(p.first_touch_at)],
      ['Próxima atividade', data(p.next_activity_on)],
      ['Convertido em oportunidade (antes de 28/09/2026)', p.converted_lead_id && `\`${p.converted_lead_id}\``],
      ['ID', `\`${p.id}\``],
    ],
    '\n',
  );
}

export function atividade(a: ProspectActivityDB): string {
  const cabecalho = juntar([
    `#${a.sequence_no}`,
    data(a.activity_date),
    getChannelLabel(a.channel),
    a.got_response ? 'com resposta' : null,
  ]);
  const relato = a.notes ? `\n  ${a.notes.replace(/\n/g, '\n  ')}` : '';
  const anexos = a.attachments?.length ? `\n  ${a.attachments.length} anexo(s) — veja no Pulse` : '';
  return `- ${cabecalho}${relato}${anexos}`;
}

/** A mesma leitura da tela Empresas: "posso abordar esta empresa agora?". */
export function situacao(status: CompanyProspectStatus): string {
  const meta = COMPANY_STATUS_META[status];
  return `Situação: ${meta.label} — **${COMPANY_ACTION_LABEL[meta.action]}** (${meta.hint})`;
}

function estadoDaTarefa(t: ProspectTaskDB): string {
  if (t.done_at) return `concluída em ${data(t.done_at)} · prazo ${data(t.due_date)}`;
  if (isTaskOverdue(t)) return `**venceu em ${data(t.due_date)}**`;
  return `prazo ${data(t.due_date)}`;
}

export function tarefa(t: ProspectTaskDB, pessoas: Map<string, string>, contexto?: string | null): string {
  const detalhes = juntar([estadoDaTarefa(t), pessoas.get(t.owner_id ?? ''), contexto]);
  return `- ${t.done_at ? '☑' : '☐'} ${t.description} — ${detalhes}\n  ID: \`${t.id}\``;
}
