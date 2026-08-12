import { useEffect, useState } from 'react';
import { ChevronRight, Folder, Loader2 } from 'lucide-react';
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
import { useDriveChildren } from '@/hooks/useDriveBrowser';
import type { DriveEntry } from '@/types/microsoftGraph';

interface Crumb {
  id: string;
  name: string;
}

interface DriveMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driveId: string;
  rootItemId: string;
  entry: DriveEntry | null;
  isMoving?: boolean;
  onConfirm: (targetFolderId: string) => void;
}

export function DriveMoveDialog({
  open,
  onOpenChange,
  driveId,
  rootItemId,
  entry,
  isMoving = false,
  onConfirm,
}: DriveMoveDialogProps) {
  const [trail, setTrail] = useState<Crumb[]>([{ id: rootItemId, name: 'Raiz do projeto' }]);
  const current = trail[trail.length - 1];
  const { data: children = [], isLoading } = useDriveChildren(driveId, open ? current.id : null);

  useEffect(() => {
    if (open) setTrail([{ id: rootItemId, name: 'Raiz do projeto' }]);
  }, [open, rootItemId]);

  // Uma pasta não pode ser movida para dentro dela mesma.
  const options = children.filter((child) => child.isFolder && child.id !== entry?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>Mover “{entry?.name}”</DialogTitle>
          <DialogDescription>
            Escolha a pasta de destino. A movimentação acontece no OneDrive.
          </DialogDescription>
        </DialogHeader>

        <nav aria-label="Destino" className="flex flex-wrap items-center gap-1 text-xs">
          {trail.map((crumb, index) => (
            <span key={crumb.id} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
              <button
                type="button"
                onClick={() => setTrail(trail.slice(0, index + 1))}
                className={cn(
                  'max-w-[14rem] truncate rounded px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  index === trail.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="max-h-64 min-h-[8rem] overflow-y-auto rounded-lg border">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : options.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Sem subpastas aqui. Você pode mover para esta pasta mesmo.
            </p>
          ) : (
            <ul className="divide-y">
              {options.map((folder) => (
                <li key={folder.id}>
                  <button
                    type="button"
                    onClick={() => setTrail((prev) => [...prev, { id: folder.id, name: folder.name }])}
                    className="flex w-full items-center gap-2 p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <Folder className="h-4 w-4 shrink-0 text-primary-deep" />
                    <span className="min-w-0 flex-1 truncate text-sm">{folder.name}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="self-center truncate text-xs text-muted-foreground">
            Destino: <span className="font-medium text-foreground">{current.name}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMoving}>
              Cancelar
            </Button>
            <Button
              onClick={() => onConfirm(current.id)}
              disabled={isMoving}
              className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
            >
              {isMoving ? 'Movendo...' : 'Mover para cá'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
