import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { banksMock } from '@/assets/bank';
import { cn } from '@/lib/utils';

interface BankSelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function BankSelect({ value, onChange, disabled }: BankSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9 px-3"
          disabled={disabled}
        >
          <span className={cn('truncate text-sm', !value && 'text-muted-foreground')}>
            {value ?? 'Selecione o banco'}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
        collisionPadding={8}
      >
        <Command>
          <CommandInput placeholder="Buscar banco..." />
          <CommandList className="max-h-48 overflow-y-auto">
            <CommandEmpty>Banco não encontrado.</CommandEmpty>
            <CommandGroup>
              {banksMock.map((bank, i) => (
                <CommandItem
                  key={`${bank.value}-${i}`}
                  value={bank.label}
                  onSelect={() => {
                    onChange(bank.label);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === bank.label ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {bank.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
