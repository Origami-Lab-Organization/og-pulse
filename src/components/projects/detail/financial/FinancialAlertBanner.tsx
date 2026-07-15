interface FinancialAlertBannerProps {
  alerts: string[];
}

/**
 * Faixa de alerta financeiro — único uso de vermelho (destructive) nesta aba.
 * Só aparece quando há alertas reais (parcela vencida, margem projetada abaixo
 * da meta). Sem alertas, não renderiza nada.
 */
export function FinancialAlertBanner({ alerts }: FinancialAlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 rounded-[10px] border border-destructive/20 bg-destructive/[0.06] px-4 py-2.5"
        >
          <span className="h-[7px] w-[7px] flex-none rounded-full bg-destructive" />
          <span className="text-xs text-muted-foreground">{alert}</span>
        </div>
      ))}
    </div>
  );
}
