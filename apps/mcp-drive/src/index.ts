/**
 * og-pulse MCP Drive Server
 *
 * Sobe arquivos na pasta do projeto no OneDrive conversacionalmente, a partir de
 * Claude Desktop ou qualquer cliente MCP.
 *
 * O acesso ao OneDrive é DELEGADO: cada pessoa autoriza a própria conta
 * (device code) e o Graph responde com a permissão que ela já tem lá. O Pulse
 * não decide acesso a arquivo — ver ADR-0019.
 *
 * O acesso ao Pulse também é da pessoa: entra com as credenciais dela e a RLS
 * decide quais projetos aparecem. Sem service_role — um LLM no volante não deve
 * dirigir um cliente que bypassa RLS.
 *
 * Variáveis de ambiente requeridas:
 *   SUPABASE_URL                — URL do projeto Supabase
 *   SUPABASE_PUBLISHABLE_KEY    — chave pública (a mesma do bundle)
 *   PULSE_EMAIL / PULSE_PASSWORD — credenciais do Pulse, usadas uma vez por sessão
 *   MICROSOFT_CLIENT_ID         — app registrado no Entra ID
 *   MICROSOFT_TENANT_ID         — tenant da Origami
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  NotAuthorizedError,
  currentAccount,
  pendingAuthorization,
  startDeviceCode,
} from './auth.js';
import {
  createFolder,
  ensureFolderPath,
  listChildren,
  resolveFolderPath,
  uploadFile,
} from './graph.js';
import {
  listOpportunities,
  listProjectActivities,
  listProjectOkrs,
  listProjectTeam,
  listProjects,
} from './reads.js';
import {
  atualizaOportunidade,
  criaOportunidade,
  ETAPAS_MOVIVEIS,
  moveEtapaOportunidade,
} from './writes.js';
import { loadFromBase64, loadSource } from './source.js';
import { PulseNotAuthenticatedError, currentPulseUser, getSupabase } from './supabase.js';
import type { ProjectDriveTarget } from './types.js';

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function fail(text: string) {
  return { content: [{ type: 'text' as const, text: `❌ Erro: ${text}` }], isError: true };
}

function describe(error: unknown): string {
  if (error instanceof NotAuthorizedError) {
    return 'Conta Microsoft não autorizada. Use a ferramenta microsoft_login primeiro.';
  }
  if (error instanceof PulseNotAuthenticatedError) return error.message;
  return error instanceof Error ? error.message : String(error);
}

/** A RLS decide quais projetos aparecem; o OneDrive decide quais pastas abrem. */
async function findProject(query: string): Promise<ProjectDriveTarget[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, onedrive_drive_id, onedrive_root_item_id, onedrive_root_path, client:clients(trading_name, company_name)')
    .ilike('name', `%${query}%`)
    .not('onedrive_drive_id', 'is', null)
    .limit(10);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, any>) => ({
    id: row.id,
    name: row.name,
    clientName: row.client?.trading_name ?? row.client?.company_name ?? null,
    driveId: row.onedrive_drive_id,
    rootItemId: row.onedrive_root_item_id,
    rootPath: row.onedrive_root_path ?? null,
  }));
}

async function requireProject(projectId: string): Promise<ProjectDriveTarget> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, onedrive_drive_id, onedrive_root_item_id, onedrive_root_path')
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = data as Record<string, any> | null;

  if (!row) throw new Error('Projeto não encontrado.');
  if (!row.onedrive_drive_id || !row.onedrive_root_item_id) {
    throw new Error(
      `O projeto "${row.name}" ainda não tem pasta do OneDrive vinculada. Vincule na aba Arquivos do Pulse.`,
    );
  }

  return {
    id: row.id,
    name: row.name,
    clientName: null,
    driveId: row.onedrive_drive_id,
    rootItemId: row.onedrive_root_item_id,
    rootPath: row.onedrive_root_path ?? null,
  };
}

const server = new McpServer({ name: 'og-pulse-drive', version: '1.0.0' });

server.tool(
  'microsoft_status',
  'Mostra qual conta Microsoft está autorizada neste computador para acessar o OneDrive.',
  {},
  async () => {
    const account = await currentAccount();
    const pending = await pendingAuthorization();
    const pulseUser = await currentPulseUser().catch(() => null);

    const microsoft = account
      ? `Microsoft: ${account}`
      : pending
        ? `Microsoft: aguardando você concluir em ${pending.uri} com o código ${pending.userCode}`
        : 'Microsoft: não autorizada (use microsoft_login)';

    return ok(
      [
        microsoft,
        pulseUser ? `Pulse: ${pulseUser}` : 'Pulse: sem sessão (verifique PULSE_EMAIL/PULSE_PASSWORD)',
      ].join('\n'),
    );
  },
);

server.tool(
  'microsoft_login',
  'Inicia a autorização da conta Microsoft por device code. Devolve a URL e o código que a pessoa deve digitar.',
  {},
  async () => {
    try {
      const session = await startDeviceCode();
      return ok(
        `${session.instructions}\n\nDepois de concluir no navegador, é só pedir o próximo comando — ` +
          'a autorização fica guardada e é retomada sozinha.',
      );
    } catch (error) {
      return fail(describe(error));
    }
  },
);

server.tool(
  'find_project',
  'Busca projetos do Pulse pelo nome, retornando apenas os que já têm pasta vinculada no OneDrive.',
  { query: z.string().min(2).describe('Parte do nome do projeto, ex.: "Cobrança"') },
  async ({ query }) => {
    try {
      const projects = await findProject(query);
      if (projects.length === 0) {
        return ok(`Nenhum projeto com pasta vinculada encontrado para "${query}".`);
      }

      return ok(
        projects
          .map(
            (project) =>
              `• ${project.name}${project.clientName ? ` (${project.clientName})` : ''}\n` +
              `  id: ${project.id}\n  pasta: ${project.rootPath ?? '—'}`,
          )
          .join('\n'),
      );
    } catch (error) {
      return fail(describe(error));
    }
  },
);

server.tool(
  'list_project_folder',
  'Lista pastas e arquivos dentro da pasta do projeto no OneDrive.',
  {
    project_id: z.string().uuid('project_id deve ser um UUID válido'),
    path: z
      .string()
      .optional()
      .describe('Caminho relativo à raiz do projeto, ex.: "3.Execução/Sprints". Vazio = raiz.'),
  },
  async ({ project_id, path }) => {
    try {
      const project = await requireProject(project_id);
      const folder = await resolveFolderPath(project.driveId, project.rootItemId, path);
      const children = await listChildren(project.driveId, folder.id);

      if (children.length === 0) {
        return ok(`${folder.trail.join('/') || 'Raiz'} está vazia.`);
      }

      return ok(
        `${project.name} · ${folder.trail.join('/') || 'raiz'}\n\n` +
          children
            .map((child) =>
              child.isFolder
                ? `📁 ${child.name}`
                : `📄 ${child.name} (${Math.max(1, Math.round(child.size / 1024))} KB)`,
            )
            .join('\n'),
      );
    } catch (error) {
      return fail(describe(error));
    }
  },
);

server.tool(
  'create_project_folder',
  'Cria uma pasta dentro da pasta do projeto no OneDrive.',
  {
    project_id: z.string().uuid(),
    name: z.string().min(1).describe('Nome da nova pasta'),
    parent_path: z.string().optional().describe('Onde criar, relativo à raiz. Vazio = raiz.'),
  },
  async ({ project_id, name, parent_path }) => {
    try {
      const project = await requireProject(project_id);
      const parent = await resolveFolderPath(project.driveId, project.rootItemId, parent_path);
      const created = await createFolder(project.driveId, parent.id, name);

      return ok(`Pasta "${created.name}" criada em ${parent.trail.join('/') || 'raiz'}.`);
    } catch (error) {
      return fail(describe(error));
    }
  },
);

server.tool(
  'upload_to_project',
  'Sobe um arquivo para a pasta do projeto no OneDrive. A origem pode ser um caminho absoluto no computador ou uma URL https.',
  {
    project_id: z.string().uuid(),
    source: z
      .string()
      .optional()
      .describe(
        'Caminho absoluto NA MÁQUINA DA PESSOA (ex.: /Users/voce/Downloads/ata.docx) ou URL https. ' +
          'Prefira este caminho: não consome contexto e não tem limite de 5MB.',
      ),
    content_base64: z
      .string()
      .optional()
      .describe(
        'Conteúdo do arquivo em base64, para arquivo anexado na conversa que não existe no disco ' +
          'desta máquina. Exige file_name. ÚLTIMO RECURSO: você precisa transcrever o arquivo ' +
          'inteiro, o que é lento e caro. Acima de ~100KB, peça para a pessoa salvar no computador ' +
          'e passe o caminho em source. Máximo 200KB.',
      ),
    path: z
      .string()
      .optional()
      .describe(
        'Pasta de destino relativa à raiz, ex.: "3.Execução". ATENÇÃO: omitir joga o arquivo na ' +
          'RAIZ do projeto — só omita quando a pessoa pedir a raiz explicitamente.',
      ),
    create_missing: z
      .boolean()
      .optional()
      .describe('Cria a pasta do caminho se ela não existir, em vez de falhar.'),
    file_name: z
      .string()
      .optional()
      .describe('Nome final no OneDrive. Sem isso, usa o nome de origem.'),
  },
  async ({ project_id, source, content_base64, path, file_name, create_missing }) => {
    try {
      if (!source && !content_base64) {
        return fail('Informe o caminho do arquivo (source) ou o conteúdo em base64.');
      }
      if (content_base64 && !file_name?.trim()) {
        return fail('Ao enviar conteúdo em base64, informe também file_name (com extensão).');
      }

      const project = await requireProject(project_id);
      const loaded = content_base64
        ? loadFromBase64(content_base64, file_name!.trim())
        : await loadSource(source!);
      const destination = create_missing
        ? await ensureFolderPath(project.driveId, project.rootItemId, path)
        : await resolveFolderPath(project.driveId, project.rootItemId, path);

      const uploaded = await uploadFile(
        project.driveId,
        destination.id,
        file_name?.trim() || loaded.fileName,
        loaded.content,
        loaded.contentType,
      );

      return ok(
        `✅ "${uploaded.name}" enviado para ${project.name} · ` +
          `${destination.trail.join('/') || 'raiz'} (${Math.max(1, Math.round(loaded.content.byteLength / 1024))} KB).`,
      );
    } catch (error) {
      return fail(describe(error));
    }
  },
);

// ── Leituras do Pulse ─────────────────────────────────────────────────────────
//
// Nenhuma expõe custo, salário, margem, folha ou reembolso — ver reads.ts.

server.tool(
  'list_projects',
  'Lista projetos do Pulse com cliente, gerente, período e etapa do portfólio. Não traz valor de contrato, custo nem margem.',
  {
    query: z.string().optional().describe('Filtra pelo nome do projeto'),
    stage: z
      .enum(['planning', 'value_delivery', 'results_presentation', 'learning_case', 'completed'])
      .optional()
      .describe('Filtra pela etapa do portfólio'),
  },
  async ({ query, stage }) => {
    try {
      return ok(await listProjects(query, stage));
    } catch (error) {
      return fail(describe(error));
    }
  },
);

server.tool(
  'list_project_team',
  'Mostra quem está alocado num projeto e quantas horas foram planejadas para cada pessoa. Não traz custo/hora nem salário.',
  { project_id: z.string().uuid() },
  async ({ project_id }) => {
    try {
      return ok(await listProjectTeam(project_id));
    } catch (error) {
      return fail(describe(error));
    }
  },
);

server.tool(
  'list_opportunities',
  'Lista oportunidades do pipeline comercial por etapa, com valor estimado. Use "Oportunidade" e "Pipeline" ao falar disso — nunca "lead", "CRM" ou "funil".',
  {
    stage: z
      .enum(['screening', 'qualification', 'proposal', 'negotiation', 'closed', 'closed_lost', 'stand_by'])
      .optional()
      .describe('Etapa do pipeline'),
    query: z.string().optional().describe('Filtra pelo nome da oportunidade'),
  },
  async ({ stage, query }) => {
    try {
      return ok(await listOpportunities(stage, query));
    } catch (error) {
      return fail(describe(error));
    }
  },
);

// ─── Escrita de Oportunidade ──────────────────────────────────────────────────
//
// A barreira é a policy: estas ferramentas rodam com a sessão da pessoa, então o banco
// recusa o que `pipeline:editar` não permite — a mesma capacidade que governa a tela.
// Fechar negócio e dar perda ficam de fora de propósito; ver `writes.ts`.

const CAMPOS_OPORTUNIDADE = {
  company_name: z.string().optional().describe('Empresa do contato'),
  contact_name: z.string().optional().describe('Nome da pessoa de contato'),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  estimated_value: z.number().optional().describe('Valor estimado em reais'),
  service_line: z
    .enum([
      'financiamento_inovacao',
      'consultoria_estrategica',
      'product_studio',
      'educacao_corporativa',
      'ventures',
    ])
    .optional()
    .describe('Linha de serviço'),
  source: z.string().optional().describe('Origem: indicação, evento, inbound...'),
  notes: z.string().optional(),
};

server.tool(
  'create_opportunity',
  'Cria uma oportunidade no Pipeline comercial, em Prospecção. Use "Oportunidade" e "Pipeline" ao falar disso — nunca "lead", "CRM" ou "funil".',
  {
    name: z.string().describe('Nome da oportunidade'),
    ...CAMPOS_OPORTUNIDADE,
  },
  async ({ name, ...campos }) => {
    try {
      return ok(await criaOportunidade({ name, ...campos }));
    } catch (error) {
      return fail(describe(error));
    }
  },
);

server.tool(
  'update_opportunity',
  'Altera campos de uma oportunidade. Passe apenas o que deseja mudar. Para mudar de etapa use move_opportunity_stage.',
  {
    opportunity_id: z.string().uuid(),
    name: z.string().optional(),
    ...CAMPOS_OPORTUNIDADE,
  },
  async ({ opportunity_id, ...campos }) => {
    try {
      return ok(await atualizaOportunidade(opportunity_id, campos));
    } catch (error) {
      return fail(describe(error));
    }
  },
);

server.tool(
  'move_opportunity_stage',
  'Move a oportunidade de etapa no Pipeline. Ganho e Perda não passam por aqui: fechar negócio cria projeto e ativa orçamento, e dar perda arquiva e cancela follow-ups — ambos ficam na tela.',
  {
    opportunity_id: z.string().uuid(),
    stage: z
      .enum(ETAPAS_MOVIVEIS)
      .describe('Etapa de destino. stand_by é o Follow Up, e guarda a etapa de origem para o retorno.'),
  },
  async ({ opportunity_id, stage }) => {
    try {
      return ok(await moveEtapaOportunidade(opportunity_id, stage));
    } catch (error) {
      return fail(describe(error));
    }
  },
);

server.tool(
  'list_project_activities',
  'Lista o kanban de atividades de um projeto: título, coluna, tipo, pontos, responsável e bloqueios.',
  {
    project_id: z.string().uuid(),
    column: z
      .enum(['product_backlog', 'sprint_backlog', 'in_dev', 'in_test', 'in_deploy', 'done'])
      .optional(),
  },
  async ({ project_id, column }) => {
    try {
      return ok(await listProjectActivities(project_id, column));
    } catch (error) {
      return fail(describe(error));
    }
  },
);

server.tool(
  'list_project_okrs',
  'Lista os objetivos e resultados-chave de um projeto, com progresso.',
  { project_id: z.string().uuid() },
  async ({ project_id }) => {
    try {
      return ok(await listProjectOkrs(project_id));
    } catch (error) {
      return fail(describe(error));
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('og-pulse MCP Drive rodando (stdio).');
}

main().catch((error) => {
  console.error('Falha ao iniciar:', error);
  process.exit(1);
});
