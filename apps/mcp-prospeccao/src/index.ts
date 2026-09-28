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
  PROSPECT_FUNNEL_STAGES,
  PROSPECT_LEVERS,
  PROSPECT_MANUAL_STAGES,
  PROSPECT_STAGE_META,
  PROSPECT_TERMINAL_STAGES,
  getLeverLabel,
  getProspectStageLabel,
  isProspectClosed,
  isProspectReadOnly,
  toISODate,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';
import * as db from './data.js';
import * as dup from './duplicidade.js';
import * as fmt from './format.js';
import { PulseNotAuthenticatedError } from './supabase.js';
import type { CompanyFields, CompanyMatch, CompanyTarget, ContactFields, TaskListArgs } from './types.js';

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
const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.');

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

/**
 * Lido pelo cliente MCP antes de escolher ferramenta. Existe porque, sem ele, pedido de
 * "cadastrar um contato de prospecção" caía em `create_opportunity` do og-pulse-drive.
 */
const INSTRUCOES = [
  'Prospecção (este servidor) = contato frio: mede atenção conquistada, não receita. Empresas e contatos que ainda estão sendo abordados vivem aqui.',
  'Pipeline = Oportunidade: negócio com receita em jogo, no servidor og-pulse-drive (create_opportunity). Pedido para cadastrar contato ou empresa de prospecção NUNCA vira Oportunidade.',
  'Antes de cadastrar, confira duplicidade com check_company_duplicates e list_contacts. Não chute valores: list_prospecting_options traz etapas, canais, alavancas, motivos de descarte e responsáveis válidos.',
  'Ao falar com a pessoa, use Prospecção, Oportunidade e Pipeline — nunca "lead", "CRM" ou "funil".',
].join('\n');

const server = new McpServer({ name: 'og-pulse-prospeccao', version: '1.0.0' }, { instructions: INSTRUCOES });

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

server.tool(
  'check_company_duplicates',
  'Confere se a empresa já está na Prospecção ANTES de cadastrar: por CNPJ, LinkedIn da empresa e nome idêntico (para parte do nome, use search_companies). Diz também se a empresa pode ser abordada agora, pela mesma regra da tela Empresas — basta um contato de "Respondeu" em diante para a conta inteira ficar em "Não abordar".',
  {
    nome: z.string().max(160).optional().describe('Nome completo da empresa.'),
    cnpj: textoOpcional('CNPJ com ou sem máscara.'),
    linkedin_url: textoOpcional('LinkedIn da empresa.'),
  },
  executar(async (busca) => {
    if (!busca.nome && !busca.cnpj && !busca.linkedin_url) {
      throw new db.ProspeccaoError('Informe ao menos nome, CNPJ ou LinkedIn da empresa.');
    }
    exigirCnpjValido(busca.cnpj);
    const { fortes, porNome } = await dup.candidatas(busca);
    const todas = [...fortes, ...porNome];
    if (todas.length === 0) return 'Nenhuma empresa cadastrada corresponde a esses dados — pode cadastrar sem duplicar.';
    const linhas = await Promise.all(todas.map(linhaDeCandidata));
    return [`**${todas.length} empresa(s) já cadastrada(s) com esses dados:**`, '', ...linhas].join('\n');
  }),
);

async function linhaDeCandidata({ empresa, criterio }: CompanyMatch): Promise<string> {
  const { status, contatos } = await dup.situacaoDe(empresa);
  return `${fmt.empresaResumo(empresa, contatos.length)}\n  Bateu por: ${criterio} · ${fmt.situacao(status)}`;
}

// ── Opções válidas ───────────────────────────────────────────────────────────

/** Como cada etapa desfecho é alcançada — as do quadro derivam de `isManualStage`. */
const COMO_SE_ENCERRA: Partial<Record<ProspectStage, string>> = {
  sem_resposta: 'automático, quando a cadência se esgota sem resposta',
  descartado: 'discard_contact, com motivo',
  convertido: 'conversão em Oportunidade, feita na tela',
};

const comoSeChega = (etapa: ProspectStage) =>
  isManualStage(etapa) ? 'à mão, com move_contact_stage' : 'só registrando atividade (register_activity)';

function secaoDeEtapas(): string[] {
  return [
    '**Etapas do quadro (em ordem):**',
    ...PROSPECT_FUNNEL_STAGES.map((e) => `- \`${e}\` — ${getProspectStageLabel(e)}: ${comoSeChega(e)}`),
    '',
    '**Encerrados (fora do quadro):**',
    ...PROSPECT_TERMINAL_STAGES.map((e) => `- \`${e}\` — ${getProspectStageLabel(e)}: ${COMO_SE_ENCERRA[e] ?? ''}`),
  ];
}

const secaoDeLista = (titulo: string, lista: ReadonlyArray<{ value: string; label: string }>) => [
  `**${titulo}:**`,
  ...lista.map((i) => `- \`${i.value}\` — ${i.label}`),
];

function secaoDePessoas(pessoas: Map<string, string>): string[] {
  const ordenadas = [...pessoas.entries()].sort(([, a], [, b]) => a.localeCompare(b, 'pt-BR'));
  return [
    '**Responsáveis** (aceita "eu", nome ou ID):',
    ...ordenadas.map(([id, nome]) => `- ${nome} — \`${id}\``),
  ];
}

server.tool(
  'list_prospecting_options',
  'Valores válidos da Prospecção, com id e rótulo: etapas (e como se chega a cada uma), canais, alavancas, motivos de descarte e responsáveis. Consulte antes de cadastrar ou mover, para nunca chutar valor. Anel e Tier da empresa são texto livre.',
  {},
  executar(async () => {
    const pessoas = await db.nomesDasPessoas();
    return [
      ...secaoDeEtapas(),
      '',
      ...secaoDeLista('Canais (canal principal e atividade)', INTERACTION_CHANNELS),
      '',
      ...secaoDeLista('Alavancas / origem da lista', PROSPECT_LEVERS),
      '',
      ...secaoDeLista('Motivos de descarte', PROSPECT_DISCARD_REASONS),
      '',
      ...secaoDePessoas(pessoas),
    ].join('\n');
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

/** O que aconteceu com a empresa, dito de forma que a pessoa confira sem abrir o Pulse. */
const ORIGEM_DA_EMPRESA: Record<CompanyTarget['origem'], (a: CompanyTarget) => string> = {
  informada: (a) => `Empresa: **${a.empresa.name}** — ID: \`${a.empresa.id}\``,
  reaproveitada: (a) =>
    `♻️ Empresa já cadastrada, reaproveitada (bateu por ${a.criterio}) — nada foi duplicado: **${a.empresa.name}** — ID: \`${a.empresa.id}\``,
  criada: (a) => `🆕 Empresa nova cadastrada: **${a.empresa.name}** — ID: \`${a.empresa.id}\``,
};

server.tool(
  'create_contact_with_company',
  'Cadastra um contato FRIO na Prospecção — não é Oportunidade (negócio com receita em jogo vai para o Pipeline, create_opportunity). Verifique duplicidade com check_company_duplicates/list_contacts antes de criar. Aceita company_id de empresa existente OU os dados de uma empresa nova em `empresa`: com empresa nova, reaproveita a já cadastrada com o mesmo CNPJ, LinkedIn ou nome (quando nada os diferencia) em vez de duplicar. Também não duplica contato — mesmo nome ou e-mail na mesma empresa devolve o existente. Entra em "A abordar", com a próxima atividade para hoje, igual à tela.',
  {
    company_id: uuid('company_id').optional().describe('Empresa já cadastrada. Não envie junto com `empresa`.'),
    empresa: z
      .object({ name: z.string().min(1).max(160).describe('Nome da empresa.'), ...camposDeEmpresa })
      .optional()
      .describe('Dados da empresa nova. Não envie junto com company_id.'),
    contact_name: z.string().min(2).max(160).describe('Nome do contato.'),
    ...camposDeContato,
  },
  executar(async ({ company_id, empresa, responsavel, ...contato }) => {
    exigirCnpjValido(empresa?.cnpj);
    // Responsável antes da empresa: nome ambíguo não pode deixar empresa criada sem contato.
    const ownerId = await resolverOpcional(responsavel);
    const alvo = await dup.resolverEmpresa(company_id, empresa as (CompanyFields & { name: string }) | undefined);
    const [{ status, contatos }, pessoas] = await Promise.all([dup.situacaoDe(alvo.empresa), db.nomesDasPessoas()]);
    const cabecalho = [ORIGEM_DA_EMPRESA[alvo.origem](alvo), ...(contatos.length ? [fmt.situacao(status)] : [])];

    const repetido = dup.contatoRepetido(contatos, contato.contact_name, contato.contact_email);
    if (repetido) {
      return [
        ...cabecalho,
        '',
        `⚠️ Contato NÃO criado: ${repetido.contact_name} já está cadastrado nesta empresa. Para mudar dados, use update_contact.`,
        '',
        fmt.contatoCompleto(repetido, pessoas),
      ].join('\n');
    }
    const criado = await db.criarContato(alvo.empresa.id, { ...contato, ...(ownerId ? { owner_id: ownerId } : {}) });
    return ['✅ Contato cadastrado em "A abordar".', ...cabecalho, '', fmt.contatoCompleto(criado, pessoas)].join('\n');
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

// ── Tarefas ──────────────────────────────────────────────────────────────────
//
// Tarefa é o que ainda precisa ser feito ("mandar material até sexta"). NÃO é atividade:
// não conta toque, não agenda cadência e não move etapa. Excluir fica na tela.

async function tarefasDeUmContato({ prospect_id, incluir_concluidas }: TaskListArgs): Promise<string> {
  const [contato, tarefas, pessoas] = await Promise.all([
    db.buscarContato(prospect_id),
    db.tarefasDoContato(prospect_id, incluir_concluidas),
    db.nomesDasPessoas(),
  ]);
  if (tarefas.length === 0) return `${contato.contact_name} não tem tarefa${incluir_concluidas ? '' : ' pendente'}.`;
  return [
    `**Tarefas de ${contato.contact_name}${contato.company?.name ? ` (${contato.company.name})` : ''} — ${tarefas.length}:**`,
    '',
    ...tarefas.map((t) => fmt.tarefa(t, pessoas)),
  ].join('\n');
}

async function tarefasDeUmaPessoa({ responsavel, ate, limite }: TaskListArgs): Promise<string> {
  const [tarefas, pessoas] = await Promise.all([
    db.tarefasPendentesDe(await db.resolverPessoa(responsavel), ate, limite),
    db.nomesDasPessoas(),
  ]);
  const periodo = ate ? ` com prazo até ${fmt.data(ate)}` : '';
  if (tarefas.length === 0) return `Nenhuma tarefa pendente${periodo}.`;
  const contexto = (t: db.TarefaComContato) =>
    t.prospect ? `${t.prospect.contact_name}${t.prospect.company?.name ? ` · ${t.prospect.company.name}` : ''}` : null;
  return [
    `**${tarefas.length} tarefa(s) pendente(s)${periodo}:**`,
    '',
    ...tarefas.map((t) => `${fmt.tarefa(t, pessoas, contexto(t))}\n  Contato: \`${t.prospect_id}\``),
  ].join('\n');
}

server.tool(
  'list_prospect_tasks',
  'Lista tarefas da Prospecção — o que ainda precisa ser feito com um contato. Tarefa NÃO é atividade: não conta toque nem move etapa. Com prospect_id, as tarefas daquele contato; sem, as pendentes de uma pessoa em todos os contatos (padrão: minhas), mais urgentes primeiro.',
  {
    prospect_id: uuid('prospect_id').optional(),
    responsavel: z.string().default('eu').describe('Sem prospect_id: "eu", nome ou UUID. Padrão: eu.'),
    ate: dataISO.optional().describe('Sem prospect_id: só pendentes com prazo até esta data (AAAA-MM-DD).'),
    incluir_concluidas: z.boolean().default(false).describe('Com prospect_id: inclui as já concluídas.'),
    limite: z.number().int().min(1).max(200).default(50),
  },
  executar(async (args) => (args.prospect_id ? tarefasDeUmContato(args) : tarefasDeUmaPessoa(args))),
);

server.tool(
  'create_prospect_task',
  'Cria uma tarefa para um contato da Prospecção ("ligar depois da feira", "mandar material até sexta"). Fica com o responsável do contato. NÃO registra toque — para registrar o que já aconteceu, use register_activity.',
  {
    prospect_id: uuid('prospect_id'),
    descricao: z.string().trim().min(1, 'Descreva a tarefa.').max(2000).describe('O que precisa ser feito.'),
    prazo: dataISO.describe('Data de conclusão (AAAA-MM-DD).'),
  },
  executar(async ({ prospect_id, descricao, prazo }) => {
    const contato = await db.buscarContato(prospect_id);
    exigirEditavel(contato);
    const [tarefa, pessoas] = await Promise.all([db.criarTarefa(prospect_id, descricao, prazo), db.nomesDasPessoas()]);
    return `✅ Tarefa criada para ${contato.contact_name}.\n\n${fmt.tarefa(tarefa, pessoas)}`;
  }),
);

server.tool(
  'update_prospect_task',
  'Altera uma tarefa da Prospecção: texto, prazo, ou marca como concluída (concluida=true) / pendente de novo (concluida=false). Envie só o que muda.',
  {
    task_id: uuid('task_id'),
    descricao: z.string().trim().min(1, 'Descreva a tarefa.').max(2000).optional(),
    prazo: dataISO.optional().describe('Nova data de conclusão (AAAA-MM-DD).'),
    concluida: z.boolean().optional(),
  },
  executar(async ({ task_id, ...mudancas }) => {
    if (Object.values(mudancas).every((v) => v === undefined)) {
      throw new db.ProspeccaoError('Nada para alterar: envie descricao, prazo ou concluida.');
    }
    const antes = await db.buscarTarefa(task_id);
    const contato = await db.buscarContato(antes.prospect_id);
    exigirEditavel(contato);
    const [tarefa, pessoas] = await Promise.all([db.atualizarTarefa(task_id, mudancas), db.nomesDasPessoas()]);
    return `✅ Tarefa de ${contato.contact_name} atualizada.\n\n${fmt.tarefa(tarefa, pessoas)}`;
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
