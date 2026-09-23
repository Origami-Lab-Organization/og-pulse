/**
 * Texto das respostas. Rótulos SEMPRE derivados de `src/types/prospect.ts` e
 * `src/lib/interactionChannels.ts`, para a conversa usar os mesmos nomes da tela.
 */

import { getChannelLabel } from '@/lib/interactionChannels';
import {
  getDiscardReasonLabel,
  getLeverLabel,
  getProspectStageLabel,
  type ProspectActivityDB,
  type ProspectCompanyDB,
  type ProspectWithCompany,
} from '@/types/prospect';

type Valor = string | number | null | undefined;
type Par = [rotulo: string, valor: Valor];

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

function motivoDoDescarte(p: ProspectWithCompany): string | null {
  return p.discard_reason ? getDiscardReasonLabel(p.discard_reason) : null;
}

export function contatoCompleto(p: ProspectWithCompany, pessoas: Map<string, string>): string {
  return rotulado(
    [
      ['', `## ${p.contact_name}`],
      ['Empresa', p.company?.name],
      ['Cargo', p.contact_role],
      ['Etapa', getProspectStageLabel(p.stage)],
      ['Motivo do descarte', motivoDoDescarte(p)],
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
      ['Convertido em oportunidade', p.converted_lead_id && `\`${p.converted_lead_id}\``],
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
