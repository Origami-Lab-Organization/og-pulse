import { useId } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { BUSCA_MAXIMA } from '@/lib/prospecting/buscaReceita';
import { cn } from '@/lib/utils';

const TECLA_QUE_LIMPA = 'Escape';

interface CaixaDeBuscaProps {
  valor: string;
  /** "Digite ao menos…", enquanto o texto ainda não basta para buscar. */
  aviso: string | null;
  onChange: (valor: string) => void;
}

/**
 * Busca por nome, CNPJ ou cidade na base da Receita (US-0005). Esc ou o "x" limpam. O aviso de
 * texto curto fica dentro da caixa, à direita: o texto digitado ainda é curto, e a barra não
 * muda de altura.
 */
export function CaixaDeBusca(props: CaixaDeBuscaProps) {
  const { valor, aviso, onChange } = props;
  const dica = useId();
  return (
    <div className="relative min-w-0 flex-1 basis-full sm:basis-[260px] sm:max-w-[380px]">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === TECLA_QUE_LIMPA && onChange('')}
        placeholder="Buscar por nome, CNPJ ou cidade"
        aria-label="Buscar empresa por nome, CNPJ ou cidade"
        aria-describedby={aviso ? dica : undefined}
        maxLength={BUSCA_MAXIMA}
        autoComplete="off"
        className={cn('h-9 pl-8 pr-8 text-[13px] [&::-webkit-search-cancel-button]:hidden', aviso && 'pr-56')}
      />
      <span id={dica} aria-live="polite" className="pointer-events-none absolute right-9 top-1/2 max-w-[60%] -translate-y-1/2 truncate text-[12px] text-muted-foreground">
        {aviso ?? ''}
      </span>
      {valor && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar a busca"
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
