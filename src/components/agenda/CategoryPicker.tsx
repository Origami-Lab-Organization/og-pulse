import { AuthError } from '@azure/msal-browser';
import { useState } from 'react';
import { Check, Tag } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { describeGraphError, useOutlookCategories } from '@/hooks/useMicrosoftGraph';
import type { OutlookCategory } from '@/types/microsoftGraph';
import { categoryHex } from './categoryColors';

interface CategoryPickerProps {
  /** Nomes das categorias marcadas — é pelo nome que o Graph grava no evento. */
  value: string[];
  onChange: (categories: string[]) => void;
}

function describeCategoriesError(error: unknown): string {
  if (error instanceof AuthError) {
    return 'Autorize o Pulse a ler suas categorias do Outlook para escolher uma. Feche e abra de novo para tentar.';
  }
  return describeGraphError(error);
}

function CategoryDot({ color }: { color: string }) {
  return (
    <Tag
      className="h-4 w-4 shrink-0"
      style={{ color: categoryHex(color), fill: `${categoryHex(color)}33` }}
      aria-hidden="true"
    />
  );
}

interface CategoriesStatusProps {
  categories: ReturnType<typeof useOutlookCategories>;
}

function CategoriesStatus(props: CategoriesStatusProps) {
  const { categories } = props;
  const className = 'px-2 py-3 text-sm text-muted-foreground';
  if (categories.isLoading) return <p className={className}>Carregando categorias...</p>;
  if (categories.isError) {
    return <p className={className} role="status">{describeCategoriesError(categories.error)}</p>;
  }
  if (categories.data?.length === 0) {
    return <p className={className}>Você ainda não tem categorias no Outlook.</p>;
  }
  return null;
}

/** Rótulo do botão: as categorias marcadas, com a cor de cada uma. */
function SelectedLabel({ value, byName }: { value: string[]; byName: Map<string, OutlookCategory> }) {
  if (value.length === 0) return <span className="text-muted-foreground">Sem categoria</span>;
  return (
    <span className="flex min-w-0 items-center gap-2 overflow-hidden">
      {value.map((name) => (
        <span key={name} className="flex min-w-0 items-center gap-1">
          <CategoryDot color={byName.get(name)?.color ?? 'none'} />
          <span className="truncate">{name}</span>
        </span>
      ))}
    </span>
  );
}

/** Categorias do Outlook (as tags coloridas), uma ou várias por compromisso. */
export function CategoryPicker(props: CategoryPickerProps) {
  const { value, onChange } = props;
  const [open, setOpen] = useState(false);
  // Abrir o seletor é o gesto que autoriza pedir o consentimento.
  const categories = useOutlookCategories(open || value.length > 0, open);
  const list = categories.data ?? [];
  const byName = new Map(list.map((category) => [category.name, category]));

  const toggle = (name: string) => {
    onChange(value.includes(name) ? value.filter((item) => item !== name) : [...value, name]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start font-normal">
          {value.length === 0 && <Tag className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />}
          <SelectedLabel value={value} byName={byName} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder="Buscar categoria..." />
          <CommandList className="max-h-64">
            <CommandEmpty>Nenhuma categoria com esse nome.</CommandEmpty>
            <CommandGroup>
              <CategoriesStatus categories={categories} />
              {list.map((category) => {
                const selected = value.includes(category.name);
                return (
                  <CommandItem key={category.id} value={category.name} onSelect={() => toggle(category.name)}>
                    <CategoryDot color={category.color} />
                    <span className="ml-2 min-w-0 flex-1 truncate">{category.name}</span>
                    <Check
                      className={cn('h-4 w-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')}
                      aria-hidden="true"
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
