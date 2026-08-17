import { useMemo, useState } from 'react';
import { Check, Plus, UserPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AttendeePickerProps {
  /** E-mails já escolhidos. */
  value: string[];
  onChange: (emails: string[]) => void;
}

/**
 * Convidados a partir do cadastro de funcionários, com espaço para e-mail
 * externo (cliente, fornecedor). A lista vem do diretório do Pulse (identidade
 * apenas — sem remuneração ou dado pessoal, PUL-162), não do diretório da
 * Microsoft, que exigiria permissão de leitura de todo o tenant.
 */
export function AttendeePicker({ value, onChange }: AttendeePickerProps) {
  const { data: employees = [] } = useEmployeeDirectory();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectable = useMemo(
    () => employees.filter((employee): employee is typeof employee & { email: string } => !!employee.email),
    [employees],
  );

  const nameByEmail = useMemo(() => {
    const map = new Map<string, string>();
    selectable.forEach((employee) => map.set(employee.email.toLowerCase(), employee.nome));
    return map;
  }, [selectable]);

  const toggle = (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    onChange(
      value.includes(normalized)
        ? value.filter((item) => item !== normalized)
        : [...value, normalized],
    );
  };

  const typedEmail = search.trim().toLowerCase();
  const canAddTyped =
    EMAIL_PATTERN.test(typedEmail) && !nameByEmail.has(typedEmail) && !value.includes(typedEmail);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-start font-normal">
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            {value.length ? `${value.length} convidado(s)` : 'Adicionar convidados'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter>
            <CommandInput
              placeholder="Buscar pessoa ou digitar e-mail..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-64">
              <CommandEmpty>
                {canAddTyped ? 'Pressione para convidar este e-mail.' : 'Ninguém encontrado.'}
              </CommandEmpty>

              {canAddTyped && (
                <CommandGroup heading="Convidado externo">
                  <CommandItem
                    value={typedEmail}
                    onSelect={() => {
                      toggle(typedEmail);
                      setSearch('');
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    {typedEmail}
                  </CommandItem>
                </CommandGroup>
              )}

              <CommandGroup heading="Equipe">
                {selectable.map((employee) => {
                  const email = employee.email.toLowerCase();
                  const selected = value.includes(email);
                  return (
                    <CommandItem
                      key={employee.id}
                      value={`${employee.nome} ${employee.email}`}
                      onSelect={() => toggle(email)}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${selected ? 'opacity-100' : 'opacity-0'}`}
                        aria-hidden="true"
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{employee.nome}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {employee.email}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((email) => (
            <li key={email}>
              <Badge variant="secondary" className="gap-1 pr-1">
                <span className="truncate max-w-48">{nameByEmail.get(email) ?? email}</span>
                <button
                  type="button"
                  onClick={() => toggle(email)}
                  aria-label={`Remover ${email}`}
                  className="rounded-sm hover:bg-background/60 focus-visible:outline-none
                             focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
