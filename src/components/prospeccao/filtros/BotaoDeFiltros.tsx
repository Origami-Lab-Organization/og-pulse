import { forwardRef } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BotaoDeFiltrosProps {
  ativos: number;
  aberto: boolean;
  onClick: () => void;
}

/** Só o ícone (18/11/2026): abre e recolhe o painel; a contagem de filtros ativos vai num selo. */
export const BotaoDeFiltros = forwardRef<HTMLButtonElement, BotaoDeFiltrosProps>(function BotaoDeFiltros(props, ref) {
  const { ativos, aberto, onClick } = props;
  const acao = aberto ? 'Recolher filtros' : 'Mostrar filtros';
  const rotulo = ativos ? `${acao}, ${ativos} ativo${ativos > 1 ? 's' : ''}` : acao;
  return (
    <Button
      ref={ref}
      variant={aberto ? 'secondary' : 'outline'}
      size="icon"
      className="relative h-9 w-9 shrink-0"
      onClick={onClick}
      aria-expanded={aberto}
      aria-label={rotulo}
      title={rotulo}
    >
      <Filter className="h-4 w-4" aria-hidden="true" />
      {ativos > 0 && (
        <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-primary px-1 font-mono text-[11px] leading-[18px] text-primary-foreground" aria-hidden="true">
          {ativos}
        </span>
      )}
    </Button>
  );
});

