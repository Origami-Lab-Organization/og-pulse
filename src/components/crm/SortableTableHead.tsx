import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc';

interface SortableTableHeadProps<K extends string> {
  label: string;
  sortKey: K;
  currentKey: K;
  currentDir: SortDirection;
  onSort: (key: K) => void;
  className?: string;
}

/**
 * Cabeçalho clicável de ordenação. Genérico na chave para servir às três tabelas
 * do Pipeline (Ativos, Stand By e Perdas), que ordenam por campos diferentes.
 */
export function SortableTableHead<K extends string>({
  label, sortKey, currentKey, currentDir, onSort, className,
}: SortableTableHeadProps<K>) {
  const active = currentKey === sortKey;
  return (
    <TableHead
      className={cn('cursor-pointer select-none hover:bg-muted/50 transition-colors', className)}
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (currentDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          currentDir === 'asc'
            ? <ArrowUp className="h-3.5 w-3.5 text-foreground" />
            : <ArrowDown className="h-3.5 w-3.5 text-foreground" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );
}
