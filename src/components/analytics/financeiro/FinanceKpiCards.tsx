import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinancialReportData } from '@/hooks/useFinancialReport';
import { fmtBRL0, fmtBRLk, fmtPct, fmtPp } from './financeUtils';

function ProgressVsPlanned({
  realizado,
  previsto,
  fillClass,
}: {
  realizado: number;
  previsto: number;
  fillClass: string;
}) {
  // previsto = saldo em aberto (atrasado + futuro, nunca o que já foi realizado).
  // % é sobre o total esperado (realizado + em aberto), não sobre o previsto isolado —
  // assim a barra continua limitada a 0–100% mesmo com previsto pequeno ou zerado.
  const totalEsperado = realizado + previsto;
  const pct = totalEsperado > 0 ? (realizado / totalEsperado) * 100 : null;
  return (
    <div className="mt-3 border-t pt-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-mono tabular-nums">
          {pct === null ? 'sem previsto' : `${fmtPct(pct, 0)} do total esperado`}
        </span>
        <span className="font-mono tabular-nums">em aberto {fmtBRLk(previsto)}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', fillClass)} style={{ width: `${pct === null ? 0 : Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  hint,
  value,
  dotClass,
  children,
}: {
  label: string;
  hint: string;
  value: string;
  dotClass: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="ol-label inline-flex items-center gap-1.5 text-muted-foreground">
          <span className={cn('h-2 w-2 rounded-full', dotClass)} />
          {label}
        </span>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <span className="mt-2 font-mono text-3xl font-bold leading-none tracking-tight tabular-nums text-foreground">{value}</span>
      {children}
    </div>
  );
}

export function FinanceKpiCards({ data }: { data: FinancialReportData }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Faturamento" hint="NF emitida" value={fmtBRL0(data.faturamento)} dotClass="bg-muted-foreground/50">
        <ProgressVsPlanned realizado={data.faturamento} previsto={data.faturamentoPrevisto} fillClass="bg-muted-foreground/60" />
      </KpiCard>

      <KpiCard label="Receita" hint="recebido" value={fmtBRL0(data.receita)} dotClass="bg-success">
        <ProgressVsPlanned realizado={data.receita} previsto={data.receitaPrevista} fillClass="bg-success" />
      </KpiCard>

      <KpiCard label="Custos" hint="total do período" value={fmtBRL0(data.custos)} dotClass="bg-destructive">
        <ProgressVsPlanned realizado={data.custos} previsto={data.custosPrevisto} fillClass="bg-destructive" />
      </KpiCard>

      {/* RESULTADO — card em destaque (verde-escuro) */}
      <div className="flex flex-col rounded-lg bg-primary-deep p-4 text-primary-deep-foreground shadow-card">
        <div className="flex items-center justify-between">
          <span className="ol-label text-primary-deep-foreground/80">Resultado</span>
          <span className="text-[11px] text-primary-deep-foreground/70">Receita − Custos</span>
        </div>
        <span className="mt-2 font-mono text-3xl font-bold leading-none tracking-tight tabular-nums">{fmtBRL0(data.resultado)}</span>
        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-sm tabular-nums">
          <span>Margem {data.margemPct != null ? fmtPct(data.margemPct) : '—'}</span>
          {data.margemDeltaPp != null && (
            <span className="inline-flex items-center gap-0.5 rounded-pill bg-primary-deep-foreground/15 px-1.5 py-0.5 text-xs font-semibold">
              {data.margemDeltaPp >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {fmtPp(Math.abs(data.margemDeltaPp))}
            </span>
          )}
        </div>
        <p className="mt-3 border-t border-primary-deep-foreground/20 pt-2 text-[11px] leading-snug text-primary-deep-foreground/80">
          {data.metaPct == null
            ? 'Meta de margem não configurada.'
            : data.margemPct == null
              ? `Meta ${fmtPct(data.metaPct, 0)}`
              : `Meta ${fmtPct(data.metaPct, 0)} · ${data.margemPct >= data.metaPct ? 'acima' : 'abaixo'} por ${fmtPp(Math.abs(data.margemPct - data.metaPct)).replace('+', '')}`}
        </p>
      </div>
    </div>
  );
}
