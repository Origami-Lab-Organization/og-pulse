import { useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { GrupoDeFiltroProps, Opcao } from '@/types/filtrosReceita';
import { cn } from '@/lib/utils';

/**
 * Blocos dos painéis de filtro do Comercial: a Base (US-0003) e a aba Em qualificação
 * (US-0042). Dentro de um grupo, as opções somam; entre grupos, valem todas juntas.
 */

/** Grupo que abre e fecha; começa aberto só se já tem filtro marcado. */
export function Grupo(props: GrupoDeFiltroProps) {
  const { titulo, resumo: marcado, children } = props;
  const [aberto, setAberto] = useState(!!marcado);
  const conteudo = useId();
  return (
    <section className="border-b last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={conteudo}
          onClick={() => setAberto((a) => !a)}
          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', aberto && 'rotate-90')} aria-hidden="true" />
          <span className="shrink-0 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</span>
          {marcado && <span className="ml-auto min-w-0 truncate text-[12px] font-medium text-success-emphasis">{marcado}</span>}
        </button>
      </h3>
      {aberto && <div id={conteudo} className="flex flex-col gap-2 px-3.5 pb-3">{children}</div>}
    </section>
  );
}

/** Opções longas: uma por linha, com caixa de marcar, rolando se passar de 16 rem. */
export function Lista<T extends string>(props: { rotulo: string; opcoes: ReadonlyArray<Opcao<T>>; marcados: readonly T[]; onAlternar: (v: T) => void }) {
  const { rotulo, opcoes, marcados, onAlternar } = props;
  return (
    <div role="group" aria-label={rotulo} className="-mr-1.5 flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1.5">
      {opcoes.map((o) => (
        <Caixa key={o.valor} rotulo={o.rotulo} marcada={marcados.includes(o.valor)} onChange={() => onAlternar(o.valor)} />
      ))}
    </div>
  );
}

export const CHIP = 'rounded-full border px-2.5 py-0.5 text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
export const CHIP_MARCADO = 'border-primary bg-accent-subtle font-semibold text-success-emphasis';
export const CHIP_LIVRE = 'border-input bg-card hover:bg-muted';

export function Chips<T extends string>(props: { rotulo: string; opcoes: ReadonlyArray<Opcao<T>>; marcados: readonly T[]; onAlternar: (v: T) => void }) {
  const { rotulo, opcoes, marcados, onAlternar } = props;
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const marcado = marcados.includes(o.valor);
        return (
          <button key={o.valor} type="button" aria-pressed={marcado} onClick={() => onAlternar(o.valor)} className={cn(CHIP, marcado ? CHIP_MARCADO : CHIP_LIVRE)}>
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

export function EscolhaUnica<T extends string | number>(props: { rotulo: string; opcoes: ReadonlyArray<Opcao<T>>; valor: T; onEscolher: (v: T) => void }) {
  const { rotulo, opcoes, valor, onEscolher } = props;
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={o.valor === valor}
          onClick={() => onEscolher(o.valor)}
          className={cn(CHIP, o.valor === valor ? CHIP_MARCADO : CHIP_LIVRE)}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

export function Caixa(props: { rotulo: string; marcada: boolean; desativada?: boolean; onChange: (marcada: boolean) => void }) {
  const { rotulo, marcada, desativada, onChange } = props;
  return (
    <label className={cn('flex items-start gap-2 text-[13px] leading-snug', desativada && 'text-muted-foreground')}>
      <Checkbox className="mt-px shrink-0" checked={marcada} disabled={desativada} onCheckedChange={(v) => onChange(v === true)} />
      <span>{rotulo}</span>
    </label>
  );
}
