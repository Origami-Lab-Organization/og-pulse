import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtBRL0, fmtBRLk, fmtPct } from './financeUtils';
import type { FinancialReportData, FinancialCostCategory } from '@/hooks/useFinancialReport';

function ScopeBadge({ scope }: { scope: FinancialCostCategory['scope'] }) {
  const label = scope === 'misto' ? 'billable + interno' : scope === 'interno' ? 'interno' : 'billable';
  return (
    <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  );
}

function CategoryRow({ cat }: { cat: FinancialCostCategory }) {
  const isLabor = cat.key === 'labor' && cat.billable != null && cat.internal != null;
  const total = cat.value || 1;
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {cat.label}
          <ScopeBadge scope={cat.scope} />
        </span>
        <span className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{fmtBRL0(cat.value)}</span>
          <span className="w-12 text-right font-mono text-xs tabular-nums text-muted-foreground">{fmtPct(cat.pct)}</span>
        </span>
      </div>
      <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-muted" style={{ width: `${Math.max(cat.pct, 2)}%` }}>
        {isLabor ? (
          <>
            <div className="h-full bg-success" style={{ width: `${(cat.billable! / total) * 100}%` }} />
            <div className="h-full bg-brand-slate" style={{ width: `${(cat.internal! / total) * 100}%` }} />
          </>
        ) : (
          <div className="h-full w-full bg-success" />
        )}
      </div>
      {isLabor && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {fmtBRLk(cat.billable!)} billable (projetos de cliente) · {fmtBRLk(cat.internal!)} interno (não-billable, ainda é custo)
        </p>
      )}
    </div>
  );
}

export function CostByCategoryCard({ data, monthLabel }: { data: FinancialReportData; monthLabel: string }) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Custos por categoria <span className="text-xs font-normal text-muted-foreground">{monthLabel}</span>
        </h2>
        <span className="font-mono text-sm font-bold tabular-nums text-foreground">{fmtBRL0(data.custos)}</span>
      </div>
      <div className="mt-2 divide-y">
        {data.categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum custo lançado neste mês.</p>
        ) : (
          data.categories.map((cat) => <CategoryRow key={cat.key} cat={cat} />)
        )}
      </div>
    </section>
  );
}

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
