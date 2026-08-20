import { supabase } from '@/integrations/supabase/client';
import type { DriveTreeNode } from '@/types/microsoftGraph';
import type {
  CreateProjectFolderInput,
  IndexedDriveFolder,
  ProjectFolder,
} from '@/types/projectFile.types';

// Tabela fora dos tipos gerados até rodar `supabase gen types` — ver TD-0015.
/* eslint-disable @typescript-eslint/no-explicit-any */
const folders = () => supabase.from('project_folders' as any) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface ProjectFolderRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
}

export const projectFolderService = {
  async list(projectId: string): Promise<ProjectFolder[]> {
    const { data, error } = await folders()
      .select('id, project_id, parent_id, name, created_at')
      .eq('project_id', projectId)
      .order('name', { ascending: true });

    if (error) throw error;

    return ((data ?? []) as ProjectFolderRow[]).map((row) => ({
      id: row.id,
      projectId: row.project_id,
      parentId: row.parent_id,
      name: row.name,
      createdAt: row.created_at,
    }));
  },

  async create({ projectId, tenantId, parentId, name, createdBy }: CreateProjectFolderInput): Promise<void> {
    const { error } = await folders().insert({
      tenant_id: tenantId,
      project_id: projectId,
      parent_id: parentId,
      name: name.trim(),
      created_by: createdBy ?? null,
    });

    if (error) throw error;
  },

  async rename(folderId: string, name: string): Promise<void> {
    const { error } = await folders().update({ name: name.trim() }).eq('id', folderId);
    if (error) throw error;
  },

  /** O banco recusa pasta não vazia (trigger); a mensagem sobe para a tela. */
  async remove(folderId: string): Promise<void> {
    const { error } = await folders().delete().eq('id', folderId);
    if (error) throw error;
  },
};

/** Pastas do projeto já indexadas com o id do OneDrive. */
export async function listIndexedDriveFolders(projectId: string): Promise<IndexedDriveFolder[]> {
  const { data, error } = await folders()
    .select('id, external_id, name')
    .eq('project_id', projectId)
    .not('external_id', 'is', null)
    .order('name', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as { id: string; external_id: string; name: string }[]).map((row) => ({
    id: row.id,
    externalId: row.external_id,
    name: row.name,
  }));
}

/**
 * Registra no índice as pastas que o GP enxergou no OneDrive. É o que permite a
 * quem NÃO alcança a raiz saber quais subpastas existem para tentar abrir.
 * Sem upsert: a policy de INSERT é de GP/admin e o índice só cresce.
 */
export async function indexDriveFolders(
  projectId: string,
  tenantId: string,
  entries: { externalId: string; name: string }[],
): Promise<void> {
  if (entries.length === 0) return;

  const known = await listIndexedDriveFolders(projectId);
  const knownIds = new Set(known.map((folder) => folder.externalId));
  const missing = entries.filter((entry) => !knownIds.has(entry.externalId));

  if (missing.length === 0) return;

  const { error } = await folders().insert(
    missing.map((entry) => ({
      tenant_id: tenantId,
      project_id: projectId,
      parent_id: null,
      name: entry.name,
      external_provider: 'onedrive',
      external_id: entry.externalId,
      external_synced_at: new Date().toISOString(),
    })),
  );

  // Índice é conveniência: falha aqui não pode derrubar a navegação de quem já
  // está vendo a pasta.
  if (error) console.warn('[onedrive] índice de pastas não atualizado:', error.message);
}

/**
 * Espelha a árvore inteira no índice, nível a nível.
 *
 * Não dá para inserir tudo de uma vez: `parent_id` referencia o id LOCAL, que só
 * existe depois que o pai foi gravado. E achatar tudo na raiz esbarraria no
 * índice único de nome por nível — duas pastas "Docs" em ramos diferentes são
 * legítimas.
 */
export async function indexDriveTree(
  projectId: string,
  tenantId: string,
  nodes: DriveTreeNode[],
): Promise<number> {
  const known = await listIndexedDriveFolders(projectId);
  const localIdByExternal = new Map(known.map((folder) => [folder.externalId, folder.id]));

  let pending = nodes.filter((node) => !localIdByExternal.has(node.externalId));
  let inserted = 0;

  while (pending.length > 0) {
    const ready = pending.filter(
      (node) => node.parentExternalId === null || localIdByExternal.has(node.parentExternalId),
    );

    // Nada pronto e ainda há pendente = pai fora da varredura. Parar evita laço
    // infinito e deixa o resto para a próxima sincronização.
    if (ready.length === 0) break;

    const { data, error } = await folders()
      .insert(
        ready.map((node) => ({
          tenant_id: tenantId,
          project_id: projectId,
          parent_id: node.parentExternalId ? localIdByExternal.get(node.parentExternalId) : null,
          name: node.name,
          external_provider: 'onedrive',
          external_id: node.externalId,
          external_synced_at: new Date().toISOString(),
        })),
      )
      .select('id, external_id');

    if (error) throw error;

    for (const row of (data ?? []) as { id: string; external_id: string }[]) {
      localIdByExternal.set(row.external_id, row.id);
    }
    inserted += ready.length;

    const readyIds = new Set(ready.map((node) => node.externalId));
    pending = pending.filter((node) => !readyIds.has(node.externalId));
  }

  return inserted;
}
