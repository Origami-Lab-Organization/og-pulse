import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  subline?: ReactNode;
  className?: string;
  valueClassName?: string;
}

/**
 * Card de métrica no padrão da aba Financeiro dos projetos
 * (`src/components/projects/detail/financial/FinancialKpiCards.tsx`) — label pequeno em
 * caixa alta, número grande em mono, subline opcional. Existe para que outras telas de
 * métricas não precisem copiar essas classNames.
 */
export function MetricCard({ label, value, subline, className, valueClassName }: MetricCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card px-[18px] py-3.5 flex flex-col justify-between', className)}>
      <p className="ui-label truncate text-muted-foreground">{label}</p>
      <p
        className={cn(
          'font-mono text-[1.625rem] font-semibold leading-none tabular-nums mt-1 truncate',
          valueClassName,
        )}
      >
        {value}
      </p>
      {subline != null && (
        <p className="font-mono text-[11.5px] text-muted-foreground mt-0.5 truncate">{subline}</p>
      )}
    </div>
  );
}
