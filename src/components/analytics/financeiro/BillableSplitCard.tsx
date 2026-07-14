import { AlertCircle } from 'lucide-react';
import { fmtBRL0, fmtBRLk, fmtPct } from './financeUtils';
import type { FinancialReportData } from '@/hooks/useFinancialReport';

export function BillableSplitCard({ data }: { data: FinancialReportData }) {
  const billablePct = data.billablePct ?? 0;
  const internalPct = 100 - billablePct;
  const hasData = data.custos > 0;

  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <h2 className="text-base font-semibold text-foreground">Billable × não-billable</h2>

      {hasData ? (
        <>
          <div className="mt-3 flex h-7 w-full overflow-hidden rounded-md">
            <div className="flex h-full items-center justify-start bg-success px-2 font-mono text-xs font-semibold text-success-foreground" style={{ width: `${billablePct}%` }}>
              {billablePct >= 12 && fmtPct(billablePct)}
            </div>
            <div className="flex h-full items-center justify-end bg-brand-slate px-2 font-mono text-xs font-semibold text-primary-deep-foreground" style={{ width: `${internalPct}%` }}>
              {internalPct >= 12 && fmtPct(internalPct)}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-sm bg-success" />
                Billable — ligado a projeto de cliente
              </span>
              <span className="font-mono font-semibold tabular-nums text-foreground">{fmtBRL0(data.billableCost)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-sm bg-brand-slate" />
                Não-billable — interno / admin
              </span>
              <span className="font-mono font-semibold tabular-nums text-foreground">{fmtBRL0(data.internalCost)}</span>
            </div>
          </div>

          {data.internalCost > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-md border bg-warning/5 p-2.5 text-[11px] text-muted-foreground">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              A mão de obra não-billable ({fmtBRLk(data.internalCost)} interno) não gera receita, mas continua sendo custo da empresa.
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Sem custos no mês.</p>
      )}
    </section>
  );
}
