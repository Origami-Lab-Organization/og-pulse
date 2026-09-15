import { useState } from 'react';
import { Building2, Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useSearchProspectCompanies } from '@/hooks/useProspectCompanies';
import { formatCNPJ } from '@/lib/masks';
import { cn } from '@/lib/utils';
import type { ProspectCompanyDB } from '@/types/prospect';

interface ProspectCompanySelectProps {
  value: ProspectCompanyDB | null;
  onChange: (company: ProspectCompanyDB | null) => void;
  /** Chamado com o termo digitado quando a empresa ainda não existe. */
  onCreateNew: (name: string) => void;
  disabled?: boolean;
}

/**
 * Escolhe uma empresa já cadastrada ou abre o cadastro de uma nova.
 *
 * É o que torna a empresa reutilizável: a partir do segundo contato da mesma empresa,
 * ninguém redigita CNPJ, LinkedIn, anel ou tier — os dados vêm do cadastro.
 */
export function ProspectCompanySelect({
  value,
  onChange,
  onCreateNew,
  disabled,
}: ProspectCompanySelectProps) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const { data: empresas = [], isLoading } = useSearchProspectCompanies(busca);

  const termo = busca.trim();
  const jaExisteComEsseNome = empresas.some(
    (e) => e.name.trim().toLowerCase() === termo.toLowerCase(),
  );

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
          <span className={cn('truncate text-sm flex items-center gap-2', !value && 'text-muted-foreground')}>
            <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {value?.name ?? 'Buscar ou cadastrar empresa'}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                aria-label="Limpar empresa"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        sideOffset={4}
        collisionPadding={8}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nome ou CNPJ..."
            value={busca}
            onValueChange={setBusca}
          />
          <CommandList className="max-h-60 overflow-y-auto">
            {termo.length < 2 && (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                Digite ao menos 2 letras para buscar.
              </div>
            )}
            {termo.length >= 2 && isLoading && (
              <div className="px-3 py-4 text-sm text-muted-foreground">Buscando...</div>
            )}
            {termo.length >= 2 && !isLoading && empresas.length === 0 && (
              <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
            )}

            {empresas.length > 0 && (
              <CommandGroup heading="Empresas cadastradas">
                {empresas.map((empresa) => (
                  <CommandItem
                    key={empresa.id}
                    value={empresa.id}
                    onSelect={() => {
                      onChange(empresa);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value?.id === empresa.id ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex flex-col min-w-0">
                      <span className="truncate">{empresa.name}</span>
                      {empresa.cnpj && (
                        <span className="text-xs text-muted-foreground">{formatCNPJ(empresa.cnpj)}</span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {termo.length >= 2 && !jaExisteComEsseNome && (
              <CommandGroup>
                <CommandItem
                  value={`__nova__${termo}`}
                  onSelect={() => {
                    onCreateNew(termo);
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                  Cadastrar &ldquo;{termo}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
