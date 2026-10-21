import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { fetchEmployeeDirectory } from '@/services/employeeDirectoryService';
import type {
  CreateProjectEmailInput,
  EmailSaveTarget,
  ProjectEmailAttachment,
  ProjectEmailDetail,
  ProjectEmailListItem,
  ProjectEmailPlacement,
} from '@/types/projectEmail';

/**
 * E-mails salvos no projeto (ADR-0047).
 *
 * A autorização é da RLS (`email_readable_project_ids` / `can_save_project_email`): nada aqui
 * substitui isso. A lista não traz o corpo — com imagem embutida ele passa de megabytes,
 * e só é lido quando alguém abre o e-mail.
 */
const projectEmails = () => supabase.from('project_emails');

const LIST_COLUMNS =
  'id, project_id, subject, from_name, from_address, to_recipients, cc_recipients, received_at, summary, attachments, saved_by, created_at';

interface ProjectEmailRow {
  id: string;
  project_id: string;
  subject: string;
  from_name: string | null;
  from_address: string | null;
  to_recipients: string[] | null;
  cc_recipients: string[] | null;
  received_at: string;
  summary: string | null;
  attachments: Json;
  saved_by: string;
  created_at: string;
  body?: string;
  body_is_html?: boolean;
}

function toListItem(row: ProjectEmailRow, savedByName: string | null): ProjectEmailListItem {
  return {
    id: row.id,
    projectId: row.project_id,
    subject: row.subject,
    fromName: row.from_name,
    fromAddress: row.from_address,
    to: row.to_recipients ?? [],
    cc: row.cc_recipients ?? [],
    receivedAt: row.received_at,
    summary: row.summary,
    // Forma garantida na escrita (`create` abaixo); o banco só confere que é lista.
    attachments: Array.isArray(row.attachments)
      ? (row.attachments as unknown as ProjectEmailAttachment[])
      : [],
    savedById: row.saved_by,
    savedByName,
    createdAt: row.created_at,
  };
}

/**
 * Nome de quem salvou vem do diretório (PUL-162): `employees(...)` aninhado não retorna
 * colegas para quem não é admin/gerente.
 */
async function savedByNames(): Promise<Map<string, string>> {
  const directory = await fetchEmployeeDirectory();
  return new Map(directory.map((entry) => [entry.id, entry.nome]));
}

export const projectEmailService = {
  async listByProject(projectId: string): Promise<ProjectEmailListItem[]> {
    const { data, error } = await projectEmails()
      .select(LIST_COLUMNS)
      .eq('project_id', projectId)
      .order('received_at', { ascending: false });

    if (error) throw error;

    const names = await savedByNames();
    return (data ?? []).map((row: ProjectEmailRow) =>
      toListItem(row, names.get(row.saved_by) ?? null),
    );
  },

  async getById(id: string): Promise<ProjectEmailDetail> {
    const { data, error } = await projectEmails()
      .select(`${LIST_COLUMNS}, body, body_is_html`)
      .eq('id', id)
      .single();

    if (error) throw error;

    const row: ProjectEmailRow = data;
    const names = await savedByNames();
    return {
      ...toListItem(row, names.get(row.saved_by) ?? null),
      body: row.body ?? '',
      bodyIsHtml: row.body_is_html ?? false,
    };
  },

  /** Projetos onde este e-mail já está, entre os que a pessoa enxerga. */
  async listPlacements(internetMessageId: string): Promise<ProjectEmailPlacement[]> {
    const { data, error } = await projectEmails()
      .select('id, project_id, projects(name)')
      .eq('internet_message_id', internetMessageId);

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      projectId: row.project_id,
      projectName: row.projects?.name ?? 'Projeto',
    }));
  },

  /** Seletor: o banco decide com o mesmo predicado da policy de INSERT. */
  async listSaveTargets(): Promise<EmailSaveTarget[]> {
    const { data, error } = await supabase.rpc('projects_for_email_save');
    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      hasDriveRoot: row.has_drive_root,
    }));
  },

  async create(input: CreateProjectEmailInput): Promise<void> {
    // `tenant_id` vem do projeto, pelo trigger `project_emails_guard` (ADR-0021).
    const { error } = await projectEmails().insert({
      project_id: input.projectId,
      saved_by: input.savedById,
      internet_message_id: input.internetMessageId,
      subject: input.subject,
      from_name: input.fromName,
      from_address: input.fromAddress,
      to_recipients: input.to,
      cc_recipients: input.cc,
      received_at: input.receivedAt,
      body: input.body,
      body_is_html: input.bodyIsHtml,
      summary: input.summary,
      attachments: input.attachments as unknown as Json,
    });

    if (error) throw error;
  },

  async updateSummary(id: string, summary: string | null): Promise<void> {
    const { error } = await projectEmails().update({ summary }).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await projectEmails().delete().eq('id', id);
    if (error) throw error;
  },
};
