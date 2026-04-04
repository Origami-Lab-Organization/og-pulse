import { CalendarRange } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StrategyCycle } from '@/types/strategy';

interface CycleSelectorHeaderProps {
  cycles: StrategyCycle[];
  activeCycleId: string;
  onCycleChange: (id: string) => void;
}

export function CycleSelectorHeader({ cycles, activeCycleId, onCycleChange }: CycleSelectorHeaderProps) {
  const selectedCycle = cycles.find((c) => c.id === activeCycleId);

  const formatDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={activeCycleId} onValueChange={onCycleChange}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Selecione um ciclo" />
        </SelectTrigger>
        <SelectContent>
          {cycles.map((cycle) => (
            <SelectItem key={cycle.id} value={cycle.id}>
              <span className="flex items-center gap-2">
                {cycle.title}
                {cycle.isActive && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedCycle && (
        <>
          <Badge
            variant="outline"
            className={cn(
              'text-[11px] font-semibold',
              selectedCycle.isActive
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-muted-foreground/40 text-muted-foreground',
            )}
          >
            {selectedCycle.isActive ? 'Ativo' : 'Encerrado'}
          </Badge>

          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" />
            {formatDate(selectedCycle.startDate)} — {formatDate(selectedCycle.endDate)}
          </span>
        </>
      )}
    </div>
  );
}
