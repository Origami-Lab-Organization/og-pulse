import { useEffect, useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const DATE_FORMAT = 'dd/MM/yyyy';

/** Aplica a máscara dd/MM/yyyy progressivamente, inserindo as barras sozinho. */
function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += '/' + digits.slice(2, 4);
  if (digits.length > 4) out += '/' + digits.slice(4, 8);
  return out;
}

/**
 * Converte o texto digitado em Date. Só aceita data completa e válida — o
 * round-trip pelo format rejeita absurdos como 31/02/2025 que o parse
 * normalizaria silenciosamente.
 */
function parseDate(text: string): Date | undefined {
  if (text.length !== DATE_FORMAT.length) return undefined;
  const parsed = parse(text, DATE_FORMAT, new Date());
  if (!isValid(parsed) || format(parsed, DATE_FORMAT) !== text) return undefined;
  return parsed;
}

interface DateInputProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  /** Acessibilidade — descreve o campo (ex.: "Data de início"). */
  ariaLabel?: string;
  className?: string;
}

/**
 * Campo de data digitável + calendário. O usuário pode escrever a data
 * (a máscara dd/MM/yyyy é aplicada automaticamente enquanto digita) ou
 * escolher pelo calendário no botão lateral. Marca erro visual quando o
 * texto está incompleto/ inválido.
 */
export function DateInput({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  ariaLabel,
  className,
}: DateInputProps) {
  const [text, setText] = useState(() => (value ? format(value, DATE_FORMAT) : ''));
  const [open, setOpen] = useState(false);

  // Sincroniza o texto quando o valor muda por fora (ex.: escolha no calendário
  // ou reset do filtro). Não sobrescreve enquanto o usuário digita a mesma data.
  useEffect(() => {
    const formatted = value ? format(value, DATE_FORMAT) : '';
    setText((prev) => (parseDate(prev)?.getTime() === value?.getTime() ? prev : formatted));
  }, [value]);

  const handleTextChange = (raw: string) => {
    const masked = maskDate(raw);
    setText(masked);
    const parsed = parseDate(masked);
    // Dispara ao completar uma data válida; limpa quando o campo fica vazio.
    if (parsed) onChange(parsed);
    else if (masked === '') onChange(undefined);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    setText(date ? format(date, DATE_FORMAT) : '');
    setOpen(false);
  };

  // Erro só quando há algo digitado mas ainda não forma uma data válida.
  const isInvalid = text.length > 0 && !parseDate(text);

  return (
    <div className={cn('relative w-[150px]', className)}>
      <Input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={isInvalid}
        className={cn('pr-9', isInvalid && 'border-destructive focus-visible:ring-destructive')}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-10 w-9 text-muted-foreground hover:text-foreground"
            aria-label={ariaLabel ? `Abrir calendário — ${ariaLabel}` : 'Abrir calendário'}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            defaultMonth={value}
            locale={ptBR}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
