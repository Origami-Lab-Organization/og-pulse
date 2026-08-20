import { supabase } from '@/integrations/supabase/client';
import { PROJECT_FILE_CATEGORY_DOCUMENT } from '@/lib/projectFiles.constants';
import type { ProjectFile, UploadProjectFileInput } from '@/types/projectFile.types';

const FILES_BUCKET = 'project-contracts';

export const PROJECT_FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024;

// folder_id fora dos tipos gerados até rodar `supabase gen types` — ver TD-0015.
/* eslint-disable @typescript-eslint/no-explicit-any */
const filesTable = () => supabase.from('project_files' as any) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface ProjectFileRow {
  id: string;
  project_id: string;
  category: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  folder_id: string | null;
  uploaded_by: string | null;
  created_at: string;
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

function createStoragePath(tenantId: string, projectId: string, originalName: string): string {
  return `${tenantId}/${projectId}/${crypto.randomUUID()}${fileExtension(originalName)}`;
}

/**
 * PDF abre inline; qualquer outro tipo é forçado a download. Servir HTML/SVG
 * inline no domínio do storage seria XSS hospedado — o bucket passou a aceitar
 * qualquer mime em 20260811150000.
 */
export function shouldForceDownload(mimeType: string): boolean {
  return mimeType !== 'application/pdf';
}

export const projectFileService = {
  async list(projectId: string): Promise<ProjectFile[]> {
    const { data, error } = await filesTable()
      .select('id, project_id, category, file_name, file_size, mime_type, storage_path, folder_id, uploaded_by, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return ((data ?? []) as ProjectFileRow[]).map((row) => ({
      id: row.id,
      projectId: row.project_id,
      category: row.category,
      fileName: row.file_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      storagePath: row.storage_path,
      folderId: row.folder_id,
      uploadedBy: row.uploaded_by,
      createdAt: row.created_at,
    }));
  },

  async upload({
    file,
    fileName,
    projectId,
    tenantId,
    folderId,
    uploadedBy,
  }: UploadProjectFileInput): Promise<void> {
    const storagePath = createStoragePath(tenantId, projectId, file.name);
    const contentType = file.type || 'application/octet-stream';

    const { error: uploadError } = await supabase.storage
      .from(FILES_BUCKET)
      .upload(storagePath, file, { contentType });

    if (uploadError) throw uploadError;

    const { error: persistError } = await filesTable().insert({
      tenant_id: tenantId,
      project_id: projectId,
      category: PROJECT_FILE_CATEGORY_DOCUMENT,
      file_name: fileName,
      file_size: file.size,
      mime_type: contentType,
      storage_path: storagePath,
      folder_id: folderId ?? null,
      uploaded_by: uploadedBy ?? null,
    });

    if (persistError) {
      await supabase.storage.from(FILES_BUCKET).remove([storagePath]);
      throw persistError;
    }
  },

  /**
   * O objeto sai antes da linha: a policy de DELETE do storage confere a autoria
   * em project_files, então apagar os metadados primeiro tiraria do autor a
   * permissão sobre os próprios bytes. Se a segunda etapa falhar, a linha
   * sobrevive e um novo delete conclui — remover objeto inexistente é no-op.
   */
  async remove(file: Pick<ProjectFile, 'id' | 'storagePath'>): Promise<void> {
    const { error: storageError } = await supabase.storage.from(FILES_BUCKET).remove([file.storagePath]);
    if (storageError) throw storageError;

    const { error } = await filesTable().delete().eq('id', file.id);
    if (error) throw error;
  },

  async createDownloadUrl(storagePath: string, downloadAs?: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(FILES_BUCKET)
      .createSignedUrl(storagePath, 60, downloadAs ? { download: downloadAs } : undefined);

    if (error) throw error;
    return data.signedUrl;
  },
};
