import { ArrowRight } from 'lucide-react';
import { fmtBRL0, fmtBRLk } from './financeUtils';
import type { FinancialReportData } from '@/hooks/useFinancialReport';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function CashflowReceivablesCard({ data, monthShort }: { data: FinancialReportData; monthShort: string }) {
  const diff = data.receita - data.faturamento;
  const rev = data.revenue;

  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <h2 className="text-base font-semibold text-foreground">
        Faturado × recebido <span className="text-xs font-normal text-muted-foreground">defasagem de caixa</span>
      </h2>

      <div className="mt-3 flex items-stretch gap-2">
        <div className="flex-1 rounded-md border bg-background p-3">
          <p className="ol-label text-muted-foreground">Faturado {monthShort}</p>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">{fmtBRLk(data.faturamento)}</p>
        </div>
        <div className="flex items-center text-muted-foreground"><ArrowRight className="h-4 w-4" /></div>
        <div className="flex-1 rounded-md border bg-background p-3">
          <p className="ol-label text-muted-foreground">Recebido {monthShort}</p>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">{fmtBRLk(data.receita)}</p>
        </div>
      </div>
      {diff !== 0 && (
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          {diff > 0
            ? `Recebemos ${fmtBRLk(Math.abs(diff))} acima do que faturamos — caixa de notas emitidas em meses anteriores.`
            : `Faturamos ${fmtBRLk(Math.abs(diff))} acima do que recebemos — parte vira caixa nos próximos meses.`}
        </p>
      )}

      <div className="mt-4 border-t pt-3">
        <p className="ol-label text-muted-foreground">A receber (faturado, ainda não pago)</p>
        <div className="mt-2 space-y-1.5">
          {rev.receivablesByDueMonth.map((b) => (
            <div key={b.monthKey} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Vence em {capitalize(b.label.split(' ')[0])}</span>
              <span className="font-mono font-semibold tabular-nums text-foreground">{fmtBRL0(b.value)}</span>
            </div>
          ))}
          {rev.overdueReceivableTotal > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-destructive">Vencido (atrasado)</span>
              <span className="font-mono font-semibold tabular-nums text-destructive">{fmtBRL0(rev.overdueReceivableTotal)}</span>
            </div>
          )}
          {rev.receivablesByDueMonth.length === 0 && rev.overdueReceivableTotal === 0 && (
            <p className="text-sm text-muted-foreground">Nada a receber em aberto.</p>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm font-semibold">
          <span className="text-foreground">Total a receber</span>
          <span className="font-mono tabular-nums text-foreground">{fmtBRL0(rev.totalReceivable)}</span>
        </div>
      </div>
    </section>
  );
}
