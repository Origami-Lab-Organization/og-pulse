import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Cloud, Folder, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { acquireGraphTokenForScopes } from '@/integrations/microsoft/msalClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FILES_SCOPES,
  getMyDriveRoot,
  listChildFolders,
  listSharedWithMe,
  resolveSharedUrl,
} from '@/services/microsoftGraphService';
import type { DriveFolder } from '@/types/microsoftGraph';

type DriveSource = 'mine' | 'shared' | 'link';

const SOURCE_LABEL: Record<DriveSource, string> = {
  mine: 'Meu OneDrive',
  shared: 'Compartilhados',
  link: 'Colar link',
};

/**
 * Consentimento de arquivos costuma exigir aprovação de admin do tenant. Sem
 * essa tradução a pessoa vê um código AADSTS e abre chamado.
 */
function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('AADSTS65001') || message.toLowerCase().includes('consent')) {
    return 'O acesso aos arquivos ainda não foi autorizado pelo administrador do Microsoft 365. Peça o consentimento do escopo Files.ReadWrite.All e tente de novo.';
  }
  if (message.includes('not_connected') || message.includes('NotConnected')) {
    return 'Conecte sua conta Microsoft no Pulse antes de escolher a pasta.';
  }
  return 'Não foi possível falar com o OneDrive. Tente novamente em instantes.';
}

interface OneDriveRootPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (folder: DriveFolder) => void;
  isSaving?: boolean;
}

export function OneDriveRootPicker({ open, onOpenChange, onConfirm, isSaving = false }: OneDriveRootPickerProps) {
  /** Ref, não state: como state mudaria a identidade de `start` e recarregaria. */
  const tokenRef = useRef<string | null>(null);
  const [source, setSource] = useState<DriveSource>('mine');
  const [trail, setTrail] = useState<DriveFolder[]>([]);
  const [children, setChildren] = useState<DriveFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');

  // Em "compartilhados comigo" a lista inicial é virtual — não existe pasta
  // selecionável antes de entrar em uma delas.
  const current = trail[trail.length - 1] ?? null;

  const loadChildren = useCallback(async (accessToken: string, folder: DriveFolder) => {
    setIsLoading(true);
    setError(null);
    try {
      setChildren(await listChildFolders(accessToken, folder.driveId, folder.id));
    } catch (err) {
      setError(describeError(err));
      setChildren([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const start = useCallback(
    async (nextSource: DriveSource) => {
      setIsLoading(true);
      setError(null);
      setTrail([]);
      setChildren([]);
      try {
        // Consentimento incremental: só aqui, nunca junto de agenda/e-mail.
        const accessToken = tokenRef.current ?? (await acquireGraphTokenForScopes(FILES_SCOPES));
        tokenRef.current = accessToken;

        if (nextSource === 'link') {
          setIsLoading(false);
          return;
        }

        if (nextSource === 'shared') {
          setChildren(await listSharedWithMe(accessToken));
          setIsLoading(false);
          return;
        }

        const root = await getMyDriveRoot(accessToken);
        setTrail([root]);
        await loadChildren(accessToken, root);
      } catch (err) {
        setError(describeError(err));
        setIsLoading(false);
      }
    },
    [loadChildren],
  );

  useEffect(() => {
    if (!open) {
      tokenRef.current = null;
      setSource('mine');
      setTrail([]);
      setChildren([]);
      setError(null);
      return;
    }
    void start('mine');
  }, [open, start]);

  const switchSource = (next: DriveSource) => {
    setSource(next);
    setLinkUrl('');
    void start(next);
  };

  const resolveLink = async () => {
    const accessToken = tokenRef.current;
    if (!accessToken || !linkUrl.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const folder = await resolveSharedUrl(accessToken, linkUrl);
      setTrail([folder]);
      await loadChildren(accessToken, folder);
    } catch (err) {
      setError(describeError(err));
      setIsLoading(false);
    }
  };

  const openFolder = (folder: DriveFolder) => {
    const accessToken = tokenRef.current;
    if (!accessToken) return;
    setTrail((prev) => [...prev, folder]);
    void loadChildren(accessToken, folder);
  };

  const goTo = (index: number) => {
    const accessToken = tokenRef.current;
    if (!accessToken) return;
    const target = trail[index];
    setTrail(trail.slice(0, index + 1));
    void loadChildren(accessToken, target);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Escolher pasta no OneDrive
          </DialogTitle>
          <DialogDescription>
            Navegue até a pasta que será a raiz deste projeto. Nada é movido agora — o Pulse apenas guarda
            para onde apontar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Origem das pastas">
          {(Object.keys(SOURCE_LABEL) as DriveSource[]).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={source === option}
              onClick={() => switchSource(option)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                source === option
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {SOURCE_LABEL[option]}
            </button>
          ))}
        </div>

        <nav aria-label="Caminho no OneDrive" className="flex flex-wrap items-center gap-1 text-xs">
          <span
            className={cn(
              'px-1 py-0.5',
              trail.length === 0 ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {SOURCE_LABEL[source]}
          </span>
          {trail.map((folder, index) => (
            <span key={folder.id} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              <button
                type="button"
                onClick={() => goTo(index)}
                className={cn(
                  'max-w-[16rem] truncate rounded px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  index === trail.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {index === 0 && source === 'mine' ? 'Raiz' : folder.name}
              </button>
            </span>
          ))}
        </nav>

        {source === 'link' && trail.length === 0 && (
          <div className="space-y-2">
            <Label htmlFor="onedrive-link">Link da pasta</Label>
            <div className="flex gap-2">
              <Input
                id="onedrive-link"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void resolveLink()}
                placeholder="https://origamilab-my.sharepoint.com/..."
                className="flex-1"
              />
              <Button variant="outline" onClick={() => void resolveLink()} disabled={!linkUrl.trim() || isLoading}>
                Abrir
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cole o link que você recebeu. Serve para pasta compartilhada por link, que não aparece em
              “Compartilhados”.
            </p>
          </div>
        )}

        <div className="max-h-72 min-h-[10rem] overflow-y-auto rounded-lg border">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="space-y-3 p-4 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void start(source)}>
                Tentar de novo
              </Button>
            </div>
          ) : children.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {trail.length > 0
                ? 'Nenhuma subpasta aqui. Você pode escolher esta mesma pasta como raiz.'
                : source === 'link'
                  ? 'Cole o link acima para abrir a pasta.'
                  : 'Nada compartilhado diretamente com você. Se a pasta chegou por link, use “Colar link”.'}
            </p>
          ) : (
            <ul className="divide-y">
              {children.map((folder) => (
                <li key={folder.id}>
                  <button
                    type="button"
                    onClick={() => openFolder(folder)}
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <Folder className="h-4 w-4 shrink-0 text-primary-deep" />
                    <span className="min-w-0 flex-1 truncate text-sm">{folder.name}</span>
                    {folder.childFolderCount > 0 && (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0 rounded-md bg-muted/50 px-3 py-2">
          {current ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Raiz do projeto
              </p>
              <p className="truncate text-sm font-medium" title={current.path}>
                {current.name}
              </p>
              <p className="truncate text-xs text-muted-foreground" title={current.path}>
                {current.path}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Entre em uma pasta para escolhê-la.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={() => current && onConfirm(current)}
            disabled={!current || Boolean(error) || isSaving}
            className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
          >
            {isSaving ? 'Salvando...' : 'Usar esta pasta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
