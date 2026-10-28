import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FinancialKpiCards } from '@/components/projects/detail/financial/FinancialKpiCards';
import { HideValuesProvider } from '@/contexts/HideValuesContext';

function renderWithProviders(props: Parameters<typeof FinancialKpiCards>[0]) {
  return render(
    <HideValuesProvider value={false}>
      <FinancialKpiCards {...props} />
    </HideValuesProvider>,
  );
}

const baseProps = {
  revenueActual: 10000,
  revenuePlanned: 50000,
  revenueExecuted: 0.2,
  costActual: 5000,
  costPlanned: 8000,
  costExecuted: 0.625,
  marginActual: 50,
  marginPlanned: 40,
  marginTarget: 30,
  forecastMargin: 40,
  forecastCost: 12000,
};

describe('FinancialKpiCards - Destaque do card Forecast', () => {
  it('aplica fundo vermelho quando forecast está abaixo da meta', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 25, // 25% < meta 30%
      marginTarget: 30,
    });

    const forecastCard = screen.getByText('Forecast · fim do projeto').closest('div');
    expect(forecastCard).toHaveClass('bg-destructive');
    expect(forecastCard).not.toHaveClass('bg-[hsl(var(--brand-slate))]');
  });

  it('mantém fundo petróleo quando forecast está acima da meta', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 35, // 35% >= meta 30%
      marginTarget: 30,
    });

    const forecastCard = screen.getByText('Forecast · fim do projeto').closest('div');
    expect(forecastCard).toHaveClass('bg-[hsl(var(--brand-slate))]');
    expect(forecastCard).not.toHaveClass('bg-destructive');
  });

  it('mantém fundo petróleo quando forecast está igual à meta', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 30, // 30% == meta 30%
      marginTarget: 30,
    });

    const forecastCard = screen.getByText('Forecast · fim do projeto').closest('div');
    expect(forecastCard).toHaveClass('bg-[hsl(var(--brand-slate))]');
    expect(forecastCard).not.toHaveClass('bg-destructive');
  });

  it('mantém fundo petróleo quando meta é zero (sem meta configurada)', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 10, // 10% abaixo de qualquer meta razoável
      marginTarget: 0, // sem meta configurada
    });

    const forecastCard = screen.getByText('Forecast · fim do projeto').closest('div');
    expect(forecastCard).toHaveClass('bg-[hsl(var(--brand-slate))]');
    expect(forecastCard).not.toHaveClass('bg-destructive');
  });

  it('exibe texto "abaixo da meta" quando forecast está abaixo', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 25,
      marginTarget: 30,
    });

    expect(screen.getByText(/abaixo da meta/)).toBeInTheDocument();
    expect(screen.queryByText(/acima da meta/)).not.toBeInTheDocument();
  });

  it('exibe texto "acima da meta ✓" quando forecast está acima', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 35,
      marginTarget: 30,
    });

    expect(screen.getByText(/acima da meta ✓/)).toBeInTheDocument();
  });

  it('aplica cor verde no percentual quando acima da meta', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 35,
      marginTarget: 30,
    });

    const percentSpan = screen.getByText('35%');
    expect(percentSpan).toHaveClass('text-[hsl(var(--green-300))]');
  });

  it('aplica cor branca no percentual quando abaixo da meta', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 25,
      marginTarget: 30,
    });

    const percentSpan = screen.getByText('25%');
    expect(percentSpan).toHaveClass('text-white');
    expect(percentSpan).not.toHaveClass('text-[hsl(var(--green-300))]');
  });
});
