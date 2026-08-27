import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export const LEAD_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

interface LeadTablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/**
 * Paginação das tabelas do Pipeline. Compartilhada por Stand By e Perdas para
 * que as duas visões da mesma tela pagine do mesmo jeito.
 */
export function LeadTablePagination({
  currentPage, pageSize, totalItems, onPageChange, onPageSizeChange,
}: LeadTablePaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const firstItem = currentPage * pageSize + 1;
  const lastItem = Math.min((currentPage + 1) * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
      <p className="text-sm text-muted-foreground">
        Mostrando {firstItem}–{lastItem} de {totalItems} oportunidade{totalItems !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Por página:</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            disabled={currentPage === 0}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">{currentPage + 1} / {totalPages || 1}</span>
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            disabled={currentPage >= totalPages - 1}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
