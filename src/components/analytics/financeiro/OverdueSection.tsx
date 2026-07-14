import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { fmtBRL0, fmtBRLk } from './financeUtils';
import type { OverdueItem } from '@/hooks/useRevenueAnalytics';

function OverdueList({
  title,
  count,
  countLabel,
  total,
  caption,
  items,
  emptyLabel,
}: {
  title: string;
  count: number;
  countLabel: string;
  total: number;
  caption: string;
  items: OverdueItem[];
  emptyLabel: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="ol-label text-foreground">{title}</span>
          {count > 0 && (
            <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {count} {countLabel}
            </span>
          )}
        </div>
        <span className="font-mono text-sm font-bold tabular-nums text-destructive">{fmtBRL0(total)}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{caption}</p>

      <div className="mt-3 divide-y">
        {items.length === 0 ? (
          <p className="py-3 text-xs text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => navigate(`/projects/${item.projectId}?tab=financial`)}
              className="flex w-full items-center justify-between gap-3 py-2 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.clientName ? `${item.clientName} · ` : ''}{item.projectName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  parc. {item.installmentNumber} · venc {format(parseISO(item.dueDate), 'dd/MMM', { locale: ptBR }).replace('.', '')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-pill bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-destructive">
                  {item.daysOverdue}d
                </span>
                <span className="w-20 text-right font-mono text-sm font-semibold tabular-nums text-foreground">{fmtBRL0(item.value)}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function OverdueSection({
  overdueNFs,
  overdueReceipts,
}: {
  overdueNFs: OverdueItem[];
  overdueReceipts: OverdueItem[];
}) {
  const totalNF = overdueNFs.reduce((s, i) => s + i.value, 0);
  const totalReceipts = overdueReceipts.reduce((s, i) => s + i.value, 0);
  const totalParado = totalNF + totalReceipts;

  if (totalParado === 0) {
    return (
      <section className="flex items-center gap-2.5 rounded-lg border bg-card p-4 shadow-card text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 text-success" />
        Nenhum faturamento ou recebimento em atraso. 🎉
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-destructive/30 bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-destructive/20 bg-destructive/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-semibold text-foreground">Em atraso</span>
          <span className="text-[11px] text-muted-foreground">passou do vencimento — a faturar e a receber</span>
        </div>
        <span className="font-mono text-sm font-bold tabular-nums text-destructive">{fmtBRL0(totalParado)} parados</span>
      </div>

      <div className="flex flex-col gap-6 p-4 lg:flex-row lg:gap-8">
        <OverdueList
          title="Faturamento em atraso"
          count={overdueNFs.length}
          countLabel={overdueNFs.length === 1 ? 'NF' : 'NFs'}
          total={totalNF}
          caption="Entregue e vencido, mas a NF ainda não foi emitida."
          items={overdueNFs}
          emptyLabel="Nenhuma NF vencida a emitir."
        />
        <div className="hidden w-px shrink-0 bg-border lg:block" />
        <div className="flex-1">
          <OverdueList
            title="Recebimento em atraso"
            count={overdueReceipts.length}
            countLabel={overdueReceipts.length === 1 ? 'recebível' : 'recebíveis'}
            total={totalReceipts}
            caption="NF emitida e vencida, mas ainda não caiu no caixa."
            items={overdueReceipts}
            emptyLabel="Nenhum recebível vencido."
          />
          <div className={cn('mt-3 flex items-start gap-2 rounded-md border bg-warning/5 p-2.5 text-[11px] text-muted-foreground')}>
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            Cobrança e emissão em aberto travam {fmtBRLk(totalParado)} de caixa. Priorizar os maiores atrasos.
          </div>
        </div>
      </div>
    </section>
  );
}
