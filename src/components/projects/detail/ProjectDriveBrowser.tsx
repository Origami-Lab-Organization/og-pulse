import { useState } from 'react';
import {
  ChevronRight,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import {
  useCreateDriveFolder,
  useDeleteDriveItem,
  useDriveChildren,
  useDriveItemActions,
  useDriveRootEntries,
  useMoveDriveItem,
  useRenameDriveItem,
  useSyncProjectDriveTree,
  useUploadDriveFile,
} from '@/hooks/useDriveBrowser';
import { DriveEntryRow } from '@/components/projects/detail/DriveEntryRow';
import { DriveMoveDialog } from '@/components/projects/detail/DriveMoveDialog';
import { DriveShareDialog } from '@/components/projects/detail/DriveShareDialog';
import { GraphError } from '@/services/microsoftGraphService';
import { GRAPH_ERROR_CODE } from '@/types/microsoftGraph';
import { cn } from '@/lib/utils';
import type { DriveEntry, ProjectDriveLink } from '@/types/microsoftGraph';

/** Browser não sustenta upload de arquivo gigante com confiabilidade. */
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function nameWithoutExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot) : '';
}

/**
 * Compartilhar uma subpasta no OneDrive NÃO dá acesso à pasta pai. Quem só tem
 * acesso a uma subpasta recebe 403 ao listar a raiz do projeto — e sem esta
 * distinção a tela diria "erro" para um caso que é permissão, não falha.
 */
function describeBrowseError(error: unknown, isAtRoot: boolean): string {
  const isDenied =
    error instanceof GraphError &&
    (error.code === GRAPH_ERROR_CODE.FORBIDDEN || error.code === GRAPH_ERROR_CODE.NOT_FOUND);

  if (isDenied && isAtRoot) {
    return 'Você não tem acesso à pasta raiz deste projeto no OneDrive. Se você só recebeu acesso a uma subpasta, peça ao gerente para compartilhar também a pasta do projeto — no OneDrive, acesso a uma subpasta não dá acesso à pasta acima dela.';
  }
  if (isDenied) {
    return 'Você não tem acesso a esta pasta no OneDrive.';
  }
  return 'Não foi possível ler esta pasta no OneDrive. Tente novamente em instantes.';
}

interface Crumb {
  id: string;
  name: string;
}

interface ProjectDriveBrowserProps {
  link: ProjectDriveLink;
  projectId: string;
  tenantId?: string;
  /** GP ou admin — só eles criam pastas. */
  canManageFolders?: boolean;
  isReadOnly?: boolean;
}

export function ProjectDriveBrowser({
  link,
  projectId,
  tenantId,
  canManageFolders = false,
  isReadOnly = false,
}: ProjectDriveBrowserProps) {
  const { toast } = useToast();
  const rootCrumb: Crumb = { id: link.rootItemId, name: 'Raiz do projeto' };

  const [trail, setTrail] = useState<Crumb[]>([rootCrumb]);
  const current = trail[trail.length - 1];

  const isAtRoot = trail.length === 1;

  const rootQuery = useDriveRootEntries({
    projectId,
    tenantId,
    driveId: link.driveId,
    rootItemId: link.rootItemId,
    canIndex: canManageFolders,
  });
  const childQuery = useDriveChildren(link.driveId, isAtRoot ? null : current.id);

  const entries = isAtRoot ? (rootQuery.data?.entries ?? []) : (childQuery.data ?? []);
  const isLoading = isAtRoot ? rootQuery.isLoading : childQuery.isLoading;
  const error = isAtRoot ? rootQuery.error : childQuery.error;
  /** Raiz montada pelo índice: a pessoa não alcança o pai, só as pastas dela. */
  const isPartialRoot = isAtRoot && rootQuery.data?.isPartial === true;
  const createFolder = useCreateDriveFolder({ driveId: link.driveId, itemId: current.id });
  const upload = useUploadDriveFile({ driveId: link.driveId, itemId: current.id });
  const deleteItem = useDeleteDriveItem({ driveId: link.driveId, itemId: current.id });
  const syncTree = useSyncProjectDriveTree(projectId, tenantId);
  const renameEntry = useRenameDriveItem({ driveId: link.driveId, itemId: current.id });
  const moveEntry = useMoveDriveItem({ driveId: link.driveId, itemId: current.id });
  const actions = useDriveItemActions(link.driveId);

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [entryToDelete, setEntryToDelete] = useState<DriveEntry | null>(null);
  const [entryToRename, setEntryToRename] = useState<DriveEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [entryToMove, setEntryToMove] = useState<DriveEntry | null>(null);
  const [entryToShare, setEntryToShare] = useState<DriveEntry | null>(null);

  const handleSelectFile = (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: 'Arquivo não enviado',
        description: 'O limite é 100MB por arquivo. Envie direto pelo OneDrive.',
        variant: 'destructive',
      });
      return;
    }
    setPendingFile(file);
    setDisplayName(nameWithoutExtension(file.name));
  };

  const closeUpload = () => {
    setPendingFile(null);
    setDisplayName('');
  };

  const confirmUpload = () => {
    if (!pendingFile || !displayName.trim()) return;
    // A extensão volta ao nome: no OneDrive é ela que decide com o que abre.
    const fileName = `${displayName.trim()}${extensionOf(pendingFile.name)}`;
    upload.mutate({ file: pendingFile, fileName }, { onSuccess: closeUpload });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Documentos
          </CardTitle>
          {!isReadOnly && !isPartialRoot && (
            <div className="flex items-center gap-2">
              {canManageFolders && isAtRoot && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => syncTree.mutate({ driveId: link.driveId, rootItemId: link.rootItemId })}
                  disabled={syncTree.isPending}
                >
                  {syncTree.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Sincronizar
                </Button>
              )}
              {canManageFolders && (
                <Button variant="outline" size="sm" onClick={() => setIsCreatingFolder(true)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Nova pasta
                </Button>
              )}
              <Button variant="outline" size="sm" asChild disabled={upload.isPending}>
                <label className="cursor-pointer">
                  {upload.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Adicionar arquivo
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleSelectFile(file);
                      event.target.value = '';
                    }}
                  />
                </label>
              </Button>
            </div>
          )}
        </div>

        <nav aria-label="Caminho de pastas" className="flex flex-wrap items-center gap-1 pt-1 text-xs">
          {trail.map((crumb, index) => (
            <span key={crumb.id} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
              <button
                type="button"
                onClick={() => setTrail(trail.slice(0, index + 1))}
                className={cn(
                  'max-w-[16rem] truncate rounded px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  index === trail.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>
      </CardHeader>

      <CardContent>
        {isPartialRoot && (
          <p className="mb-3 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Mostrando apenas as pastas deste projeto às quais você tem acesso no OneDrive.
          </p>
        )}

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando do OneDrive...</p>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">{describeBrowseError(error, trail.length === 1)}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <Folder className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">
              {isPartialRoot
                ? 'Você ainda não tem acesso a nenhuma pasta deste projeto no OneDrive.'
                : 'Esta pasta está vazia'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[420px] border-collapse">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="p-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome
                  </th>
                  <th className="hidden p-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                    Modificado
                  </th>
                  <th className="hidden p-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Modificado por
                  </th>
                  <th className="hidden p-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                    Tamanho
                  </th>
                  <th className="w-10 p-2">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry: DriveEntry) => (
                  <DriveEntryRow
                    key={entry.id}
                    entry={entry}
                    canWrite={!isReadOnly}
                    canDelete={!isReadOnly && (!entry.isFolder || canManageFolders)}
                    onOpenFolder={(target) => setTrail((prev) => [...prev, { id: target.id, name: target.name }])}
                    onDownload={(target) => void actions.download(target.id)}
                    onCopyLink={(target) => void actions.copyLink(target.id)}
                    onShare={setEntryToShare}
                    onRename={(target) => {
                      setEntryToRename(target);
                      setRenameValue(target.name);
                    }}
                    onMove={setEntryToMove}
                    onDelete={setEntryToDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={isCreatingFolder} onOpenChange={(open) => !open && setIsCreatingFolder(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova pasta no OneDrive</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="drive-folder-name">Nome da pasta</Label>
            <Input
              id="drive-folder-name"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Ex: 4.Entregas"
              className="mt-1"
              autoFocus
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Será criada dentro de <span className="font-medium">{current.name}</span>, no OneDrive — quem
              abrir a pasta por lá também vai vê-la.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingFolder(false)} disabled={createFolder.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                createFolder.mutate(newFolderName, {
                  onSuccess: () => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  },
                })
              }
              disabled={!newFolderName.trim() || createFolder.isPending}
              className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
            >
              {createFolder.isPending ? 'Criando...' : 'Criar pasta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(entryToRename)} onOpenChange={(open) => !open && setEntryToRename(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="drive-rename">Novo nome</Label>
            <Input
              id="drive-rename"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              className="mt-1"
              autoFocus
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              O nome muda no OneDrive — quem abrir por lá vê o nome novo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryToRename(null)} disabled={renameEntry.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                entryToRename &&
                renameEntry.mutate(
                  { targetId: entryToRename.id, name: renameValue },
                  { onSuccess: () => setEntryToRename(null) },
                )
              }
              disabled={!renameValue.trim() || renameEntry.isPending}
              className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
            >
              {renameEntry.isPending ? 'Renomeando...' : 'Renomear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DriveShareDialog
        open={Boolean(entryToShare)}
        onOpenChange={(open) => !open && setEntryToShare(null)}
        driveId={link.driveId}
        entry={entryToShare}
        projectId={projectId}
      />

      <DriveMoveDialog
        open={Boolean(entryToMove)}
        onOpenChange={(open) => !open && setEntryToMove(null)}
        driveId={link.driveId}
        rootItemId={link.rootItemId}
        entry={entryToMove}
        isMoving={moveEntry.isPending}
        onConfirm={(folderId) =>
          entryToMove &&
          moveEntry.mutate(
            { targetId: entryToMove.id, folderId },
            { onSuccess: () => setEntryToMove(null) },
          )
        }
      />

      <AlertDialog open={Boolean(entryToDelete)} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {entryToDelete?.isFolder ? 'a pasta' : ''} “{entryToDelete?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O item será excluído <b>no OneDrive</b>, não apenas no Pulse — quem abrir a pasta por lá
              também deixa de vê-lo.
              {entryToDelete?.isFolder && ' Tudo o que estiver dentro da pasta vai junto.'} Ele vai para a
              lixeira da conta dona do arquivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (entryToDelete) deleteItem.mutate(entryToDelete.id);
                setEntryToDelete(null);
              }}
            >
              Excluir no OneDrive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(pendingFile)} onOpenChange={(open) => !open && closeUpload()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar arquivo</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="drive-file-name">Nome do arquivo</Label>
            <Input
              id="drive-file-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1"
              autoFocus
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Vai para <span className="font-medium">{current.name}</span> no OneDrive como{' '}
              <span className="font-medium">
                {displayName.trim()}
                {pendingFile ? extensionOf(pendingFile.name) : ''}
              </span>{' '}
              · {pendingFile ? formatSize(pendingFile.size) : ''}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeUpload} disabled={upload.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={confirmUpload}
              disabled={!displayName.trim() || upload.isPending}
              className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
            >
              {upload.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
