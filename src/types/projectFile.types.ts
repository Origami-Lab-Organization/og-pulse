export type ProjectFileCategory = 'contract' | 'document';

export interface ProjectFolder {
  id: string;
  projectId: string;
  /** Null = pasta na raiz da aba Arquivos. */
  parentId: string | null;
  name: string;
  createdAt: string;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  category: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  /** Null = arquivo na raiz. */
  folderId: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

export interface CreateProjectFolderInput {
  projectId: string;
  tenantId: string;
  parentId: string | null;
  name: string;
  createdBy?: string | null;
}

export interface UploadProjectFileInput {
  file: File;
  /** Nome exibido na lista — o usuário define, não precisa ser o nome do arquivo. */
  fileName: string;
  projectId: string;
  tenantId: string;
  folderId: string | null;
  uploadedBy?: string | null;
}

/** Pasta do projeto já espelhada no índice local, com o id do OneDrive. */
export interface IndexedDriveFolder {
  id: string;
  externalId: string;
  name: string;
}
