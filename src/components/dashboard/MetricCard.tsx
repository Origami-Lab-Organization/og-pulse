import { ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  icon: LucideIcon;
  /** Valor já formatado (ex.: formatCurrency). Ignorado quando empty/comingSoon/loading. */
  value?: ReactNode;
  subtitle?: string;
  accentColor?: string; // ex.: 'bg-emerald-500'
  valueColor?: string;
  /** Carregando dados do período. */
  loading?: boolean;
  /**
   * Sem dado real para o período. Mostra mensagem orientativa em vez de zero
   * (HU-002 / Cenário 4 — nunca exibir zero como se fosse dado real).
   */
  empty?: boolean;
  emptyMessage?: string;
  /** Módulo ainda incompleto — rótulo "em breve", sem inventar número. */
  comingSoon?: boolean;
}

/**
 * Card de métrica do Dashboard Executivo com os quatro estados previstos pela
 * HU-002: loading, vazio orientativo, "em breve" e valor real.
 */
export function MetricCard({
  label,
  icon: Icon,
  value,
  subtitle,
  accentColor = 'bg-primary',
  valueColor,
  loading = false,
  empty = false,
  emptyMessage = 'Sem dados para o período selecionado.',
  comingSoon = false,
}: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1 rounded-l-lg',
          comingSoon || empty ? 'bg-muted' : accentColor,
        )}
      />
      <CardContent className="pt-5 pb-4 pl-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>

        {loading ? (
          <div className="flex items-center h-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : comingSoon ? (
          <div className="py-2">
            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-muted text-muted-foreground">
              Em breve
            </span>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
            )}
          </div>
        ) : empty ? (
          <p className="text-sm text-muted-foreground mt-1 leading-snug min-h-[3rem]">
            {emptyMessage}
          </p>
        ) : (
          <>
            <div className={cn('text-2xl font-bold', valueColor)}>{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
