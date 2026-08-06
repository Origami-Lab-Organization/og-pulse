import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  GRAPH_WEEKDAYS,
  RECURRENCE_END,
  RECURRENCE_FREQUENCY,
} from '@/types/microsoftGraph';
import type {
  GraphWeekday,
  RecurrenceEnd,
  RecurrenceFrequency,
  RecurrenceInput,
} from '@/types/microsoftGraph';

const FREQUENCY_LABEL: Record<RecurrenceFrequency, string> = {
  [RECURRENCE_FREQUENCY.DAILY]: 'dia',
  [RECURRENCE_FREQUENCY.WEEKLY]: 'semana',
  [RECURRENCE_FREQUENCY.MONTHLY]: 'mês',
  [RECURRENCE_FREQUENCY.YEARLY]: 'ano',
};

const END_LABEL: Record<RecurrenceEnd, string> = {
  [RECURRENCE_END.ON_DATE]: 'até a data',
  [RECURRENCE_END.NEVER]: 'sem data final',
};

/** Iniciais na ordem de `GRAPH_WEEKDAYS` (domingo primeiro). */
const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAY_NAMES = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

interface RecurrenceFieldsProps {
  value: RecurrenceInput;
  onChange: (recurrence: RecurrenceInput) => void;
  /** Mensagem de validação vinda do formulário. */
  error?: string;
}

export function RecurrenceFields({ value, onChange, error }: RecurrenceFieldsProps) {
  const patch = (changes: Partial<RecurrenceInput>) => onChange({ ...value, ...changes });

  const toggleWeekday = (weekday: GraphWeekday) => {
    patch({
      daysOfWeek: value.daysOfWeek.includes(weekday)
        ? value.daysOfWeek.filter((day) => day !== weekday)
        : [...value.daysOfWeek, weekday],
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="recurrence-interval">Repetir a cada</Label>
          <Input
            id="recurrence-interval"
            type="number"
            min={1}
            max={99}
            className="w-20"
            value={value.interval}
            onChange={(changed) =>
              patch({ interval: Math.max(1, Number(changed.target.value) || 1) })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="recurrence-frequency">Período</Label>
          <Select
            value={value.frequency}
            onValueChange={(frequency) =>
              patch({ frequency: frequency as RecurrenceFrequency })
            }
          >
            <SelectTrigger id="recurrence-frequency" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FREQUENCY_LABEL).map(([frequency, label]) => (
                <SelectItem key={frequency} value={frequency}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {value.frequency === RECURRENCE_FREQUENCY.WEEKLY && (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium text-foreground">Dias da semana</legend>
          <div className="flex gap-1.5">
            {GRAPH_WEEKDAYS.map((weekday, index) => {
              const selected = value.daysOfWeek.includes(weekday);
              return (
                <button
                  key={weekday}
                  type="button"
                  onClick={() => toggleWeekday(weekday)}
                  aria-pressed={selected}
                  aria-label={WEEKDAY_NAMES[index]}
                  className={cn(
                    'h-8 w-8 rounded-full border text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30',
                  )}
                >
                  {WEEKDAY_INITIALS[index]}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="recurrence-end">Termina</Label>
          <Select
            value={value.end}
            onValueChange={(end) => patch({ end: end as RecurrenceEnd })}
          >
            <SelectTrigger id="recurrence-end" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(END_LABEL).map(([end, label]) => (
                <SelectItem key={end} value={end}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {value.end === RECURRENCE_END.ON_DATE && (
          <div className="space-y-1.5">
            <Label htmlFor="recurrence-end-date">Até</Label>
            <Input
              id="recurrence-end-date"
              type="date"
              value={value.endDate}
              onChange={(changed) => patch({ endDate: changed.target.value })}
            />
          </div>
        )}
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
