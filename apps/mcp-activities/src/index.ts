/**
 * og-pulse MCP Activities Server
 *
 * Permite gerenciar o kanban de atividades do Origami Pulse conversacionalmente
 * via Claude Desktop ou qualquer cliente MCP compatível.
 *
 * Entra com as credenciais da própria pessoa e opera SOB A RLS — igual ao
 * `apps/mcp-drive`. Antes usava `SUPABASE_SERVICE_KEY`, que bypassa RLS e com ela
 * o `tenant_id`: um LLM no volante conseguia ler e escrever o kanban de qualquer
 * tenant, e nenhuma capacidade do ADR-0027 o alcançava. Ver TD-0015.
 *
 * Consequência de desenho: `tenant_id` e autoria (`created_by`, `changed_by`,
 * `archived_by`) deixaram de ser parâmetro de tool. Vinham do modelo, que podia
 * apontar outro tenant ou atribuir a mudança a outra pessoa. Agora derivam da
 * sessão, e a RLS confere de novo do outro lado.
 *
 * Variáveis de ambiente requeridas:
 *   SUPABASE_URL              — URL do projeto Supabase
 *   SUPABASE_PUBLISHABLE_KEY  — chave publicável (a mesma do bundle)
 *   PULSE_EMAIL / PULSE_PASSWORD — credenciais da pessoa que opera o MCP
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { currentEmployee, getSupabase } from './supabase.js';

// ── Domain constants ──────────────────────────────────────────────────────────

const COLUMN_ORDER = [
  'product_backlog',
  'sprint_backlog',
  'in_dev',
  'in_test',
  'in_deploy',
  'done',
] as const;

type ColumnName = (typeof COLUMN_ORDER)[number];

const COLUMN_LABELS: Record<ColumnName, string> = {
  product_backlog: 'Product Backlog',
  sprint_backlog: 'Sprint Backlog',
  in_dev: 'In Dev',
  in_test: 'In Test',
  in_deploy: 'In Deploy',
  done: 'Done',
};

const CARD_TYPE_LABELS: Record<string, string> = {
  story: 'História',
  bug: 'Bug',
  tech_debt: 'Dívida Técnica',
  task: 'Tarefa',
};

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planejada',
  active: 'Ativa',
  completed: 'Concluída',
};

// WIP limits apply only to these columns
const WIP_COLUMNS = new Set<ColumnName>(['in_dev', 'in_test', 'in_deploy']);

// Fallback WIP limits used when no settings row exists for the project
const DEFAULT_WIP_LIMITS: Partial<Record<ColumnName, number>> = {
  in_dev: 5,
  in_test: 5,
  in_deploy: 3,
};

// ── Response helpers ──────────────────────────────────────────────────────────

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function fail(text: string) {
  return { content: [{ type: 'text' as const, text: `❌ Erro: ${text}` }], isError: true };
}

function colLabel(col: string): string {
  return COLUMN_LABELS[col as ColumnName] ?? col;
}

// ── MCP server ────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'og-pulse-activities',
  version: '1.0.0',
});

// ─────────────────────────────────────────────────────────────────────────────
// list_project_cards
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  'list_project_cards',
  'Lista os cards ativos do kanban de um projeto. Suporta filtros por coluna, sprint, tipo, responsável e estado de bloqueio.',
  {
    project_id: z.string().uuid('project_id deve ser um UUID válido'),
    column: z
      .enum(['product_backlog', 'sprint_backlog', 'in_dev', 'in_test', 'in_deploy', 'done'])
      .optional()
      .describe('Filtrar por coluna específica'),
    sprint_id: z.string().uuid().optional().describe('Filtrar por sprint'),
    card_type: z
      .enum(['story', 'bug', 'tech_debt', 'task'])
      .optional()
      .describe('Filtrar por tipo de card'),
    assignee_id: z.string().uuid().optional().describe('Filtrar por responsável (UUID do employee)'),
    is_blocked: z.boolean().optional().describe('true para mostrar apenas bloqueados'),
  },
  async ({ project_id, column, sprint_id, card_type, assignee_id, is_blocked }) => {
    const supabase = await getSupabase();
    let query = (
      supabase
        .from('project_activity_cards')
        .select(
          'id, card_number, title, card_type, column_name, points, is_blocked, blocked_reason, sprint_id, ' +
          'assignee:employees!project_activity_cards_assignee_id_fkey(id, nome), ' +
          'sprint:project_activity_sprints(id, name)',
        ) as any
    )
      .eq('project_id', project_id)
      .eq('is_archived', false)
      .order('column_name')
      .order('position');

    if (column) query = query.eq('column_name', column);
    if (sprint_id) query = query.eq('sprint_id', sprint_id);
    if (card_type) query = query.eq('card_type', card_type);
    if (assignee_id) query = query.eq('assignee_id', assignee_id);
    if (is_blocked !== undefined) query = query.eq('is_blocked', is_blocked);

    const { data, error } = await query;
    if (error) return fail(error.message);
    if (!data?.length) return ok('Nenhum card encontrado com os filtros informados.');

    const grouped: Partial<Record<ColumnName, string[]>> = {};
    for (const c of data) {
      const col = c.column_name as ColumnName;
      if (!grouped[col]) grouped[col] = [];
      const blocked = c.is_blocked
        ? ` 🔴 BLOQUEADO${c.blocked_reason ? `: ${c.blocked_reason}` : ''}`
        : '';
      const who = c.assignee?.nome ? ` | 👤 ${c.assignee.nome}` : '';
      const pts = c.points != null ? ` | ${c.points}pts` : '';
      const sprintName = c.sprint?.name ? ` | 🏃 ${c.sprint.name}` : '';
      const type = CARD_TYPE_LABELS[c.card_type] ?? c.card_type;
      grouped[col]!.push(`  • [#${c.card_number}] ${c.title} (${type})${pts}${who}${sprintName}${blocked}`);
    }

    const sections: string[] = [`**${data.length} card(s):**`];
    for (const col of COLUMN_ORDER) {
      if (grouped[col]?.length) {
        sections.push(`\n**${COLUMN_LABELS[col]}** (${grouped[col]!.length})`);
        sections.push(...grouped[col]!);
      }
    }

    return ok(sections.join('\n'));
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// get_card_details
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  'get_card_details',
  'Retorna todos os detalhes de um card: metadados, user story, critérios de aceitação, tarefas e histórico de alterações.',
  {
    card_id: z.string().uuid(),
  },
  async ({ card_id }) => {
    const supabase = await getSupabase();
    const [cardRes, historyRes, tasksRes] = await Promise.all([
      supabase
        .from('project_activity_cards')
        .select(
          '*, ' +
          'assignee:employees!project_activity_cards_assignee_id_fkey(id, nome), ' +
          'sprint:project_activity_sprints(id, name, status)',
        )
        .eq('id', card_id)
        .single(),

      supabase
        .from('project_activity_card_history')
        .select(
          'field, old_value, new_value, changed_at, ' +
          'changed_by_employee:employees!project_activity_card_history_changed_by_fkey(nome)',
        )
        .eq('card_id', card_id)
        .order('changed_at', { ascending: false })
        .limit(10),

      supabase
        .from('project_activity_tasks')
        .select('id, title, completed_at')
        .eq('card_id', card_id)
        .order('position'),
    ]);

    if (cardRes.error) return fail(cardRes.error.message);
    const c = cardRes.data as any;

    const lines: string[] = [
      `## Card #${c.card_number}: ${c.title}`,
      `**Tipo:** ${CARD_TYPE_LABELS[c.card_type] ?? c.card_type}`,
      `**Coluna:** ${colLabel(c.column_name)}`,
      `**Pontos:** ${c.points ?? '—'}`,
      `**Responsável:** ${(c.assignee as any)?.nome ?? '—'}`,
      `**Sprint:** ${(c.sprint as any)?.name ?? '—'}${(c.sprint as any) ? ` (${STATUS_LABELS[(c.sprint as any).status] ?? (c.sprint as any).status})` : ''}`,
      `**Bloqueado:** ${c.is_blocked ? `Sim — ${c.blocked_reason ?? 'sem motivo informado'}` : 'Não'}`,
      `**Arquivado:** ${c.is_archived ? 'Sim' : 'Não'}`,
      `**Criado em:** ${new Date(c.created_at).toLocaleString('pt-BR')}`,
      `**Atualizado em:** ${new Date(c.updated_at).toLocaleString('pt-BR')}`,
      `**ID:** \`${c.id}\``,
      '',
    ];

    if (c.user_story) {
      lines.push('**User Story:**', c.user_story, '');
    }
    if (c.acceptance_criteria) {
      lines.push('**Critérios de Aceitação:**', c.acceptance_criteria, '');
    }

    const tasks = tasksRes.data as any[] | null;
    if (tasks?.length) {
      const done = tasks.filter((t) => t.completed_at).length;
      lines.push(`**Tarefas (${done}/${tasks.length} concluídas):**`);
      tasks.forEach((t) => lines.push(`  ${t.completed_at ? '✅' : '⬜'} ${t.title}`));
      lines.push('');
    }

    const history = historyRes.data as any[] | null;
    if (history?.length) {
      lines.push('**Histórico recente (últimas 10 alterações):**');
      history.forEach((h) => {
        const who = (h.changed_by_employee as any)?.nome ?? 'Sistema';
        const when = new Date(h.changed_at).toLocaleString('pt-BR');
        const oldVal = h.old_value ?? '—';
        const newVal = h.new_value ?? '—';
        lines.push(`  • [${when}] **${who}**: \`${h.field}\` ${oldVal} → ${newVal}`);
      });
    }

    return ok(lines.join('\n'));
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// create_card
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  'create_card',
  'Cria um novo card no kanban de atividades de um projeto.',
  {
    project_id: z.string().uuid(),
    title: z.string().min(1, 'O título é obrigatório'),
    card_type: z
      .enum(['story', 'bug', 'tech_debt', 'task'])
      .optional()
      .default('story'),
    points: z.number().int().min(1).max(100).optional().describe('Story points (1–100)'),
    assignee_id: z.string().uuid().optional().describe('UUID do employee responsável'),
    user_story: z.string().optional(),
    acceptance_criteria: z.string().optional(),
    column_name: z
      .enum(['product_backlog', 'sprint_backlog', 'in_dev', 'in_test', 'in_deploy', 'done'])
      .optional()
      .default('product_backlog'),
    sprint_id: z.string().uuid().optional(),
  },
  async ({
    project_id,
    title,
    card_type,
    points,
    assignee_id,
    user_story,
    acceptance_criteria,
    column_name,
    sprint_id,
  }) => {
    const supabase = await getSupabase();
    const { employeeId, tenantId } = await currentEmployee();

    const { data, error } = await supabase
      .from('project_activity_cards')
      .insert({
        project_id,
        tenant_id: tenantId,
        created_by: employeeId,
        title: title.trim(),
        card_type,
        points: points ?? null,
        assignee_id: assignee_id ?? null,
        user_story: user_story?.trim() ?? null,
        acceptance_criteria: acceptance_criteria?.trim() ?? null,
        column_name,
        sprint_id: sprint_id ?? null,
        is_blocked: false,
      })
      .select('id, card_number, title, column_name')
      .single();

    if (error) return fail(error.message);

    const d = data as any;
    return ok(
      `✅ Card criado com sucesso!\n` +
      `**#${d.card_number} ${d.title}**\n` +
      `**Coluna:** ${colLabel(d.column_name)}\n` +
      `**ID:** \`${d.id}\``,
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// update_card
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  'update_card',
  'Atualiza campos de um card existente. Passe apenas os campos que deseja alterar.',
  {
    card_id: z.string().uuid(),
    title: z.string().min(1).optional(),
    card_type: z.enum(['story', 'bug', 'tech_debt', 'task']).optional(),
    points: z.number().int().min(1).max(100).nullable().optional(),
    assignee_id: z.string().uuid().nullable().optional(),
    user_story: z.string().nullable().optional(),
    acceptance_criteria: z.string().nullable().optional(),
    sprint_id: z.string().uuid().nullable().optional(),
  },
  async (args) => {
    const supabase = await getSupabase();
    const { card_id, ...fields } = args;

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (fields.title !== undefined) payload.title = fields.title.trim();
    if (fields.card_type !== undefined) payload.card_type = fields.card_type;
    if (fields.points !== undefined) payload.points = fields.points;
    if (fields.assignee_id !== undefined) payload.assignee_id = fields.assignee_id;
    if (fields.user_story !== undefined) payload.user_story = fields.user_story;
    if (fields.acceptance_criteria !== undefined)
      payload.acceptance_criteria = fields.acceptance_criteria;
    if (fields.sprint_id !== undefined) payload.sprint_id = fields.sprint_id;

    const changedFields = Object.keys(payload).filter((k) => k !== 'updated_at');
    if (changedFields.length === 0) return ok('Nenhum campo para atualizar foi informado.');

    const { data: card, error: fetchErr } = await supabase
      .from('project_activity_cards')
      .select('card_number, title')
      .eq('id', card_id)
      .single();
    if (fetchErr || !card) return fail('Card não encontrado.');

    const { error } = await supabase
      .from('project_activity_cards')
      .update(payload)
      .eq('id', card_id);
    if (error) return fail(error.message);

    const c = card as any;
    return ok(
      `✅ Card #${c.card_number} "${c.title}" atualizado.\n` +
      `**Campos alterados:** ${changedFields.join(', ')}`,
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// move_card
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  'move_card',
  'Move um card uma posição para frente ou para trás no kanban. Aplica validações de WIP limit e bloqueio.',
  {
    card_id: z.string().uuid(),
    direction: z.enum(['forward', 'backward']).describe('"forward" avança para a próxima coluna, "backward" retrocede'),
  },
  async ({ card_id, direction }) => {
    const supabase = await getSupabase();
    // 1. Fetch card
    const { data: card, error: cardErr } = await supabase
      .from('project_activity_cards')
      .select('id, card_number, title, column_name, is_blocked, is_archived, project_id')
      .eq('id', card_id)
      .single();
    if (cardErr || !card) return fail('Card não encontrado.');

    const c = card as any;

    if (c.is_archived) return fail('Não é possível mover um card arquivado.');

    // 2. Blocked cards cannot advance
    if (direction === 'forward' && c.is_blocked) {
      return fail(
        `Card #${c.card_number} está bloqueado. ` +
        `Resolva o impedimento e desbloqueie o card antes de avançá-lo.`,
      );
    }

    // 3. Compute target column
    const currentIdx = COLUMN_ORDER.indexOf(c.column_name as ColumnName);
    if (currentIdx === -1) return fail(`Coluna desconhecida: "${c.column_name}".`);

    const targetIdx = direction === 'forward' ? currentIdx + 1 : currentIdx - 1;

    if (targetIdx < 0) {
      return fail(`Card já está na primeira coluna (${COLUMN_LABELS[COLUMN_ORDER[0]]}).`);
    }
    if (targetIdx >= COLUMN_ORDER.length) {
      return fail(`Card já está na última coluna (${COLUMN_LABELS[COLUMN_ORDER[COLUMN_ORDER.length - 1]]}).`);
    }

    const targetColumn = COLUMN_ORDER[targetIdx];

    // 4. WIP limit check (only when advancing into a limited column)
    if (direction === 'forward' && WIP_COLUMNS.has(targetColumn)) {
      const { data: settings } = await supabase
        .from('project_activity_settings')
        .select('wip_in_dev, wip_in_test, wip_in_deploy')
        .eq('project_id', c.project_id)
        .single();

      // Merge DB settings over defaults (null means "use default")
      const wipLimits: Partial<Record<ColumnName, number>> = { ...DEFAULT_WIP_LIMITS };
      if (settings) {
        const s = settings as any;
        if (s.wip_in_dev != null) wipLimits.in_dev = s.wip_in_dev;
        if (s.wip_in_test != null) wipLimits.in_test = s.wip_in_test;
        if (s.wip_in_deploy != null) wipLimits.in_deploy = s.wip_in_deploy;
      }

      const limit = wipLimits[targetColumn];
      if (limit !== undefined) {
        const { count } = await supabase
          .from('project_activity_cards')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', c.project_id)
          .eq('column_name', targetColumn)
          .eq('is_archived', false);

        if ((count ?? 0) >= limit) {
          return fail(
            `Limite WIP atingido para a coluna "${COLUMN_LABELS[targetColumn]}" ` +
            `(máximo: ${limit} card(s), atual: ${count}). ` +
            `Conclua ou mova outros cards antes de adicionar novos nesta coluna.`,
          );
        }
      }
    }

    // 5. Compute position (append at end of target column)
    const { data: lastInCol } = await supabase
      .from('project_activity_cards')
      .select('position')
      .eq('project_id', c.project_id)
      .eq('column_name', targetColumn)
      .eq('is_archived', false)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newPosition = ((lastInCol as any)?.position ?? -1) + 1;

    // 6. Persist move
    const { error: updateErr } = await supabase
      .from('project_activity_cards')
      .update({
        column_name: targetColumn,
        position: newPosition,
        updated_at: new Date().toISOString(),
      })
      .eq('id', card_id);

    if (updateErr) return fail(updateErr.message);

    const arrow = direction === 'forward' ? '→' : '←';
    return ok(
      `✅ Card #${c.card_number} movido com sucesso!\n` +
      `${colLabel(c.column_name)} ${arrow} **${COLUMN_LABELS[targetColumn]}**`,
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// block_card
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  'block_card',
  'Marca um card como bloqueado/impedido. O motivo do bloqueio é obrigatório.',
  {
    card_id: z.string().uuid(),
    reason: z.string().min(1, 'O motivo do bloqueio é obrigatório'),
  },
  async ({ card_id, reason }) => {
    const supabase = await getSupabase();
    const { data: card, error: cardErr } = await supabase
      .from('project_activity_cards')
      .select('id, card_number, title, is_blocked')
      .eq('id', card_id)
      .single();
    if (cardErr || !card) return fail('Card não encontrado.');

    const c = card as any;
    if (c.is_blocked) {
      return ok(`Card #${c.card_number} já está bloqueado. Use update_card para atualizar o motivo.`);
    }

    const { error: updateErr } = await supabase
      .from('project_activity_cards')
      .update({
        is_blocked: true,
        blocked_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', card_id);
    if (updateErr) return fail(updateErr.message);

    const { employeeId, tenantId } = await currentEmployee();
    await supabase.from('project_activity_card_history').insert({
      card_id,
      tenant_id: tenantId,
      changed_by: employeeId,
      field: 'blocked',
      old_value: 'false',
      new_value: `true: ${reason.trim()}`,
    });

    return ok(`🔴 Card #${c.card_number} "${c.title}" marcado como bloqueado.\n**Motivo:** ${reason.trim()}`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// unblock_card
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  'unblock_card',
  'Remove o bloqueio de um card, liberando-o para avançar no kanban.',
  {
    card_id: z.string().uuid(),
  },
  async ({ card_id }) => {
    const supabase = await getSupabase();
    const { data: card, error: cardErr } = await supabase
      .from('project_activity_cards')
      .select('id, card_number, title, is_blocked, blocked_reason')
      .eq('id', card_id)
      .single();
    if (cardErr || !card) return fail('Card não encontrado.');

    const c = card as any;
    if (!c.is_blocked) {
      return ok(`Card #${c.card_number} não está bloqueado.`);
    }

    const previousReason = c.blocked_reason ?? 'sem motivo';

    const { error: updateErr } = await supabase
      .from('project_activity_cards')
      .update({
        is_blocked: false,
        blocked_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', card_id);
    if (updateErr) return fail(updateErr.message);

    const { employeeId, tenantId } = await currentEmployee();
    await supabase.from('project_activity_card_history').insert({
      card_id,
      tenant_id: tenantId,
      changed_by: employeeId,
      field: 'blocked',
      old_value: `true: ${previousReason}`,
      new_value: 'false',
    });

    return ok(`✅ Card #${c.card_number} "${c.title}" desbloqueado com sucesso.`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// archive_card
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  'archive_card',
  'Arquiva um card (soft delete). O card pode ser restaurado pelo painel de cards arquivados.',
  {
    card_id: z.string().uuid(),
  },
  async ({ card_id }) => {
    const supabase = await getSupabase();
    const { employeeId, tenantId } = await currentEmployee();

    const { data: card, error: cardErr } = await supabase
      .from('project_activity_cards')
      .select('id, card_number, title, is_archived')
      .eq('id', card_id)
      .single();
    if (cardErr || !card) return fail('Card não encontrado.');

    const c = card as any;
    if (c.is_archived) return ok(`Card #${c.card_number} já está arquivado.`);

    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('project_activity_cards')
      .update({ is_archived: true, archived_at: now, archived_by: employeeId, updated_at: now })
      .eq('id', card_id);
    if (updateErr) return fail(updateErr.message);

    await supabase.from('project_activity_card_history').insert({
      card_id,
      tenant_id: tenantId,
      changed_by: employeeId,
      field: 'archived',
      old_value: 'false',
      new_value: 'true',
    });

    return ok(`📦 Card #${c.card_number} "${c.title}" arquivado com sucesso.`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// get_sprint_status
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  'get_sprint_status',
  'Retorna o status completo da sprint ativa de um projeto: goal, período, pontos planejados vs entregues, distribuição por coluna e cards bloqueados.',
  {
    project_id: z.string().uuid(),
  },
  async ({ project_id }) => {
    const supabase = await getSupabase();
    // Fetch active sprint (most recent if multiple — shouldn't happen)
    const { data: sprint, error: sprintErr } = await supabase
      .from('project_activity_sprints')
      .select('*')
      .eq('project_id', project_id)
      .eq('status', 'active')
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sprintErr) return fail(sprintErr.message);
    if (!sprint) return ok('Nenhuma sprint ativa encontrada para este projeto.');

    const s = sprint as any;

    // Fetch all non-archived cards in this sprint
    const { data: cards, error: cardsErr } = (await supabase
      .from('project_activity_cards')
      .select(
        'id, card_number, title, card_type, column_name, points, is_blocked, blocked_reason, ' +
        'assignee:employees!project_activity_cards_assignee_id_fkey(nome)',
      )
      .eq('project_id', project_id)
      .eq('sprint_id', s.id)
      .eq('is_archived', false)) as any;

    if (cardsErr) return fail(cardsErr.message);

    const allCards: any[] = cards ?? [];
    const totalPlanned = allCards.reduce((sum, c) => sum + (c.points ?? 0), 0);
    const doneCards = allCards.filter((c) => c.column_name === 'done');
    const totalDone = doneCards.reduce((sum, c) => sum + (c.points ?? 0), 0);
    const blockedCards = allCards.filter((c) => c.is_blocked);

    // Distribution by column
    const byColumn: Partial<Record<ColumnName, any[]>> = {};
    for (const c of allCards) {
      const col = c.column_name as ColumnName;
      if (!byColumn[col]) byColumn[col] = [];
      byColumn[col]!.push(c);
    }

    const startStr = new Date(s.start_date).toLocaleDateString('pt-BR');
    const endStr = new Date(s.end_date).toLocaleDateString('pt-BR');
    const endDate = new Date(s.end_date);
    const today = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysLeftLabel =
      daysLeft > 0 ? `${daysLeft} dia(s) restante(s)` : daysLeft === 0 ? 'último dia' : 'encerrada';

    const pct = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0;

    const lines: string[] = [
      `## 🏃 ${s.name}`,
      s.goal ? `**Goal:** ${s.goal}` : '',
      `**Período:** ${startStr} → ${endStr} (${daysLeftLabel})`,
      `**Progresso:** ${totalDone}pts entregues de ${totalPlanned}pts planejados — **${pct}%**`,
      `**Total de cards na sprint:** ${allCards.length}`,
      '',
      '### Distribuição por coluna:',
    ];

    for (const col of COLUMN_ORDER) {
      const colCards = byColumn[col] ?? [];
      if (!colCards.length) continue;
      const pts = colCards.reduce((sum, c) => sum + (c.points ?? 0), 0);
      const blockedInCol = colCards.filter((c) => c.is_blocked).length;
      const blockedNote = blockedInCol > 0 ? ` | ${blockedInCol} bloqueado(s)` : '';
      lines.push(`  **${COLUMN_LABELS[col]}:** ${colCards.length} card(s) — ${pts}pts${blockedNote}`);
    }

    if (blockedCards.length > 0) {
      lines.push('', `### 🔴 Cards bloqueados (${blockedCards.length}):`);
      for (const c of blockedCards) {
        const who = c.assignee?.nome ? ` | 👤 ${c.assignee.nome}` : '';
        lines.push(`  • #${c.card_number} ${c.title}${who}${c.blocked_reason ? ` — ${c.blocked_reason}` : ''}`);
      }
    }

    return ok(lines.filter((l) => l !== '').join('\n'));
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// list_sprints
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  'list_sprints',
  'Lista todas as sprints de um projeto, com datas, status e goal.',
  {
    project_id: z.string().uuid(),
    status: z.enum(['planned', 'active', 'completed']).optional().describe('Filtrar por status'),
  },
  async ({ project_id, status }) => {
    const supabase = await getSupabase();
    let query = supabase
      .from('project_activity_sprints')
      .select('id, name, number, start_date, end_date, goal, status')
      .eq('project_id', project_id)
      .order('number', { ascending: false }) as any;

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return fail(error.message);
    if (!data?.length) return ok('Nenhuma sprint encontrada.');

    const statusIcon: Record<string, string> = {
      planned: '📅',
      active: '🏃',
      completed: '✅',
    };

    const lines: string[] = [`**${data.length} sprint(s):**`, ''];
    for (const sp of data as any[]) {
      const start = new Date(sp.start_date).toLocaleDateString('pt-BR');
      const end = new Date(sp.end_date).toLocaleDateString('pt-BR');
      const icon = statusIcon[sp.status] ?? '•';
      const goal = sp.goal ? `\n    Goal: "${sp.goal}"` : '';
      lines.push(`${icon} **${sp.name}** (${STATUS_LABELS[sp.status] ?? sp.status}) | ${start} → ${end}${goal}`);
      lines.push(`    ID: \`${sp.id}\``);
    }

    return ok(lines.join('\n'));
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// assign_card_to_sprint
// ─────────────────────────────────────────────────────────────────────────────

server.tool(
  'assign_card_to_sprint',
  'Associa um card a uma sprint. Passe sprint_id null para remover o card de qualquer sprint.',
  {
    card_id: z.string().uuid(),
    sprint_id: z.string().uuid().nullable().describe('UUID da sprint, ou null para desassociar'),
  },
  async ({ card_id, sprint_id }) => {
    const supabase = await getSupabase();
    const { data: card, error: cardErr } = await supabase
      .from('project_activity_cards')
      .select('id, card_number, title')
      .eq('id', card_id)
      .single();
    if (cardErr || !card) return fail('Card não encontrado.');

    const { error: updateErr } = await supabase
      .from('project_activity_cards')
      .update({ sprint_id, updated_at: new Date().toISOString() })
      .eq('id', card_id);
    if (updateErr) return fail(updateErr.message);

    const c = card as any;

    if (!sprint_id) {
      return ok(`✅ Card #${c.card_number} "${c.title}" removido da sprint.`);
    }

    const { data: sprintData } = await supabase
      .from('project_activity_sprints')
      .select('name')
      .eq('id', sprint_id)
      .single();

    const sprintName = (sprintData as any)?.name ?? sprint_id;
    return ok(`✅ Card #${c.card_number} "${c.title}" associado à sprint **${sprintName}**.`);
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[og-pulse-activities] MCP server running on stdio');
}

main().catch((e) => {
  console.error('[og-pulse-activities] Fatal error:', e);
  process.exit(1);
});
