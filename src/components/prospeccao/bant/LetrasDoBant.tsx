import { LETRAS_BANT, rotuloDoEstado } from '@/lib/prospecting/bant';
import { cn } from '@/lib/utils';
import type { BantDaOportunidade, EstadoBant } from '@/types/bant';

/**
 * As quatro letras do BANT (US-0022): apagada = não sei; contorno verde = indício; verde cheio =
 * confirmado; vermelha = não atende. Ao lado, a nota e a meta da etapa, em destaque quando a
 * nota está abaixo da meta.
 */

const VISUAL: Record<EstadoBant, string> = {
  nao_sei: 'border-border bg-muted/40 text-muted-foreground/60',
  indicio: 'border-success bg-success-subtle/60 text-success-emphasis',
  confirmado: 'border-success bg-success text-success-foreground',
  nao_atende: 'border-destructive bg-destructive-subtle text-destructive-emphasis',
};

interface LetrasDoBantProps {
  bant: BantDaOportunidade;
  /** No cartão do quadro: letras menores. */
  compacto?: boolean;
}

export function LetrasDoBant(props: LetrasDoBantProps) {
  const { bant, compacto = false } = props;
  const abaixo = bant.meta != null && bant.nota < bant.meta;
  const descricao = LETRAS_BANT.map(({ letra, nome }) => `${nome}: ${rotuloDoEstado(bant.letras[letra].estado)}`).join('; ');
  return (
    <span className="inline-flex items-center gap-1.5" title={descricao}>
      <span className="inline-flex gap-0.5" aria-label={`BANT. ${descricao}`} role="img">
        {LETRAS_BANT.map(({ letra }) => (
          <span
            key={letra}
            aria-hidden="true"
            className={cn(
              'inline-flex items-center justify-center rounded border font-mono font-semibold',
              compacto ? 'h-4 w-4 text-[10px]' : 'h-6 w-6 text-xs',
              VISUAL[bant.letras[letra].estado],
            )}
          >
            {letra}
          </span>
        ))}
      </span>
      <span className={cn('font-mono tabular-nums', compacto ? 'text-[11px]' : 'text-xs', abaixo ? 'font-medium text-warning-emphasis' : 'text-muted-foreground')}>
        {bant.nota}
        {bant.meta != null && <span className="text-muted-foreground">/{bant.meta}</span>}
      </span>
      {bant.propostas.length > 0 && (
        <span className="rounded-full bg-info-subtle px-1.5 text-[10.5px] font-medium text-info-emphasis" title="Propostas da IA esperando decisão">
          {bant.propostas.length} IA
        </span>
      )}
    </span>
  );
}
