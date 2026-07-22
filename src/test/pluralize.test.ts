import { describe, expect, it } from 'vitest';
import { alteracoesLabel, pluralize } from '@/lib/pluralize';

describe('pluralize (pt-BR) — botão de salvar (item 3.3)', () => {
  it('1 → singular flexionado', () => {
    expect(alteracoesLabel(1)).toBe('1 alteração');
  });
  it('N > 1 → plural flexionado (nunca "alteraçãoões")', () => {
    expect(alteracoesLabel(2)).toBe('2 alterações');
    expect(alteracoesLabel(13)).toBe('13 alterações');
  });
  it('0 → plural', () => {
    expect(alteracoesLabel(0)).toBe('0 alterações');
  });
  it('helper genérico respeita singular/plural', () => {
    expect(pluralize(1, 'projeto', 'projetos')).toBe('1 projeto');
    expect(pluralize(3, 'projeto', 'projetos')).toBe('3 projetos');
  });
});
