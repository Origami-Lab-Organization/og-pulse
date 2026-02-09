import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FilterOption {
  id: string;
  label: string;
}

interface AnalyticsFiltersProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  clients: FilterOption[];
  managers: FilterOption[];
  selectedClientId?: string;
  onClientChange: (id: string | undefined) => void;
  selectedManagerId?: string;
  onManagerChange: (id: string | undefined) => void;
  showManagerFilter?: boolean;
}

export function AnalyticsFilters({
  currentMonth,
  onMonthChange,
  clients,
  managers,
  selectedClientId,
  onClientChange,
  selectedManagerId,
  onManagerChange,
  showManagerFilter = true,
}: AnalyticsFiltersProps) {
  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Month Picker */}
      <div className="flex items-center gap-1 rounded-lg border bg-card px-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[160px] text-center text-sm font-medium capitalize">
          {monthLabel}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Client Filter */}
      <Select
        value={selectedClientId || 'all'}
        onValueChange={(v) => onClientChange(v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Todos os Clientes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Clientes</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Manager Filter */}
      {showManagerFilter && (
        <Select
          value={selectedManagerId || 'all'}
          onValueChange={(v) => onManagerChange(v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os Gerentes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Gerentes</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
