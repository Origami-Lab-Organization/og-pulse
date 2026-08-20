import { supabase } from '@/integrations/supabase/client';
import type { LinkProjectDriveInput, ProjectDriveLink } from '@/types/microsoftGraph';

// Colunas criadas em 20260811180000, fora dos tipos gerados — ver TD-0015.
/* eslint-disable @typescript-eslint/no-explicit-any */
const projectsTable = () => supabase.from('projects' as any) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface ProjectDriveRow {
  onedrive_drive_id: string | null;
  onedrive_root_item_id: string | null;
  onedrive_root_path: string | null;
  onedrive_linked_at: string | null;
}

export const projectDriveService = {
  async get(projectId: string): Promise<ProjectDriveLink | null> {
    const { data, error } = await projectsTable()
      .select('onedrive_drive_id, onedrive_root_item_id, onedrive_root_path, onedrive_linked_at')
      .eq('id', projectId)
      .maybeSingle();

    if (error) throw error;

    const row = data as ProjectDriveRow | null;
    if (!row?.onedrive_drive_id || !row.onedrive_root_item_id) return null;

    return {
      driveId: row.onedrive_drive_id,
      rootItemId: row.onedrive_root_item_id,
      rootPath: row.onedrive_root_path ?? '/',
      linkedAt: row.onedrive_linked_at ?? '',
    };
  },

  async link({ projectId, driveId, rootItemId, rootPath, linkedBy }: LinkProjectDriveInput): Promise<void> {
    const { error } = await projectsTable()
      .update({
        onedrive_drive_id: driveId,
        onedrive_root_item_id: rootItemId,
        onedrive_root_path: rootPath,
        onedrive_linked_at: new Date().toISOString(),
        onedrive_linked_by: linkedBy ?? null,
      })
      .eq('id', projectId);

    if (error) throw error;
  },

  async unlink(projectId: string): Promise<void> {
    const { error } = await projectsTable()
      .update({
        onedrive_drive_id: null,
        onedrive_root_item_id: null,
        onedrive_root_path: null,
        onedrive_linked_at: null,
        onedrive_linked_by: null,
      })
      .eq('id', projectId);

    if (error) throw error;
  },
};
