import { describe, expect, it } from 'vitest';
import {
  deriveInstallmentStatus,
  generateInstallmentDrafts,
  installmentQuickAction,
  isNfEmissionDue,
} from '@/lib/installmentStatus';

const today = new Date(2026, 6, 22); // 2026-07-22 (local)

describe('deriveInstallmentStatus — derivação de "Atrasado"', () => {
  it('recebido sempre vence, mesmo com vencimento passado', () => {
    expect(deriveInstallmentStatus({ status: 'received', due_date: '2026-01-01' }, today)).toBe('recebido');
  });

  it('véspera do vencimento (não recebida) NÃO é atrasada', () => {
    expect(deriveInstallmentStatus({ status: 'pending', due_date: '2026-07-23' }, today)).toBe('pendente');
  });

  it('no dia do vencimento NÃO é atrasada', () => {
    expect(deriveInstallmentStatus({ status: 'invoiced', due_date: '2026-07-22' }, today)).toBe('nf_emitida');
  });

  it('depois do vencimento e não recebida é atrasada (mesmo com NF emitida)', () => {
    expect(deriveInstallmentStatus({ status: 'invoiced', due_date: '2026-07-21' }, today)).toBe('atrasado');
    expect(deriveInstallmentStatus({ status: 'pending', due_date: '2026-07-21' }, today)).toBe('atrasado');
  });
});

describe('installmentQuickAction — mapa de ações por status', () => {
  it('pendente → marcar NF emitida', () => {
    expect(installmentQuickAction('pendente')).toBe('mark_invoiced');
  });
  it('nf_emitida e atrasado → registrar recebimento', () => {
    expect(installmentQuickAction('nf_emitida')).toBe('register_payment');
    expect(installmentQuickAction('atrasado')).toBe('register_payment');
  });
  it('recebido → sem ação', () => {
    expect(installmentQuickAction('recebido')).toBe('none');
  });
});

describe('isNfEmissionDue — janela do lembrete de emissão de NF', () => {
  it('abre o lembrete quando hoje ≥ vencimento − antecedência', () => {
    // vencimento 2026-07-27, antecedência 7 → janela abre em 2026-07-20 ≤ hoje
    expect(isNfEmissionDue({ status: 'pending', due_date: '2026-07-27' }, 7, today)).toBe(true);
  });
  it('não abre antes da janela', () => {
    // vencimento 2026-08-10, antecedência 7 → janela abre em 2026-08-03 > hoje
    expect(isNfEmissionDue({ status: 'pending', due_date: '2026-08-10' }, 7, today)).toBe(false);
  });
  it('não vale quando a NF já foi emitida', () => {
    expect(isNfEmissionDue({ status: 'invoiced', due_date: '2026-07-27' }, 7, today)).toBe(false);
  });
  it('parcela vencida vai para o alerta de atraso, não para o lembrete', () => {
    expect(isNfEmissionDue({ status: 'pending', due_date: '2026-07-21' }, 7, today)).toBe(false);
  });
});

describe('generateInstallmentDrafts — divisão de valor e vencimentos mensais', () => {
  it('distribui a sobra de centavos na última parcela e mantém vencimentos mensais', () => {
    const drafts = generateInstallmentDrafts({ totalValue: 1000, count: 3, firstDueDate: '2026-05-05' });
    expect(drafts.map((d) => d.value)).toEqual([333.33, 333.33, 333.34]);
    expect(drafts.map((d) => d.dueDate)).toEqual(['2026-05-05', '2026-06-05', '2026-07-05']);
    expect(drafts.reduce((s, d) => s + d.value, 0)).toBeCloseTo(1000, 2);
  });

  it('sempre gera ao menos 1 parcela', () => {
    expect(generateInstallmentDrafts({ totalValue: 500, count: 0, firstDueDate: '2026-05-05' })).toHaveLength(1);
  });
});
