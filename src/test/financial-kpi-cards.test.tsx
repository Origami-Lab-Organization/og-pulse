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

  it('aplica cor destructive-foreground no percentual quando abaixo da meta', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 25,
      marginTarget: 30,
    });

    const percentSpan = screen.getByText('25%');
    expect(percentSpan).toHaveClass('text-destructive-foreground');
    expect(percentSpan).not.toHaveClass('text-[hsl(var(--green-300))]');
  });
});

describe('FinancialKpiCards - Cenário sem custo planejado', () => {
  it('exibe "—" quando não há custo planejado (hasCostPlanned=false)', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 100, // seria 100% sem custo
      hasCostPlanned: false,
    });

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
  });

  it('exibe "sem custo planejado" na descrição quando hasCostPlanned=false', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 100,
      hasCostPlanned: false,
    });

    expect(screen.getByText('sem custo planejado')).toBeInTheDocument();
    expect(screen.queryByText(/margem projetada/)).not.toBeInTheDocument();
  });

  it('exibe "sem dados para projeção" no rodapé quando hasCostPlanned=false', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 100,
      hasCostPlanned: false,
    });

    expect(screen.getByText('sem dados para projeção')).toBeInTheDocument();
    expect(screen.queryByText(/acima da meta/)).not.toBeInTheDocument();
    expect(screen.queryByText(/abaixo da meta/)).not.toBeInTheDocument();
  });

  it('mantém fundo petróleo quando não há custo planejado (não mostra vermelho)', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 100,
      marginTarget: 30, // mesmo com meta definida
      hasCostPlanned: false,
    });

    const forecastCard = screen.getByText('Forecast · fim do projeto').closest('div');
    expect(forecastCard).toHaveClass('bg-[hsl(var(--brand-slate))]');
    expect(forecastCard).not.toHaveClass('bg-destructive');
  });

  it('aplica cor opaca (text-white/70) no "—" quando hasCostPlanned=false', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 100,
      hasCostPlanned: false,
    });

    const dashSpan = screen.getByText('—');
    expect(dashSpan).toHaveClass('text-white/70');
  });

  it('exibe percentual normalmente quando hasCostPlanned=true (comportamento padrão)', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 35,
      marginTarget: 30,
      hasCostPlanned: true,
    });

    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.getByText(/acima da meta ✓/)).toBeInTheDocument();
  });

  it('aplica fundo vermelho normalmente com custo planejado e margem abaixo da meta', () => {
    renderWithProviders({
      ...baseProps,
      forecastMargin: 25,
      marginTarget: 30,
      hasCostPlanned: true,
    });

    const forecastCard = screen.getByText('Forecast · fim do projeto').closest('div');
    expect(forecastCard).toHaveClass('bg-destructive');
    expect(screen.getByText(/abaixo da meta/)).toBeInTheDocument();
  });
});
