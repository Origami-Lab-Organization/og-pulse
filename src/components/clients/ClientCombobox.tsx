import { forwardRef, useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
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
import { formatCNPJ } from '@/lib/masks';
import { cn } from '@/lib/utils';
import type { Client } from '@/types/client';

interface ClientComboboxProps {
  clients: Client[];
  value: string;
  onChange: (clientId: string) => void;
  /** Presente, a busca sem resultado oferece cadastrar o cliente. */
  onCriar?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Cliente com busca (27/10/2026): a lista passou de dezenas, e no Select era preciso rolar até
 * achar. Busca pela razão social, pelo nome fantasia e pelo CNPJ (com ou sem pontuação).
 *
 * `forwardRef` para servir de `FormControl`: o rótulo e a mensagem de erro do formulário
 * apontam para o botão.
 */
export const ClientCombobox = forwardRef<HTMLButtonElement, ClientComboboxProps>(function ClientCombobox(props, ref) {
  const { clients, value, onChange, onCriar, disabled, placeholder = 'Selecione o cliente' } = props;
  const [aberto, setAberto] = useState(false);
  const escolhido = clients.find((c) => c.id === value);

  return (
    // `modal`: dentro de um Dialog, a lista só rola com a roda do mouse se o popover for modal.
    <Popover open={aberto} onOpenChange={setAberto} modal>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          className="w-full justify-between px-3 font-normal"
          disabled={disabled}
        >
          <span className={cn('truncate', !escolhido && 'text-muted-foreground')}>
            {escolhido?.companyName ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" sideOffset={4} collisionPadding={8}>
        <Command filter={filtrarCliente}>
          <CommandInput placeholder="Buscar por nome ou CNPJ..." />
          <CommandList className="max-h-64 overflow-y-auto">
            <CommandEmpty>
              <SemResultado
                onCriar={
                  onCriar &&
                  (() => {
                    setAberto(false);
                    onCriar();
                  })
                }
              />
            </CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  keywords={palavrasDoCliente(client)}
                  onSelect={() => {
                    onChange(client.id);
                    setAberto(false);
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4 shrink-0', client.id === value ? 'opacity-100' : 'opacity-0')}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{client.companyName}</span>
                    {client.tradingName && client.tradingName !== client.companyName && (
                      <span className="block truncate text-xs text-muted-foreground">{client.tradingName}</span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

/** Ignora acento e caixa: quem busca "confeccoes" espera achar "Confecções". */
function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Trecho do nome ou do CNPJ, não a busca aproximada do cmdk: o valor de cada item é o id, e a
 * aproximada achava "fav" espalhado nas letras de qualquer uuid.
 */
function filtrarCliente(_valor: string, busca: string, palavras?: string[]): number {
  const termo = normalizar(busca);
  if (!termo) return 1;
  return (palavras ?? []).some((palavra) => normalizar(palavra).includes(termo)) ? 1 : 0;
}

/** O que a busca encontra: razão social, nome fantasia e o CNPJ nos dois formatos. */
function palavrasDoCliente(client: Client): string[] {
  const cnpj = client.cnpj?.replace(/\D/g, '');
  return [client.companyName, client.tradingName, cnpj, cnpj && formatCNPJ(cnpj)].filter(
    (palavra): palavra is string => !!palavra,
  );
}

function SemResultado({ onCriar }: { onCriar?: () => void }) {
  return (
    <div className="space-y-2 px-2">
      <p>Nenhum cliente encontrado.</p>
      {onCriar && (
        <Button type="button" variant="outline" size="sm" onClick={onCriar}>
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Cadastrar cliente
        </Button>
      )}
    </div>
  );
}
