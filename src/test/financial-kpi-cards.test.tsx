import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FinancialKpiCards } from '@/components/projects/detail/financial/FinancialKpiCards';
import { HideValuesProvider } from '@/contexts/HideValuesContext';

// Regras do card de forecast: US-0032 (decisões de 23/11/2026).

function renderWithProviders(props: Parameters<typeof FinancialKpiCards>[0], hide = false) {
  return render(
    <HideValuesProvider value={hide}>
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

const forecastCard = () => screen.getByText('Forecast · fim do projeto').closest('div');

describe('FinancialKpiCards - faixas do forecast (meta 30%: amarelo de 27% a 30%)', () => {
  it('fica verde (petróleo) com o forecast acima da meta', () => {
    renderWithProviders({ ...baseProps, forecastMargin: 35 });

    expect(forecastCard()).toHaveClass('bg-[hsl(var(--brand-slate))]');
    expect(screen.getByText('35%')).toHaveClass('text-[hsl(var(--green-300))]');
    expect(screen.getByText(/na meta ou acima/)).toBeInTheDocument();
  });

  it('fica verde com o forecast igual à meta', () => {
    renderWithProviders({ ...baseProps, forecastMargin: 30 });

    expect(forecastCard()).toHaveClass('bg-[hsl(var(--brand-slate))]');
    expect(forecastCard()).not.toHaveClass('bg-warning');
  });

  it('fica amarelo com o forecast até 10% da meta abaixo dela', () => {
    renderWithProviders({ ...baseProps, forecastMargin: 28 });

    expect(forecastCard()).toHaveClass('bg-warning');
    expect(forecastCard()).not.toHaveClass('bg-destructive');
    expect(screen.getByText('28%')).toHaveClass('text-warning-foreground');
    expect(screen.getByText(/até 10% abaixo da meta/)).toBeInTheDocument();
  });

  it('fica amarelo exatamente no limite de 10% da meta', () => {
    renderWithProviders({ ...baseProps, forecastMargin: 27 });

    expect(forecastCard()).toHaveClass('bg-warning');
  });

  it('fica vermelho com o forecast mais de 10% da meta abaixo dela', () => {
    renderWithProviders({ ...baseProps, forecastMargin: 26.9 });

    expect(forecastCard()).toHaveClass('bg-destructive');
    expect(forecastCard()).not.toHaveClass('bg-warning');
  });

  it('mostra "mais de 10% abaixo da meta" na faixa vermelha', () => {
    renderWithProviders({ ...baseProps, forecastMargin: 20 });

    expect(screen.getByText('20%')).toHaveClass('text-destructive-foreground');
    expect(screen.getByText(/mais de 10% abaixo da meta/)).toBeInTheDocument();
  });

  it('fica neutro sem meta configurada', () => {
    renderWithProviders({ ...baseProps, forecastMargin: 10, marginTarget: 0 });

    expect(forecastCard()).toHaveClass('bg-[hsl(var(--brand-slate))]');
    expect(forecastCard()).not.toHaveClass('bg-destructive');
    expect(forecastCard()).not.toHaveClass('bg-warning');
    expect(screen.getByText('sem meta de margem definida')).toBeInTheDocument();
  });
});

describe('FinancialKpiCards - plano abaixo da meta', () => {
  it('fica verde com aviso escrito quando o forecast está na meta e o plano abaixo', () => {
    renderWithProviders({ ...baseProps, marginPlanned: 21, marginTarget: 55, forecastMargin: 60 });

    expect(forecastCard()).toHaveClass('bg-[hsl(var(--brand-slate))]');
    expect(forecastCard()).not.toHaveClass('bg-destructive');
    expect(screen.getByText('Plano abaixo da meta (21%)')).toBeInTheDocument();
  });

  it('não mostra o aviso quando o plano está na meta', () => {
    renderWithProviders({ ...baseProps, marginPlanned: 60, marginTarget: 55, forecastMargin: 60 });

    expect(screen.queryByText(/Plano abaixo da meta/)).not.toBeInTheDocument();
  });

  it('não mostra o aviso quando o forecast já está fora da meta (a cor já avisa)', () => {
    // meta 55% → amarelo de 49,5% a 55%
    renderWithProviders({ ...baseProps, marginPlanned: 21, marginTarget: 55, forecastMargin: 50 });

    expect(forecastCard()).toHaveClass('bg-warning');
    expect(screen.queryByText(/Plano abaixo da meta/)).not.toBeInTheDocument();
  });
});

describe('FinancialKpiCards - texto do card', () => {
  it('informa "Projeto encerrado" depois da data de fim', () => {
    renderWithProviders({ ...baseProps, projectEnded: true });

    expect(screen.getByText('Projeto encerrado')).toBeInTheDocument();
  });

  it('não informa "Projeto encerrado" com o projeto em andamento', () => {
    renderWithProviders({ ...baseProps, projectEnded: false });

    expect(screen.queryByText('Projeto encerrado')).not.toBeInTheDocument();
  });

  it('não repete valores de custo nem usa jargão', () => {
    renderWithProviders({ ...baseProps, forecastCost: 12000 });

    expect(screen.queryByText(/Custo final estimado/)).not.toBeInTheDocument();
    expect(screen.queryByText(/EAC/)).not.toBeInTheDocument();
    expect(screen.queryByText(/burn-rate/)).not.toBeInTheDocument();
    expect(forecastCard()).not.toHaveTextContent('R$');
  });

  it('mostra a meta com a faixa', () => {
    renderWithProviders({ ...baseProps, forecastMargin: 35 });

    expect(screen.getByText(/meta 30% · na meta ou acima/)).toBeInTheDocument();
  });

  it('oculta percentuais com "ocultar valores"', () => {
    renderWithProviders({ ...baseProps, marginPlanned: 21, marginTarget: 55, forecastMargin: 60 }, true);

    expect(screen.queryByText('60%')).not.toBeInTheDocument();
    expect(screen.getByText(/meta ••• ·/)).toBeInTheDocument();
    expect(screen.getByText('Plano abaixo da meta (•••)')).toBeInTheDocument();
  });
});

describe('FinancialKpiCards - sem custo planejado', () => {
  it('mostra "—" no lugar do percentual', () => {
    renderWithProviders({ ...baseProps, forecastMargin: 100, hasCostPlanned: false });

    expect(screen.getByText('—')).toHaveClass('text-white/70');
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
  });

  it('explica que não há custo planejado para projetar', () => {
    renderWithProviders({ ...baseProps, forecastMargin: 100, hasCostPlanned: false });

    expect(screen.getByText('sem custo planejado para projetar')).toBeInTheDocument();
    expect(screen.queryByText(/margem projetada/)).not.toBeInTheDocument();
  });

  it('fica neutro e não mostra faixa nem "Projeto encerrado"', () => {
    renderWithProviders({ ...baseProps, forecastMargin: 10, marginTarget: 30, hasCostPlanned: false, projectEnded: true });

    expect(forecastCard()).toHaveClass('bg-[hsl(var(--brand-slate))]');
    expect(screen.queryByText(/abaixo da meta/)).not.toBeInTheDocument();
    expect(screen.queryByText('Projeto encerrado')).not.toBeInTheDocument();
  });
});
