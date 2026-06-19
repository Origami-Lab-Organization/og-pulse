import { describe, expect, it } from 'vitest';
import {
  calculateCloseBusinessTotal,
  createInstallmentSchedule,
  distributeInstallmentsEqually,
  getNextRecurringCharges,
  resizeInstallmentSchedule,
} from '@/lib/closeBusinessFinancials';

describe('close business financials', () => {
  it('distribui parcelas igualmente e deixa a sobra de centavos na ultima parcela', () => {
    const schedule = createInstallmentSchedule({
      totalValue: 1000,
      installmentsCount: 6,
      firstInvoiceDate: '2026-01-10',
      dueDay: 10,
    });

    expect(schedule.map((installment) => installment.value)).toEqual([
      166.66,
      166.66,
      166.66,
      166.66,
      166.66,
      166.7,
    ]);
    expect(calculateCloseBusinessTotal({ projectType: 'fixed_scope', installments: schedule })).toBe(1000);
  });

  it('preserva valores manuais ate o usuario clicar em distribuir novamente', () => {
    const manualSchedule = [
      { installmentNumber: 1, invoiceDate: '2026-01-01', dueDate: '2026-01-10', value: 400 },
      { installmentNumber: 2, invoiceDate: '2026-02-01', dueDate: '2026-02-10', value: 600 },
    ];

    expect(calculateCloseBusinessTotal({ projectType: 'fixed_scope', installments: manualSchedule })).toBe(1000);

    const redistributed = distributeInstallmentsEqually(1000, manualSchedule);
    expect(redistributed.map((installment) => installment.value)).toEqual([500, 500]);
  });

  it('alterar quantidade de parcelas nao redistribui valores automaticamente', () => {
    const schedule = createInstallmentSchedule({
      totalValue: 1000,
      installmentsCount: 2,
      firstInvoiceDate: '2026-01-01',
      dueDay: 10,
    });

    const resized = resizeInstallmentSchedule({
      installments: schedule,
      installmentsCount: 3,
      firstInvoiceDate: '2026-01-01',
      dueDay: 10,
    });

    expect(resized.map((installment) => installment.value)).toEqual([500, 500, 0]);
    expect(calculateCloseBusinessTotal({ projectType: 'fixed_scope', installments: resized })).toBe(1000);
  });

  it('calcula valor de referencia por modelo financeiro', () => {
    expect(calculateCloseBusinessTotal({ projectType: 'continuous', monthlyValue: 2500 })).toBe(2500);
    expect(calculateCloseBusinessTotal({ projectType: 'success_fee', totalValue: 100000, successFeePercent: 12.5 })).toBe(12500);
    expect(calculateCloseBusinessTotal({ projectType: 'non_revenue', totalValue: 100000 })).toBe(0);
  });

  it('gera os proximos 3 meses de cobranca recorrente', () => {
    const charges = getNextRecurringCharges({
      firstInvoiceDate: '2026-01-15',
      dueDay: 31,
      monthlyValue: 1200,
    });

    expect(charges).toHaveLength(3);
    expect(charges.map((charge) => charge.dueDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    expect(charges.every((charge) => charge.value === 1200)).toBe(true);
  });
});
