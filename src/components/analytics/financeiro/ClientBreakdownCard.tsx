import { cn } from '@/lib/utils';
import { fmtBRL0, fmtPct } from './financeUtils';
import type { ClientBreakdownRow } from '@/hooks/useFinancialReport';

export function ClientBreakdownCard({ rows, metaPct }: { rows: ClientBreakdownRow[]; metaPct: number | null }) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-foreground">Breakdown por cliente</h2>
        <span className="text-xs text-muted-foreground">faturado · recebido · custo · margem no período</span>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sem movimentação por cliente no período.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="ol-label border-b text-muted-foreground">
                <th className="pb-2 pr-3 text-left font-semibold">Cliente</th>
                <th className="pb-2 pr-3 text-right font-semibold">Faturado</th>
                <th className="pb-2 pr-3 text-right font-semibold">Recebido</th>
                <th className="pb-2 pr-3 text-right font-semibold">Custo</th>
                <th className="pb-2 text-right font-semibold">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => {
                const belowMeta = metaPct != null && r.margem != null && r.margem < metaPct;
                return (
                  <tr key={r.id}>
                    <td className="py-2 pr-3 font-medium text-foreground">
                      <span className="block max-w-[220px] truncate">{r.label}</span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted-foreground">{fmtBRL0(r.faturado)}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-foreground">{fmtBRL0(r.recebido)}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted-foreground">{fmtBRL0(r.custo)}</td>
                    <td className={cn('py-2 text-right font-mono font-semibold tabular-nums', r.margem == null ? 'text-muted-foreground' : belowMeta ? 'text-destructive' : 'text-success')}>
                      {r.margem == null ? '—' : fmtPct(r.margem)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 border-t pt-2 text-[11px] leading-snug text-muted-foreground">
        Custo aqui é o custo billable ligado ao projeto do cliente (mão de obra apontada + fornecedores/materiais/comissões). Custo interno não é atribuído a cliente.
      </p>
    </section>
  );
}
