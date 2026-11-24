import { useState } from 'react';
import { ChevronDown, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { companyFit } from '@/lib/prospecting/fit';
import { cn } from '@/lib/utils';
import type { ProspectCompanyDB } from '@/types/prospect';
import type { CompanyFit, FundingSignals } from '@/types/receita';
import { CartaoDaFicha } from './FichaDaOportunidade';

interface CompanyFitSectionProps {
  empresa: ProspectCompanyDB;
  fomento?: FundingSignals | null;
  /** Cartão próprio e recolhido, como na ficha da oportunidade (27/10/2026); sem ele, bloco dentro da Receita. */
  emCartao?: boolean;
}

/**
 * Fit da conta com cada serviço da Origami (US-0014: Studio de Produto, Lei do Bem, Captação de
 * recursos e Consultoria Estratégica) — regra explícita, sem IA. Cada barra abre o porquê: nota
 * que não se explica não é usada.
 */
export function CompanyFitSection(props: CompanyFitSectionProps) {
  const { empresa, fomento = null, emCartao = false } = props;
  const fits = companyFit(empresa, fomento);
  if (!fits) return null;
  const ordenados = [...fits].sort((a, b) => b.nota - a.nota);
  const linhas = ordenados.map((fit) => <LinhaDeFit key={fit.frente} fit={fit} grande={emCartao} />);
  if (emCartao) {
    // Fechado, o cartão diz a frente mais forte — é o que se procura num relance.
    const melhor = ordenados[0];
    return (
      <CartaoDaFicha titulo="Fit com a Origami" inicialAberto={false} resumo={melhor && `${melhor.rotulo} · ${melhor.nota}`}>
        <div className="space-y-3">{linhas}</div>
      </CartaoDaFicha>
    );
  }
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-2.5">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold">
        <Target className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        Fit com a Origami
      </h4>
      {linhas}
    </div>
  );
}

function LinhaDeFit({ fit, grande }: { fit: CompanyFit; grande: boolean }) {
  const [aberta, setAberta] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        className="w-full space-y-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={cn('flex items-center justify-between', grande ? 'text-sm' : 'text-xs')}>
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
          {fit.motivos.length === 0 && <li>Nenhum sinal deste serviço ainda.</li>}
          {fit.motivos.map((m) => (
            <li key={m.texto}>
              <PontosDoMotivo pontos={m.pontos} /> {m.texto}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "+15" ou "−25" (a dívida ativa ajuizada só tira, US-0014). */
function PontosDoMotivo({ pontos }: { pontos: number }) {
  if (pontos === 0) return null;
  if (pontos < 0) return <span className="font-medium text-destructive-emphasis">−{Math.abs(pontos)}</span>;
  return <span className="font-medium text-foreground">+{pontos}</span>;
}

interface FitPorServicoProps {
  empresa: ProspectCompanyDB;
  fomento?: FundingSignals | null;
}

/** O fit de cada serviço, do maior para o menor, com o porquê (Estudo da conta, US-0014). */
export function FitPorServico(props: FitPorServicoProps) {
  const { empresa, fomento = null } = props;
  const fits = companyFit(empresa, fomento ?? empresa.fomento ?? null);
  if (!fits) return <p className="text-sm text-muted-foreground">Sem os dados da Receita da empresa ainda: sem nota.</p>;
  const ordenados = [...fits].sort((a, b) => b.nota - a.nota);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ordenados.map((fit) => <LinhaDeFit key={fit.frente} fit={fit} grande />)}
    </div>
  );
}
