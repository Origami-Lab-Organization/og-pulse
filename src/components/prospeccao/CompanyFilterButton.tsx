import { ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { FacetOption } from '@/lib/prospecting/companyList';
import { cn } from '@/lib/utils';

interface CompanyFilterButtonProps {
  label: string;
  options: FacetOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Rótulo exibido de cada valor — a faceta de responsável guarda id, não nome. */
  labelOf?: (value: string) => string;
}

/** Filtro de uma faceta: multisseleção, com quantas empresas ficariam em cada opção. */
export function CompanyFilterButton({
  label,
  options,
  selected,
  onChange,
  labelOf = (v) => v,
}: CompanyFilterButtonProps) {
  const ativo = selected.length > 0;
  const alternar = (valor: string) =>
    onChange(selected.includes(valor) ? selected.filter((v) => v !== valor) : [...selected, valor]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg border pl-3 pr-2.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            ativo
              ? 'border-success/40 bg-success-subtle text-success-emphasis'
              : 'border-border bg-card text-foreground/85 hover:bg-muted/50',
          )}
        >
          <span className="font-medium">{label}</span>
          {ativo && <span className="font-semibold">{resumo(selected, labelOf)}</span>}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto min-w-[230px] p-1.5">
        <p className="px-2 pb-2 pt-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          {label}
        </p>
        <ul className="max-h-72 overflow-y-auto">
          {options.map((opcao) => {
            const id = `filtro-${label}-${opcao.value}`;
            return (
              <li key={opcao.value}>
                <label
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-[7px] text-[13.5px] hover:bg-muted/60"
                >
                  <Checkbox
                    id={id}
                    checked={selected.includes(opcao.value)}
                    onCheckedChange={() => alternar(opcao.value)}
                  />
                  <span className="flex-1">{labelOf(opcao.value)}</span>
                  <span className="text-[12.5px] text-muted-foreground">{opcao.count}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {ativo && (
          <div className="mt-1.5 border-t pt-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full rounded-md px-2 py-[7px] text-left text-[13px] text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Limpar seleção
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Um valor: ele mesmo, sem o prefixo "Anel"/"Tier". Vários: "N selec.". */
function resumo(selected: string[], labelOf: (value: string) => string): string {
  if (selected.length > 1) return `${selected.length} selec.`;
  return labelOf(selected[0]).replace(/^(Anel|Tier) /, '');
}
