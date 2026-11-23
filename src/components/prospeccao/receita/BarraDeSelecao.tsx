import { Button } from '@/components/ui/button';
import type { ModoDaDecisao } from '@/types/decisoesDaBase';

interface BarraDeSelecaoProps {
  quantidade: number;
  onColocar: () => void;
  /** Descartar ou "Não agora" (US-0010). */
  onDecidir: (modo: ModoDaDecisao) => void;
  onLimpar: () => void;
}

/**
 * Barra da seleção da lista (US-0008, US-0010): quantas, "Limpar seleção", "Não agora",
 * "Descartar" e "Mover para qualificação", a ação principal, por último.
 */
export function BarraDeSelecao(props: BarraDeSelecaoProps) {
  const { quantidade, onColocar, onDecidir, onLimpar } = props;
  if (!quantidade) return null;
  return (
    <div role="region" aria-label="Empresas selecionadas" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-accent-subtle px-4 py-2">
      <p className="text-[13px]" aria-live="polite">
        <b className="font-mono font-semibold tabular-nums">{quantidade.toLocaleString('pt-BR')}</b>{' '}
        {quantidade === 1 ? 'selecionada' : 'selecionadas'}
      </p>
      <div className="ml-auto flex gap-2">
        <Button variant="ghost" size="sm" onClick={onLimpar}>Limpar seleção</Button>
        <Button variant="outline" size="sm" onClick={() => onDecidir('nao_agora')}>Não agora</Button>
        <Button variant="outline" size="sm" onClick={() => onDecidir('descartar')}>Descartar</Button>
        <Button size="sm" onClick={onColocar}>Mover para qualificação</Button>
      </div>
    </div>
  );
}
