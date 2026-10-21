import { useMemo, useState } from 'react';
import { Check, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory';
import { cn } from '@/lib/utils';

interface NoteSharePickerProps {
  value: string[];
  onChange: (employeeIds: string[]) => void;
}

/** Pessoas da empresa com quem a nota é compartilhada — elas leem, não editam. */
export function NoteSharePicker(props: NoteSharePickerProps) {
  const { value, onChange } = props;
  const { employee } = useAuth();
  const { data: directory = [] } = useEmployeeDirectory();
  const [open, setOpen] = useState(false);

  // Quem escreve já é dono da nota; compartilhar consigo o banco recusa.
  const people = useMemo(
    () => directory.filter((entry) => entry.id !== employee?.id),
    [directory, employee?.id],
  );
  const nameById = useMemo(() => new Map(directory.map((entry) => [entry.id, entry.nome])), [directory]);

  const toggle = (employeeId: string) =>
    onChange(value.includes(employeeId) ? value.filter((id) => id !== employeeId) : [...value, employeeId]);

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Compartilhada com">
          {value.map((employeeId) => (
            <li
              key={employeeId}
              className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-2.5 pr-1 text-xs text-foreground"
            >
              {nameById.get(employeeId) ?? 'Pessoa'}
              <button
                type="button"
                onClick={() => toggle(employeeId)}
                aria-label={`Parar de compartilhar com ${nameById.get(employeeId) ?? 'esta pessoa'}`}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Compartilhar com pessoas
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar pessoa" />
            <CommandList>
              <CommandEmpty>Ninguém com esse nome.</CommandEmpty>
              <CommandGroup>
                {people.map((entry) => (
                  <CommandItem key={entry.id} value={entry.nome} onSelect={() => toggle(entry.id)}>
                    <Check
                      className={cn('mr-2 h-4 w-4', value.includes(entry.id) ? 'opacity-100' : 'opacity-0')}
                      aria-hidden="true"
                    />
                    <span className="truncate">{entry.nome}</span>
                    {entry.cargo && <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">{entry.cargo}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
