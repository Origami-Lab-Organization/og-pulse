import { ArrowDown } from 'lucide-react';
import type { FunnelRate, FunnelStep } from '@/lib/prospecting/metrics';
import { cn } from '@/lib/utils';

/**
 * O funil desenhado: cada etapa mais estreita que a anterior, e entre elas a taxa de
 * conversão. A largura decrescente é o que faz a perda ser vista antes de ser lida.
 */
export function ProspectFunnel({ steps, rates }: { steps: FunnelStep[]; rates: FunnelRate[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, indice) => {
        const ultima = indice === steps.length - 1;
        return (
          <li key={step.key}>
            <div className="flex items-center gap-4">
              <div className="flex flex-1 justify-center">
                <div
                  title={step.question}
                  style={{ width: `${100 - indice * 8}%` }}
                  className={cn(
                    'rounded-lg border px-4 py-3 text-center',
                    ultima ? 'border-transparent bg-primary text-primary-foreground' : 'bg-card',
                  )}
                >
                  <p className="text-2xl font-semibold leading-none">{step.value}</p>
                  <p className={cn('mt-1 text-xs', ultima ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                    {step.label}
                  </p>
                </div>
              </div>
              <div className="hidden w-44 shrink-0 sm:block" aria-hidden="true" />
            </div>

            {indice < rates.length && <Taxa rate={rates[indice]} />}
          </li>
        );
      })}
    </ol>
  );
}

function Taxa({ rate }: { rate: FunnelRate }) {
  const texto = (
    <>
      <strong className="text-primary">{rate.value}</strong>{' '}
      <span className="text-muted-foreground">{rate.label}</span>
    </>
  );
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-1 items-center justify-center gap-2 py-2">
        <ArrowDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs sm:hidden">{texto}</span>
      </div>
      <p className="hidden w-44 shrink-0 text-sm sm:block">{texto}</p>
    </div>
  );
}
