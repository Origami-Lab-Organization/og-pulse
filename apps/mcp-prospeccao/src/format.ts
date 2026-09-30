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
import { resolveProspectValue } from '@/lib/prospecting/value';
import { LEI_DO_BEM_LABEL, isSituacaoAtiva, leiDoBemSignal, porteLabel } from '@/lib/prospecting/receita';
import { industryLabel, industrySignal } from '@/lib/prospecting/industria';
import { companyFit } from '@/lib/prospecting/fit';
import type { ProspectCompanyPartnerDB, ReceitaSnapshot } from '@/types/receita';
import type { ClientLite, ContactDeal } from './types.js';

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
      ['Cliente da carteira', e.client_id && `sim — client_id \`${e.client_id}\``],
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
      ['Valor estimado', p.estimated_value != null ? reais(Number(p.estimated_value)) : null],
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
      ['Observações', p.notes],
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

export function clienteResumo(c: ClientLite): string {
  const nome = c.trading_name && c.trading_name !== c.company_name ? `${c.trading_name} (${c.company_name})` : c.company_name;
  const empresa = c.prospectCompanyId
    ? ` — já na Prospecção: company_id \`${c.prospectCompanyId}\``
    : ' — ainda sem empresa na Prospecção';
  return `- **${nome}**${c.cnpj ? ` · ${cnpj(c.cnpj)}` : ''} — client_id \`${c.id}\`${empresa}`;
}

export function dadosDoCnpj(d: ReceitaSnapshot): string {
  const e = d.detalhes.endereco;
  const socios = d.socios.length
    ? d.socios.map((s) => `- ${s.nome}${s.qualificacao ? ` — ${s.qualificacao}` : ''}`)
    : ['- a Receita não informa sócios'];
  return [
    retratoDaReceita({
      nome: d.nomeFantasia ?? d.razaoSocial,
      razaoSocial: d.razaoSocial,
      cnpj: d.cnpj,
      regime: d.regimeTributario,
      regimeAno: d.regimeTributarioAno,
      porte: d.porte,
      situacao: d.situacaoCadastral,
      abertura: d.dataAbertura,
      capital: d.capitalSocial,
      industria: industryLabel(industrySignal(d.detalhes)),
    }),
    rotulado(
      [
        ['Segmento (CNAE)', d.segmento],
        ['Natureza jurídica', d.detalhes.naturezaJuridica],
        ['Cidade', e.municipio && e.uf ? `${e.municipio}/${e.uf}` : e.municipio],
        ['Telefones', d.detalhes.telefones.join(' · ') || null],
        ['E-mail de cadastro', d.detalhes.email],
      ],
      '\n',
    ),
    '',
    `**Sócios e representantes (${d.socios.length}):**`,
    ...socios,
  ].join('\n');
}

interface Retrato {
  nome: string;
  razaoSocial: string | null;
  cnpj: string | null;
  regime: string | null;
  regimeAno: number | null;
  porte: string | null;
  situacao: string | null;
  abertura: string | null;
  capital: number | null;
  industria: string | null;
}

/** Os sinais que decidem a abordagem: Lei do Bem pelo regime, porte, situação e idade. */
function retratoDaReceita(r: Retrato): string {
  const alerta = isSituacaoAtiva(r.situacao) ? null : `⚠️ Situação na Receita: ${r.situacao} — confirmar antes de abordar.`;
  return rotulado(
    [
      ['', `**${r.nome}** (Receita, via BrasilAPI)`],
      ['', alerta],
      ['Razão social', r.razaoSocial],
      ['CNPJ', cnpj(r.cnpj)],
      ['Setor', r.industria ?? 'fora da indústria (CNAE)'],
      ['Lei do Bem', `${LEI_DO_BEM_LABEL[leiDoBemSignal(r.regime)]}${r.regimeAno ? ` (${r.regimeAno})` : ''}`],
      ['Porte', porteLabel(r.porte)],
      ['Abertura', r.abertura && data(r.abertura)],
      ['Capital social', r.capital != null ? reais(r.capital) : null],
    ],
    '\n',
  );
}

/** Dados da Receita já gravados na empresa — `get_company`. */
export function receitaDaEmpresa(e: ProspectCompanyDB): string | null {
  if (!e.receita_consultada_em) return null;
  return [
    retratoDaReceita({
      nome: 'Dados da Receita',
      razaoSocial: e.razao_social ?? null,
      cnpj: null,
      regime: e.regime_tributario ?? null,
      regimeAno: e.regime_tributario_ano ?? null,
      porte: e.porte ?? null,
      situacao: e.situacao_cadastral ?? null,
      abertura: e.data_abertura ?? null,
      capital: e.capital_social ?? null,
      industria: industryLabel(industrySignal(e.receita)),
    }).replace('(Receita, via BrasilAPI)', `(consultado em ${data(e.receita_consultada_em.slice(0, 10))})`),
  ].join('\n');
}

/** A rede da empresa: sócios com o que o time já descobriu deles. */
export function redeDaEmpresa(socios: ProspectCompanyPartnerDB[]): string {
  const ativos = socios.filter((s) => s.ativo);
  if (ativos.length === 0) return '**Rede da empresa:** nenhum sócio registrado.';
  const linhas = ativos.map((s) => {
    const extras = juntar([
      s.qualificacao,
      s.linkedin_url && `LinkedIn ${s.linkedin_url}`,
      s.instagram_url && `Instagram ${s.instagram_url}`,
      s.telefone && `Tel. ${s.telefone}`,
      s.prospect_id ? 'já é contato' : null,
    ]);
    return `- **${s.nome}**${extras ? ` — ${extras}` : ''} — partner_id \`${s.id}\``;
  });
  return [`**Rede da empresa (${ativos.length}):**`, ...linhas].join('\n');
}

/** O negócio do contato: valor pela regra única (ADR-0017), orçamento e projeto vinculados. */
export function negocio(p: ProspectWithCompany, n: ContactDeal): string {
  const valor = resolveProspectValue({ ...p, budget: n.orcamento });
  return rotulado(
    [
      ['', '**Negócio:**'],
      ['Valor do contato', valor > 0 ? reais(valor) : 'sem valor'],
      [
        'Orçamento',
        n.orcamento
          ? `${n.orcamento.budget_number} · ${n.orcamento.title} · ${reais(Number(n.orcamento.final_total))} · ${n.orcamento.status}`
          : 'nenhum vinculado (ou sem permissão de orçamento)',
      ],
      ['Projeto', n.projeto ? `${n.projeto.name} · ${n.projeto.status}` : p.stage === ETAPA_GANHO ? 'ainda não criado' : null],
    ],
    '\n',
  );
}

/** Fit com cada frente da Origami e o porquê — a mesma regra da tela (src/lib/prospecting/fit.ts). */
export function fitDaEmpresa(e: ProspectCompanyDB): string | null {
  const fits = companyFit(e, e.fomento ?? null);
  if (!fits) return null;
  const linhas = [...fits]
    .sort((a, b) => b.nota - a.nota)
    .map((f) => `- **${f.rotulo}: ${f.nota}/100** — ${f.motivos.map((m) => m.texto).join('; ') || 'sem sinais'}`);
  return ['**Fit com a Origami:**', ...linhas].join('\n');
}

/** Fomento público gravado na empresa (Lei do Bem, FINEP/BNDES, governo). */
export function fomentoDaEmpresa(e: ProspectCompanyDB): string | null {
  const f = e.fomento;
  if (!f) return null;
  const lei = { ja_usa: 'já declara', nunca_usou: 'nunca apareceu na lista', desconhecido: 'lista ainda não importada' }[f.leiDoBem];
  const ops = f.fomentos.slice(0, 5).map((o) => `- ${o.fonte}${o.ano ? ` ${o.ano}` : ''}${o.valor ? ` · ${reais(o.valor)}` : ''}${o.instrumento ? ` · ${o.instrumento}` : ''}`);
  const governo = f.governo ? `${f.governo.contratos} contrato(s) com o governo federal` : 'contratos com o governo: fonte não configurada';
  return [`**Fomento público:** Lei do Bem ${lei}${f.leiDoBemAno ? ` (ano-base ${f.leiDoBemAno})` : ''} · ${governo}`, ...ops].join('\n');
}
