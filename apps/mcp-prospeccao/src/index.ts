/**
 * og-pulse MCP Prospecção
 *
 * Opera a Prospecção do Origami Pulse pelo chat: buscar e cadastrar empresas e contatos,
 * registrar atividades, mover etapas e ler as métricas do funil.
 *
 * Entra com as credenciais da própria pessoa e opera SOB A RLS, como `apps/mcp-activities`:
 * sem `prospeccao:ler` não lê nada, sem `prospeccao:editar` não escreve nada.
 *
 * Fica DE FORA, de propósito:
 *   - converter em Oportunidade: cria o `leads` com a regra de `convertProspectToLead`, que
 *     vive na aplicação. Expor aqui duplicaria a escrita, exatamente o TD-0022;
 *   - excluir contato e apagar atividade: irreversíveis, ficam para a tela;
 *   - anexos: o upload exige o bucket e o fluxo de `prospectAttachments`.
 *
 * Variáveis de ambiente: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, PULSE_EMAIL, PULSE_PASSWORD.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { INTERACTION_CHANNELS } from '@/lib/interactionChannels';
import { validateCNPJ } from '@/lib/masks';
import {
  calculateAccountCoverage,
  calculateProspectingFunnel,
  formatRate,
  funnelByCut,
  type ProspectCut,
} from '@/lib/prospecting/metrics';
import { isManualStage } from '@/lib/prospecting/transitions';
import {
  PROSPECT_DISCARD_REASONS,
  PROSPECT_LEVERS,
  PROSPECT_MANUAL_STAGES,
  PROSPECT_STAGE_META,
  getLeverLabel,
  getProspectStageLabel,
  isProspectClosed,
  isProspectReadOnly,
  toISODate,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';
import * as db from './data.js';
import * as fmt from './format.js';
import { PulseNotAuthenticatedError } from './supabase.js';
import type { CompanyFields, ContactFields } from './types.js';

// ── Vocabulário fechado, derivado das mesmas constantes da tela ─────────────

type Tupla = [string, ...string[]];
const valores = (lista: ReadonlyArray<{ value: string }>) => lista.map((i) => i.value) as Tupla;
const descrever = (lista: ReadonlyArray<{ value: string; label: string }>) =>
  lista.map((i) => `${i.value} (${i.label})`).join(', ');

const CANAIS = valores(INTERACTION_CHANNELS);
const ALAVANCAS = valores(PROSPECT_LEVERS);
const MOTIVOS = valores(PROSPECT_DISCARD_REASONS);
const ETAPAS = Object.keys(PROSPECT_STAGE_META) as Tupla;
const ETAPAS_MANUAIS = [...PROSPECT_MANUAL_STAGES] as Tupla;
const rotuloDasEtapas = (lista: readonly string[]) =>
  lista.map((e) => `${e} (${getProspectStageLabel(e)})`).join(', ');

const uuid = (campo: string) => z.string().uuid(`${campo} deve ser um UUID — use as tools de busca para obtê-lo.`);
const textoOpcional = (descricao: string) => z.string().max(300).optional().describe(descricao);

// ── Respostas ────────────────────────────────────────────────────────────────

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function fail(text: string) {
  return { content: [{ type: 'text' as const, text: `❌ ${text}` }], isError: true };
}

/** Todo handler passa por aqui: erro conhecido vira frase, desconhecido vira log + frase. */
function executar<A>(handler: (args: A) => Promise<string>) {
  return async (args: A) => {
    try {
      return ok(await handler(args));
    } catch (erro) {
      if (erro instanceof db.ProspeccaoError || erro instanceof PulseNotAuthenticatedError) {
        return fail(erro.message);
      }
      console.error('[og-pulse-prospeccao]', erro);
      return fail('Erro inesperado ao falar com o Pulse. Tente de novo.');
    }
  };
}

function exigirEditavel(p: ProspectWithCompany): void {
  if (isProspectReadOnly(p)) {
    throw new db.ProspeccaoError(
      `${p.contact_name} já foi convertido em oportunidade — o contato é somente leitura. Continue pela Oportunidade.`,
    );
  }
}

function exigirCnpjValido(cnpj?: string): void {
  if (cnpj && !validateCNPJ(cnpj)) throw new db.ProspeccaoError('CNPJ inválido.');
}

async function resolverOpcional(responsavel?: string): Promise<string | undefined> {
  return responsavel ? db.resolverPessoa(responsavel) : undefined;
}

// ── Servidor ─────────────────────────────────────────────────────────────────

const server = new McpServer({ name: 'og-pulse-prospeccao', version: '1.0.0' });

const camposDeEmpresa = {
  cnpj: textoOpcional('CNPJ com ou sem máscara. Evita empresa duplicada.'),
  linkedin_url: textoOpcional('LinkedIn da empresa. Evita empresa duplicada.'),
  instagram_url: textoOpcional('Instagram da empresa: @perfil ou link.'),
  website: textoOpcional('Site da empresa.'),
  segment: textoOpcional('Segmento de mercado.'),
  ring: z.string().max(60).optional().describe('Anel — segmentação de proximidade (texto livre).'),
  tier: z.string().max(60).optional().describe('Tier — porte/prioridade (texto livre).'),
  notes: z.string().max(4000).optional().describe('Observações sobre a empresa.'),
};

const camposDeContato = {
  contact_role: textoOpcional('Cargo do contato.'),
  contact_email: z.string().email('E-mail inválido').optional().describe('E-mail do contato.'),
  contact_phone: textoOpcional('Telefone ou WhatsApp do contato.'),
  linkedin_url: textoOpcional('LinkedIn do contato.'),
  instagram_url: textoOpcional('Instagram do contato: @perfil ou link.'),
  primary_channel: z.enum(CANAIS).optional().describe(`Canal principal: ${descrever(INTERACTION_CHANNELS)}.`),
  lever: z.enum(ALAVANCAS).optional().describe(`Alavanca / origem da lista: ${descrever(PROSPECT_LEVERS)}.`),
  responsavel: z.string().optional().describe('"eu", nome (ou parte) ou UUID de quem conduz. Padrão: eu.'),
};

// ── Empresas ─────────────────────────────────────────────────────────────────

server.tool(
  'search_companies',
  'Busca empresas da Prospecção por parte do nome ou do CNPJ. Use SEMPRE antes de cadastrar empresa ou contato, para reaproveitar o cadastro existente. Sem termo, lista as empresas em ordem alfabética.',
  {
    termo: z.string().optional().describe('Parte do nome ou do CNPJ.'),
    limite: z.number().int().min(1).max(100).default(20),
  },
  executar(async ({ termo, limite }) => {
    const empresas = await db.buscarEmpresas(termo ?? '', limite);
    if (empresas.length === 0) return `Nenhuma empresa encontrada${termo ? ` para "${termo}"` : ''}.`;
    const contagem = await db.contarContatos(empresas.map((e) => e.id));
    const linhas = empresas.map((e) => fmt.empresaResumo(e, contagem.get(e.id) ?? 0));
    return [`**${empresas.length} empresa(s):**`, '', ...linhas].join('\n');
  }),
);

server.tool(
  'get_company',
  'Detalhes de uma empresa da Prospecção e a lista dos contatos dela (inclusive encerrados).',
  { company_id: uuid('company_id') },
  executar(async ({ company_id }) => {
    const [empresa, contatos, pessoas] = await Promise.all([
      db.buscarEmpresa(company_id),
      db.listarContatos({ companyId: company_id, incluirEncerrados: true, limite: 200 }),
      db.nomesDasPessoas(),
    ]);
    const lista = contatos.length ? contatos.map((p) => fmt.contatoResumo(p, pessoas)) : ['Nenhum contato ainda.'];
    return [fmt.empresaCompleta(empresa), '', `**Contatos (${contatos.length}):**`, ...lista].join('\n');
  }),
);

server.tool(
  'create_company',
  'Cadastra uma empresa na Prospecção. Rode search_companies antes: CNPJ e LinkedIn são únicos por organização e o banco recusa duplicata. Empresa fria NÃO é cliente — não entra na carteira.',
  { name: z.string().min(1).max(160).describe('Nome da empresa.'), ...camposDeEmpresa },
  executar(async (campos) => {
    exigirCnpjValido(campos.cnpj);
    const homonimas = await db.empresasComMesmoNome(campos.name);
    const empresa = await db.criarEmpresa(campos);
    const aviso = homonimas.length
      ? `\n\n⚠️ Já existia ${homonimas.length} empresa(s) com o mesmo nome — confira se não é duplicata:\n${homonimas.map((e) => fmt.empresaResumo(e)).join('\n')}`
      : '';
    return `✅ Empresa cadastrada.\n\n${fmt.empresaCompleta(empresa)}${aviso}`;
  }),
);

server.tool(
  'update_company',
  'Atualiza dados de uma empresa da Prospecção. Os campos valem para TODOS os contatos dela. Envie só o que muda; string vazia apaga o campo.',
  { company_id: uuid('company_id'), name: z.string().min(1).max(160).optional(), ...camposDeEmpresa },
  executar(async ({ company_id, ...campos }) => {
    exigirCnpjValido(campos.cnpj);
    const empresa = await db.atualizarEmpresa(company_id, campos as CompanyFields);
    return `✅ Empresa atualizada.\n\n${fmt.empresaCompleta(empresa)}`;
  }),
);

// ── Contatos ─────────────────────────────────────────────────────────────────

server.tool(
  'list_contacts',
  `Lista contatos da Prospecção. Por padrão, só os que estão no Pipeline (etapas abertas). Etapas: ${rotuloDasEtapas(ETAPAS)}.`,
  {
    empresa: z.string().optional().describe('Parte do nome da empresa.'),
    contato: z.string().optional().describe('Parte do nome do contato.'),
    etapa: z.enum(ETAPAS).optional(),
    incluir_encerrados: z.boolean().default(false).describe('Inclui Sem resposta, Descartado e Convertido.'),
    responsavel: z.string().optional().describe('"eu", nome (ou parte) ou UUID do responsável.'),
    alavanca: z.enum(ALAVANCAS).optional(),
    limite: z.number().int().min(1).max(200).default(50),
  },
  executar(async ({ empresa, contato, etapa, incluir_encerrados, responsavel, alavanca, limite }) => {
    const [contatos, pessoas] = await Promise.all([
      db.listarContatos({
        empresa,
        contato,
        etapa: etapa as ProspectStage | undefined,
        incluirEncerrados: incluir_encerrados,
        responsavelId: await resolverOpcional(responsavel),
        alavanca,
        limite,
      }),
      db.nomesDasPessoas(),
    ]);
    if (contatos.length === 0) return 'Nenhum contato encontrado com esses filtros.';
    return [`**${contatos.length} contato(s):**`, '', ...contatos.map((p) => fmt.contatoResumo(p, pessoas))].join('\n');
  }),
);

server.tool(
  'my_agenda',
  'Contatos com atividade vencida ou vencendo até uma data — "o que tenho para fazer hoje". Padrão: meus contatos, até hoje, mais atrasados primeiro.',
  {
    ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Data limite (AAAA-MM-DD). Padrão: hoje.'),
    responsavel: z.string().default('eu').describe('"eu", nome ou UUID. Padrão: eu.'),
  },
  executar(async ({ ate, responsavel }) => {
    const limite = ate ?? toISODate(new Date());
    const [contatos, pessoas] = await Promise.all([
      db.listarContatos({ responsavelId: await db.resolverPessoa(responsavel), vencendoAte: limite, limite: 200 }),
      db.nomesDasPessoas(),
    ]);
    if (contatos.length === 0) return `Nada vencendo até ${fmt.data(limite)}. Dia encerrado. ✅`;
    return [
      `**${contatos.length} contato(s) com atividade até ${fmt.data(limite)}:**`,
      '',
      ...contatos.map((p) => fmt.contatoResumo(p, pessoas)),
    ].join('\n');
  }),
);

server.tool(
  'get_contact',
  'Ficha completa de um contato da Prospecção (dados, empresa, etapa, próxima data) e as últimas atividades.',
  {
    prospect_id: uuid('prospect_id'),
    atividades: z.number().int().min(0).max(100).default(20).describe('Quantas atividades recentes trazer.'),
  },
  executar(async ({ prospect_id, atividades }) => {
    const [contato, historico, pessoas] = await Promise.all([
      db.buscarContato(prospect_id),
      db.atividadesDoContato(prospect_id, atividades),
      db.nomesDasPessoas(),
    ]);
    const linhas = historico.length ? historico.map(fmt.atividade) : ['Nenhuma atividade registrada.'];
    return [fmt.contatoCompleto(contato, pessoas), '', `**Atividades (${contato.activity_count}):**`, ...linhas].join('\n');
  }),
);

server.tool(
  'create_contact',
  'Cadastra um contato na Prospecção, ligado a uma empresa já existente (use search_companies ou create_company antes). Entra na etapa "A abordar", com a próxima atividade para hoje.',
  {
    company_id: uuid('company_id'),
    contact_name: z.string().min(2).max(160).describe('Nome do contato.'),
    ...camposDeContato,
  },
  executar(async ({ company_id, responsavel, ...campos }) => {
    const ownerId = await resolverOpcional(responsavel);
    const contato = await db.criarContato(company_id, { ...campos, ...(ownerId ? { owner_id: ownerId } : {}) });
    const pessoas = await db.nomesDasPessoas();
    return `✅ Contato cadastrado.\n\n${fmt.contatoCompleto(contato, pessoas)}`;
  }),
);

server.tool(
  'update_contact',
  'Atualiza dados de um contato da Prospecção (não muda etapa — para isso, move_contact_stage). Envie só o que muda; string vazia apaga o campo.',
  {
    prospect_id: uuid('prospect_id'),
    contact_name: z.string().min(2).max(160).optional(),
    ...camposDeContato,
  },
  executar(async ({ prospect_id, responsavel, ...campos }) => {
    exigirEditavel(await db.buscarContato(prospect_id));
    const ownerId = await resolverOpcional(responsavel);
    const mudancas: ContactFields = { ...campos, ...(ownerId ? { owner_id: ownerId } : {}) };
    const contato = await db.atualizarContato(prospect_id, mudancas);
    return `✅ Contato atualizado.\n\n${fmt.contatoCompleto(contato, await db.nomesDasPessoas())}`;
  }),
);

// ── Atividades e etapas ──────────────────────────────────────────────────────

server.tool(
  'register_activity',
  'Registra uma atividade (toque) com um contato. O relato é obrigatório, como na tela. O banco conta o toque, agenda a próxima data pela cadência e move a etapa: com houve_resposta=true o contato vai para "Respondeu"; sem resposta, o 4º toque encerra em "Sem resposta".',
  {
    prospect_id: uuid('prospect_id'),
    relato: z.string().trim().min(1, 'Descreva o que aconteceu.').max(20000).describe('O que aconteceu.'),
    canal: z.enum(CANAIS).optional().describe(`Canal: ${descrever(INTERACTION_CHANNELS)}. Padrão: canal principal do contato.`),
    houve_resposta: z.boolean().default(false).describe('true só se a pessoa respondeu de fato.'),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Data da atividade (AAAA-MM-DD). Padrão: hoje. Não pode ser futura.'),
  },
  executar(async ({ prospect_id, relato, canal, houve_resposta, data }) => {
    if (data && data > toISODate(new Date())) throw new db.ProspeccaoError('A data da atividade não pode ser futura.');
    const antes = await db.buscarContato(prospect_id);
    exigirEditavel(antes);
    const registro = await db.registrarAtividade({
      prospectId: prospect_id,
      channel: canal ?? antes.primary_channel,
      notes: relato,
      gotResponse: houve_resposta,
      activityDate: data,
    });
    const depois = await db.buscarContato(prospect_id); // harness-ok: releitura depois do trigger mover etapa/próxima data
    return resumoDaAtividade(registro.sequence_no, antes, depois);
  }),
);

function resumoDaAtividade(numero: number, antes: ProspectWithCompany, depois: ProspectWithCompany): string {
  const etapa =
    antes.stage === depois.stage
      ? `Etapa: ${getProspectStageLabel(depois.stage)}`
      : `Etapa: ${getProspectStageLabel(antes.stage)} → **${getProspectStageLabel(depois.stage)}**`;
  const proxima = depois.next_activity_on ? `Próxima atividade: ${fmt.data(depois.next_activity_on)}` : 'Sem próxima atividade agendada.';
  return [`✅ Atividade nº ${numero} registrada para ${depois.contact_name}.`, etapa, proxima].join('\n');
}

server.tool(
  'move_contact_stage',
  `Move um contato para uma etapa conduzida à mão: ${rotuloDasEtapas(ETAPAS_MANUAIS)}. "Em cadência" e "Respondeu" NÃO se alcançam aqui — só registrando atividade (register_activity). Para "reuniao_feita", envie relato_reuniao para registrar como foi (vira atividade com resposta).`,
  {
    prospect_id: uuid('prospect_id'),
    etapa: z.enum(ETAPAS_MANUAIS),
    relato_reuniao: z.string().trim().max(20000).optional().describe('Só para reuniao_feita: como foi a reunião.'),
    formato_reuniao: z.enum(CANAIS).default('video_call').describe('Só para reuniao_feita: formato da reunião.'),
  },
  executar(async ({ prospect_id, etapa, relato_reuniao, formato_reuniao }) => {
    if (!isManualStage(etapa)) throw new db.ProspeccaoError('Etapa não pode ser definida à mão.');
    const contato = await db.buscarContato(prospect_id);
    exigirEditavel(contato);
    exigirAberto(contato);
    if (contato.stage === etapa) return `${contato.contact_name} já está em "${getProspectStageLabel(etapa)}".`;
    if (etapa === 'reuniao_feita' && relato_reuniao) {
      await db.registrarAtividade({ prospectId: prospect_id, channel: formato_reuniao, notes: relato_reuniao, gotResponse: true });
    }
    await db.moverEtapa(prospect_id, etapa);
    const registro = relato_reuniao && etapa === 'reuniao_feita' ? ' Relato registrado na linha do tempo.' : '';
    return `✅ ${contato.contact_name}: ${getProspectStageLabel(contato.stage)} → **${getProspectStageLabel(etapa)}**.${registro}`;
  }),
);

function exigirAberto(p: ProspectWithCompany): void {
  if (isProspectClosed(p.stage)) {
    throw new db.ProspeccaoError(
      `${p.contact_name} está encerrado (${getProspectStageLabel(p.stage)}). Reabra com reopen_contact antes de mover.`,
    );
  }
}

server.tool(
  'discard_contact',
  `Descarta um contato (sai do Pipeline). O motivo é obrigatório e de lista fechada: ${descrever(PROSPECT_DISCARD_REASONS)}.`,
  { prospect_id: uuid('prospect_id'), motivo: z.enum(MOTIVOS) },
  executar(async ({ prospect_id, motivo }) => {
    const contato = await db.buscarContato(prospect_id);
    exigirEditavel(contato);
    if (contato.stage === 'descartado') return `${contato.contact_name} já está descartado.`;
    await db.descartar(prospect_id, motivo);
    const rotulo = PROSPECT_DISCARD_REASONS.find((r) => r.value === motivo)?.label ?? motivo;
    return `✅ ${contato.contact_name} descartado — motivo: ${rotulo}.`;
  }),
);

server.tool(
  'reopen_contact',
  'Reabre um contato Descartado ou Sem resposta: volta para "A abordar" com a próxima atividade para hoje. Convertido não reabre.',
  { prospect_id: uuid('prospect_id') },
  executar(async ({ prospect_id }) => {
    const contato = await db.buscarContato(prospect_id);
    exigirEditavel(contato);
    if (!isProspectClosed(contato.stage)) {
      return `${contato.contact_name} não está encerrado (${getProspectStageLabel(contato.stage)}) — nada a reabrir.`;
    }
    await db.reabrir(prospect_id);
    return `✅ ${contato.contact_name} reaberto em "A abordar", com atividade para hoje.`;
  }),
);

// ── Métricas ─────────────────────────────────────────────────────────────────

const CORTES: Record<ProspectCut, string> = { lever: 'Alavanca', ring: 'Anel', tier: 'Tier', owner: 'Responsável' };

server.tool(
  'get_prospecting_metrics',
  'Números da Prospecção num período: funil (contas abertas → contatos ativados → conversas → reuniões agendadas → feitas → oportunidades qualificadas), taxas entre etapas e cobertura da lista. Mesmo cálculo da aba Métricas. Opcionalmente quebra por alavanca, anel, tier ou responsável.',
  {
    dias: z.number().int().min(1).max(365).default(30).describe('Janela em dias até hoje.'),
    corte: z.enum(['lever', 'ring', 'tier', 'owner']).optional().describe('Quebra do funil.'),
  },
  executar(async ({ dias, corte }) => {
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    const { prospects, activities } = await db.dadosDeMetricas(toISODate(desde));
    const funil = calculateProspectingFunnel(prospects, activities as never);
    const cobertura = calculateAccountCoverage(prospects, activities as never);
    const partes = [
      `**Prospecção — últimos ${dias} dias (desde ${fmt.data(toISODate(desde))})**`,
      '',
      ...funil.steps.map((s, i) => `${s.label}: **${s.value}**${i > 0 ? ` (${funil.rates[i - 1].label}: ${funil.rates[i - 1].value})` : ''}`),
      '',
      `Cobertura da lista: ${cobertura.abertas} de ${cobertura.naLista} contas abertas (${formatRate(cobertura.taxa)}) · ${cobertura.nuncaAbordadas} nunca abordadas`,
    ];
    if (corte) partes.push('', await tabelaDoCorte(prospects, activities, corte as ProspectCut));
    return partes.join('\n');
  }),
);

async function tabelaDoCorte(
  prospects: ProspectWithCompany[],
  activities: unknown[],
  corte: ProspectCut,
): Promise<string> {
  const linhas = funnelByCut(prospects, activities as never, corte);
  if (linhas.length === 0) return `Sem atividade no período para quebrar por ${CORTES[corte].toLowerCase()}.`;
  const nome = await nomeadorDoCorte(corte);
  return [
    `| ${CORTES[corte]} | Contatos | Conversas | Agendadas | Feitas | Qualificadas |`,
    '|---|---|---|---|---|---|',
    ...linhas.map((l) => `| ${nome(l.key)} | ${l.contatos} | ${l.conversas} | ${l.agendadas} | ${l.feitas} | ${l.qualificadas} |`),
  ].join('\n');
}

/** Traduz a chave do corte para o que a pessoa lê: nome do responsável, rótulo da alavanca. */
async function nomeadorDoCorte(corte: ProspectCut): Promise<(chave: string) => string> {
  if (corte === 'owner') {
    const pessoas = await db.nomesDasPessoas();
    return (chave) => pessoas.get(chave) ?? chave;
  }
  if (corte === 'lever') return (chave) => getLeverLabel(chave) ?? chave;
  return (chave) => chave;
}

// ── Boot ─────────────────────────────────────────────────────────────────────

async function main() {
  await server.connect(new StdioServerTransport());
  console.error('[og-pulse-prospeccao] MCP server running on stdio');
}

main().catch((e) => {
  console.error('[og-pulse-prospeccao] Fatal error:', e);
  process.exit(1);
});
