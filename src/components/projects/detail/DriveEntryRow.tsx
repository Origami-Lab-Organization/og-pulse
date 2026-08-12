import {
  Copy,
  Download,
  FileText,
  Folder,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DriveEntry } from '@/types/microsoftGraph';

function formatSize(entry: DriveEntry): string {
  if (entry.isFolder) {
    return entry.childCount === 1 ? '1 item' : `${entry.childCount} itens`;
  }
  if (entry.size < 1024) return `${entry.size} B`;
  if (entry.size < 1024 * 1024) return `${Math.round(entry.size / 1024)} KB`;
  return `${(entry.size / (1024 * 1024)).toFixed(1)} MB`;
}

interface DriveEntryRowProps {
  entry: DriveEntry;
  canDelete: boolean;
  canWrite: boolean;
  onOpenFolder: (entry: DriveEntry) => void;
  onDownload: (entry: DriveEntry) => void;
  onCopyLink: (entry: DriveEntry) => void;
  onShare: (entry: DriveEntry) => void;
  onRename: (entry: DriveEntry) => void;
  onMove: (entry: DriveEntry) => void;
  onDelete: (entry: DriveEntry) => void;
}

export function DriveEntryRow({
  entry,
  canDelete,
  canWrite,
  onOpenFolder,
  onDownload,
  onCopyLink,
  onShare,
  onRename,
  onMove,
  onDelete,
}: DriveEntryRowProps) {
  return (
    <tr className="group border-t transition-colors hover:bg-muted/40">
      <td className="p-2">
        {entry.isFolder ? (
          <button
            type="button"
            onClick={() => onOpenFolder(entry)}
            className="flex w-full min-w-0 items-center gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Folder className="h-4 w-4 shrink-0 text-primary-deep" />
            <span className="truncate text-sm font-medium">{entry.name}</span>
          </button>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm">{entry.name}</span>
          </div>
        )}
      </td>
      <td className="hidden p-2 text-xs text-muted-foreground sm:table-cell">
        {entry.lastModifiedAt
          ? format(parseISO(entry.lastModifiedAt), "d 'de' MMM", { locale: ptBR })
          : '—'}
      </td>
      <td className="hidden p-2 text-xs text-muted-foreground md:table-cell">
        <span className="block truncate">{entry.lastModifiedBy ?? '—'}</span>
      </td>
      <td className="hidden p-2 text-right font-mono text-xs tabular-nums text-muted-foreground lg:table-cell">
        {formatSize(entry)}
      </td>
      <td className="w-10 p-2 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              aria-label={`Ações de ${entry.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onShare(entry)}>
              <Users className="mr-2 h-4 w-4" />
              Gerenciar acesso
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopyLink(entry)}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar link
            </DropdownMenuItem>
            {!entry.isFolder && (
              <DropdownMenuItem onClick={() => onDownload(entry)}>
                <Download className="mr-2 h-4 w-4" />
                Baixar
              </DropdownMenuItem>
            )}
            {canWrite && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onRename(entry)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Renomear
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMove(entry)}>
                  <MoveRight className="mr-2 h-4 w-4" />
                  Mover para
                </DropdownMenuItem>
              </>
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(entry)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
