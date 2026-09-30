import { useState } from 'react';
import { ChevronDown, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { companyFit } from '@/lib/prospecting/fit';
import { cn } from '@/lib/utils';
import type { ProspectCompanyDB } from '@/types/prospect';
import type { CompanyFit, FundingSignals } from '@/types/receita';

interface CompanyFitSectionProps {
  empresa: ProspectCompanyDB;
  fomento?: FundingSignals | null;
}

/**
 * Fit da conta com cada frente da Origami (29/09/2026) — regra explícita, sem IA. Cada barra
 * abre o porquê: nota que não se explica não é usada.
 */
export function CompanyFitSection({ empresa, fomento = null }: CompanyFitSectionProps) {
  const fits = companyFit(empresa, fomento);
  if (!fits) return null;
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-2.5">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold">
        <Target className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        Fit com a Origami
      </h4>
      {[...fits].sort((a, b) => b.nota - a.nota).map((fit) => (
        <LinhaDeFit key={fit.frente} fit={fit} />
      ))}
    </div>
  );
}

function LinhaDeFit({ fit }: { fit: CompanyFit }) {
  const [aberta, setAberta] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        className="w-full space-y-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1">
            <ChevronDown className={cn('h-3 w-3 transition-transform', !aberta && '-rotate-90')} aria-hidden="true" />
            {fit.rotulo}
          </span>
          <span className="font-semibold tabular-nums">{fit.nota}</span>
        </span>
        <Progress value={fit.nota} className="h-1.5" aria-label={`${fit.rotulo}: ${fit.nota} de 100`} />
      </button>
      {aberta && (
        <ul className="mt-1.5 space-y-0.5 pl-4 text-[11px] text-muted-foreground">
          {fit.motivos.length === 0 && <li>Nenhum sinal desta frente ainda.</li>}
          {fit.motivos.map((m) => (
            <li key={m.texto}>
              {m.pontos > 0 && <span className="font-medium text-foreground">+{m.pontos}</span>} {m.texto}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
