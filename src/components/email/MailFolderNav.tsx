import {
  Archive,
  Ban,
  Folder,
  Inbox,
  PencilLine,
  Send,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { WELL_KNOWN_FOLDER } from '@/types/microsoftGraph';
import type { MailFolder, WellKnownFolder } from '@/types/microsoftGraph';
import { folderKey } from './mailFolders';

const FOLDER_ICON: Record<WellKnownFolder, LucideIcon> = {
  [WELL_KNOWN_FOLDER.INBOX]: Inbox,
  [WELL_KNOWN_FOLDER.DRAFTS]: PencilLine,
  [WELL_KNOWN_FOLDER.SENT]: Send,
  [WELL_KNOWN_FOLDER.DELETED]: Trash2,
  [WELL_KNOWN_FOLDER.JUNK]: Ban,
  [WELL_KNOWN_FOLDER.ARCHIVE]: Archive,
};

function FolderIcon({ folder }: { folder: MailFolder }) {
  const Icon = folder.wellKnown ? FOLDER_ICON[folder.wellKnown] : Folder;
  return <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />;
}

interface MailFolderNavProps {
  folders: MailFolder[] | undefined;
  isLoading: boolean;
  selectedKey: string;
  onSelect: (key: string) => void;
}

function UnreadCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums text-primary">
      {count}
      <span className="sr-only"> não lidos</span>
    </span>
  );
}

/** Pastas da caixa, como a coluna da esquerda do Outlook; no celular vira um seletor. */
export function MailFolderNav(props: MailFolderNavProps) {
  const { folders, isLoading, selectedKey, onSelect } = props;

  if (isLoading) {
    return (
      <div className="space-y-2 md:w-56 md:shrink-0">
        {[0, 1, 2, 3, 4].map((row) => (
          <Skeleton key={row} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  const list = folders ?? [];

  return (
    <>
      <div className="md:hidden">
        <Select value={selectedKey} onValueChange={onSelect}>
          <SelectTrigger aria-label="Pasta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {list.map((folder) => (
              <SelectItem key={folder.id} value={folderKey(folder)}>
                {folder.name}
                {folder.unreadCount > 0 ? ` (${folder.unreadCount})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav aria-label="Pastas de e-mail" className="hidden md:block md:w-56 md:shrink-0">
        <ul className="space-y-0.5">
          {list.map((folder) => {
            const selected = folderKey(folder) === selectedKey;
            return (
              <li key={folder.id}>
                <button
                  type="button"
                  onClick={() => onSelect(folderKey(folder))}
                  aria-current={selected ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <FolderIcon folder={folder} />
                  <span className="min-w-0 truncate">{folder.name}</span>
                  <UnreadCount count={folder.unreadCount} />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
