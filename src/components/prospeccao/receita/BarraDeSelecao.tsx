import { Button } from '@/components/ui/button';

interface BarraDeSelecaoProps {
  quantidade: number;
  onColocar: () => void;
  onLimpar: () => void;
}

/** Barra da seleção da lista (US-0008): quantas, "Colocar para abordar" e "Limpar seleção". */
export function BarraDeSelecao(props: BarraDeSelecaoProps) {
  const { quantidade, onColocar, onLimpar } = props;
  if (!quantidade) return null;
  return (
    <div role="region" aria-label="Empresas selecionadas" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-accent-subtle px-4 py-2">
      <p className="text-[13px]" aria-live="polite">
        <b className="font-mono font-semibold tabular-nums">{quantidade.toLocaleString('pt-BR')}</b>{' '}
        {quantidade === 1 ? 'selecionada' : 'selecionadas'}
      </p>
      <div className="ml-auto flex gap-2">
        <Button variant="ghost" size="sm" onClick={onLimpar}>Limpar seleção</Button>
        <Button size="sm" onClick={onColocar}>Colocar para abordar</Button>
      </div>
    </div>
  );
}
