import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Padrão do Outlook para compromisso novo. */
export const DEFAULT_REMINDER_MINUTES = 15;

/** Radix não aceita item vazio: "sem lembrete" usa este sentinela. */
const NO_REMINDER = 'none';

/** As mesmas opções do Outlook. */
const REMINDER_OPTIONS: ReadonlyArray<{ minutes: number; label: string }> = [
  { minutes: 0, label: 'Na hora do início' },
  { minutes: 5, label: '5 minutos antes' },
  { minutes: 15, label: '15 minutos antes' },
  { minutes: 30, label: '30 minutos antes' },
  { minutes: 60, label: '1 hora antes' },
  { minutes: 120, label: '2 horas antes' },
  { minutes: 12 * 60, label: '12 horas antes' },
  { minutes: 24 * 60, label: '1 dia antes' },
  { minutes: 7 * 24 * 60, label: '1 semana antes' },
];

interface ReminderSelectProps {
  /** Minutos antes do início; `null` = sem lembrete. */
  value: number | null;
  onChange: (minutes: number | null) => void;
}

/** Valor vindo do Outlook fora da lista (ex.: 10 min) continua aparecendo como opção. */
function optionsWith(value: number | null) {
  if (value === null || REMINDER_OPTIONS.some((option) => option.minutes === value)) {
    return REMINDER_OPTIONS;
  }
  return [...REMINDER_OPTIONS, { minutes: value, label: `${value} minutos antes` }].sort(
    (a, b) => a.minutes - b.minutes,
  );
}

export function ReminderSelect(props: ReminderSelectProps) {
  const { value, onChange } = props;

  return (
    <Select
      value={value === null ? NO_REMINDER : String(value)}
      onValueChange={(next) => onChange(next === NO_REMINDER ? null : Number(next))}
    >
      <SelectTrigger aria-label="Lembrete">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_REMINDER}>Sem lembrete</SelectItem>
        {optionsWith(value).map((option) => (
          <SelectItem key={option.minutes} value={String(option.minutes)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
