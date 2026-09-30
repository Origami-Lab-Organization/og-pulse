import { Landmark, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCheckCompanyFunding } from '@/hooks/useCompanyReceita';
import { formatCurrency } from '@/lib/formatters';
import type { ProspectCompanyDB } from '@/types/prospect';
import type { FundingSignals } from '@/types/receita';

interface CompanyFundingSectionProps {
  empresa: ProspectCompanyDB;
  podeEditar: boolean;
}

const LEI_DO_BEM: Record<FundingSignals['leiDoBem'], { texto: string; classe: string }> = {
  ja_usa: { texto: 'Já declara a Lei do Bem', classe: 'bg-muted text-foreground' },
  nunca_usou: { texto: 'Nunca apareceu na lista da Lei do Bem', classe: 'bg-success-subtle text-success-emphasis' },
  desconhecido: { texto: 'Lista da Lei do Bem ainda não importada', classe: 'bg-muted text-muted-foreground' },
};

/**
 * Fomento público da empresa (29/09/2026) — a frente "financiamento de inovação": quem já
 * declara a Lei do Bem (lista do MCTI), quem já captou na FINEP ou no BNDES e quanto vende
 * para o governo federal (Portal da Transparência, quando a chave estiver configurada).
 */
export function CompanyFundingSection({ empresa, podeEditar }: CompanyFundingSectionProps) {
  const consultar = useCheckCompanyFunding();
  const fomento = empresa.fomento;
  return (
    <div className="mt-3 space-y-2">
      <Separator />
      <div className="flex items-center justify-between gap-2 pt-1">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold">
          <Landmark className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          Fomento público
        </h4>
        {podeEditar && empresa.cnpj && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => consultar.mutate(empresa)} disabled={consultar.isPending}>
            {consultar.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" />
            )}
            {fomento ? 'Atualizar' : 'Consultar'}
          </Button>
        )}
      </div>
      {fomento ? <Resultado fomento={fomento} consultadoEm={empresa.fomento_consultado_em} /> : (
        <p className="text-xs text-muted-foreground">
          Consulte para ver Lei do Bem, captações FINEP/BNDES e contratos com o governo.
        </p>
      )}
    </div>
  );
}

function Resultado({ fomento, consultadoEm }: { fomento: FundingSignals; consultadoEm?: string | null }) {
  const lei = LEI_DO_BEM[fomento.leiDoBem];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary" className={`font-normal ${lei.classe}`}>
          {lei.texto}
          {fomento.leiDoBemAno ? ` (ano-base ${fomento.leiDoBemAno})` : ''}
        </Badge>
        <Badge variant="secondary" className="font-normal">
          {fomento.captouFomento ? `${fomento.fomentos.length} captação(ões) FINEP/BNDES` : 'Sem captação FINEP/BNDES'}
        </Badge>
        <Badge variant="secondary" className="font-normal">{textoDoGoverno(fomento.governo)}</Badge>
      </div>
      {fomento.fomentos.length > 0 && (
        <ul className="space-y-1 text-xs">
          {fomento.fomentos.slice(0, 5).map((f, i) => (
            <li key={`${f.fonte}-${f.ano}-${i}`} className="text-muted-foreground">
              <span className="font-medium text-foreground">{f.fonte}</span>
              {f.ano ? ` ${f.ano}` : ''}
              {f.valor ? ` · ${formatCurrency(f.valor)}` : ''}
              {f.instrumento ? ` · ${f.instrumento}` : ''}
            </li>
          ))}
          {fomento.fomentos.length > 5 && <li className="text-muted-foreground">e mais {fomento.fomentos.length - 5}.</li>}
        </ul>
      )}
      {consultadoEm && (
        <p className="text-[11px] text-muted-foreground">
          Consultado em {consultadoEm.slice(8, 10)}/{consultadoEm.slice(5, 7)}/{consultadoEm.slice(0, 4)} · BNDES, FINEP, MCTI e CGU (dados abertos)
        </p>
      )}
    </div>
  );
}

function textoDoGoverno(governo: FundingSignals['governo']): string {
  if (!governo) return 'Contratos com o governo: fonte não configurada';
  if (governo.contratos === 0) return 'Sem contratos com o governo federal';
  const valor = governo.valorTotal ? ` · ${formatCurrency(governo.valorTotal)}` : '';
  return `${governo.contratos} contrato(s) com o governo federal${valor}`;
}
