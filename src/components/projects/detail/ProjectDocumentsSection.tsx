import { useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useProjectFiles, useRemoveProjectFile, useUploadProjectFile } from '@/hooks/useProjectFiles';
import { useCreateProjectFolder, useProjectFolders, useRemoveProjectFolder } from '@/hooks/useProjectFolders';
import { PROJECT_FILE_MAX_SIZE_BYTES, projectFileService, shouldForceDownload } from '@/services/projectFileService';
import { cn } from '@/lib/utils';
import type { ProjectFile, ProjectFolder } from '@/types/projectFile.types';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function nameWithoutExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

function buildBreadcrumb(folders: ProjectFolder[], currentId: string | null): ProjectFolder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const trail: ProjectFolder[] = [];
  let cursor = currentId;

  while (cursor) {
    const folder = byId.get(cursor);
    if (!folder) break;
    trail.unshift(folder);
    cursor = folder.parentId;
  }

  return trail;
}

interface ProjectDocumentsSectionProps {
  projectId: string;
  /** GP ou admin — só eles criam e excluem pastas. */
  canManageFolders?: boolean;
  /** Membro alocado sem permissão de escrita nenhuma (projeto encerrado, etc). */
  isReadOnly?: boolean;
}

export function ProjectDocumentsSection({
  projectId,
  canManageFolders = false,
  isReadOnly = false,
}: ProjectDocumentsSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { employee } = useAuth();
  const { toast } = useToast();

  const { data: files = [], isLoading: isLoadingFiles } = useProjectFiles(projectId);
  const { data: folders = [], isLoading: isLoadingFolders } = useProjectFolders(projectId);
  const upload = useUploadProjectFile(projectId);
  const removeFile = useRemoveProjectFile(projectId);
  const createFolder = useCreateProjectFolder(projectId);
  const removeFolder = useRemoveProjectFolder(projectId);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [fileToRemove, setFileToRemove] = useState<ProjectFile | null>(null);
  const [folderToRemove, setFolderToRemove] = useState<ProjectFolder | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const breadcrumb = useMemo(() => buildBreadcrumb(folders, currentFolderId), [folders, currentFolderId]);
  const visibleFolders = folders.filter((f) => f.parentId === currentFolderId);
  const visibleFiles = files.filter((f) => f.folderId === currentFolderId);

  const isEmpty = visibleFolders.length === 0 && visibleFiles.length === 0;
  const isLoading = isLoadingFiles || isLoadingFolders;

  const handleSelectFile = (file: File) => {
    if (file.size > PROJECT_FILE_MAX_SIZE_BYTES) {
      toast({
        title: 'Arquivo não enviado',
        description: 'O limite é 10MB por arquivo.',
        variant: 'destructive',
      });
      return;
    }
    setPendingFile(file);
    setDisplayName(nameWithoutExtension(file.name));
  };

  const closeUploadDialog = () => {
    setPendingFile(null);
    setDisplayName('');
  };

  const handleConfirmUpload = () => {
    if (!pendingFile || !displayName.trim() || !employee?.tenant_id) return;
    upload.mutate(
      {
        file: pendingFile,
        fileName: displayName.trim(),
        projectId,
        tenantId: employee.tenant_id,
        folderId: currentFolderId,
        uploadedBy: employee.id,
      },
      { onSuccess: closeUploadDialog },
    );
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !employee?.tenant_id) return;
    createFolder.mutate(
      {
        projectId,
        tenantId: employee.tenant_id,
        parentId: currentFolderId,
        name: newFolderName.trim(),
        createdBy: employee.id,
      },
      {
        onSuccess: () => {
          setIsCreatingFolder(false);
          setNewFolderName('');
        },
      },
    );
  };

  const handleOpen = async (file: ProjectFile) => {
    setOpeningId(file.id);
    try {
      const url = await projectFileService.createDownloadUrl(
        file.storagePath,
        shouldForceDownload(file.mimeType) ? file.fileName : undefined,
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast({
        title: 'Não foi possível abrir o arquivo',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setOpeningId(null);
    }
  };

  const canDeleteFile = (file: ProjectFile) =>
    canManageFolders || (!!employee?.id && file.uploadedBy === employee.id);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Documentos
          </CardTitle>
          {!isReadOnly && (
            <div className="flex items-center gap-2">
              {canManageFolders && (
                <Button variant="outline" size="sm" onClick={() => setIsCreatingFolder(true)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Nova pasta
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={upload.isPending}
              >
                {upload.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Adicionar arquivo
              </Button>
            </div>
          )}
        </div>

        <nav aria-label="Caminho de pastas" className="flex flex-wrap items-center gap-1 pt-1 text-xs">
          <button
            type="button"
            onClick={() => setCurrentFolderId(null)}
            className={cn(
              'rounded px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              currentFolderId === null ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            Todos os arquivos
          </button>
          {breadcrumb.map((folder, index) => (
            <span key={folder.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden />
              <button
                type="button"
                onClick={() => setCurrentFolderId(folder.id)}
                className={cn(
                  'rounded px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  index === breadcrumb.length - 1
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {folder.name}
              </button>
            </span>
          ))}
        </nav>
      </CardHeader>

      <CardContent>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleSelectFile(file);
            event.target.value = '';
          }}
        />

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando arquivos...</p>
        ) : isEmpty ? (
          <div className="py-6 text-center text-muted-foreground">
            <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">
              {currentFolderId ? 'Esta pasta está vazia' : 'Nenhum documento anexado'}
            </p>
            {!isReadOnly && (
              <Button variant="link" size="sm" className="mt-1" onClick={() => inputRef.current?.click()}>
                Adicionar o primeiro
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {visibleFolders.map((folder) => (
              <li
                key={folder.id}
                className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
              >
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Folder className="h-5 w-5 shrink-0 text-primary-deep" />
                  <span className="truncate text-sm font-medium">{folder.name}</span>
                </button>
                {canManageFolders && !isReadOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setFolderToRemove(folder)}
                    aria-label={`Excluir pasta ${folder.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}

            {visibleFiles.map((file) => (
              <li
                key={file.id}
                className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center"
              >
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.fileSize)} ·{' '}
                    {format(parseISO(file.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleOpen(file)}
                    disabled={openingId === file.id}
                  >
                    {openingId === file.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Abrir
                  </Button>
                  {!isReadOnly && canDeleteFile(file) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => setFileToRemove(file)}
                      aria-label={`Excluir ${file.fileName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={isCreatingFolder} onOpenChange={(open) => !open && setIsCreatingFolder(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova pasta</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="project-folder-name">Nome da pasta</Label>
            <Input
              id="project-folder-name"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Ex: Atas de reunião"
              className="mt-1"
              autoFocus
            />
            {breadcrumb.length > 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Será criada dentro de <span className="font-medium">{breadcrumb[breadcrumb.length - 1].name}</span>.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingFolder(false)} disabled={createFolder.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolder.isPending}
              className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
            >
              {createFolder.isPending ? 'Criando...' : 'Criar pasta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingFile)} onOpenChange={(open) => !open && closeUploadDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar arquivo</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="project-file-name">Nome do arquivo</Label>
            <Input
              id="project-file-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ex: Ata de kickoff"
              className="mt-1"
              autoFocus
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              É o nome que aparece na lista. O arquivo original é{' '}
              <span className="font-medium">{pendingFile?.name}</span> ·{' '}
              {pendingFile ? formatFileSize(pendingFile.size) : ''}
              {breadcrumb.length > 0 && (
                <>
                  {' '}
                  · vai para <span className="font-medium">{breadcrumb[breadcrumb.length - 1].name}</span>
                </>
              )}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeUploadDialog} disabled={upload.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={!displayName.trim() || upload.isPending}
              className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
            >
              {upload.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(fileToRemove)} onOpenChange={(open) => !open && setFileToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{fileToRemove?.fileName}”?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo será removido definitivamente do projeto. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (fileToRemove) removeFile.mutate({ id: fileToRemove.id, storagePath: fileToRemove.storagePath });
                setFileToRemove(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(folderToRemove)} onOpenChange={(open) => !open && setFolderToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a pasta “{folderToRemove?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Só é possível excluir pastas vazias. Se ainda houver arquivos ou subpastas dentro, mova ou
              exclua o conteúdo antes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (folderToRemove) removeFolder.mutate(folderToRemove.id);
                setFolderToRemove(null);
              }}
            >
              Excluir pasta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
