import { describe, expect, it } from 'vitest';
import { personInitials } from '@/lib/formatters';

describe('personInitials', () => {
  it('usa primeiro nome e último sobrenome', () => {
    expect(personInitials('Lucas Daniel Couto')).toBe('LC');
    expect(personInitials('Maria Cecilia Coelho')).toBe('MC');
    expect(personInitials('Aline Ferreira Almeida')).toBe('AA');
  });

  it('nome com dois termos', () => {
    expect(personInitials('Lucas Couto')).toBe('LC');
  });

  it('ignora espaços sobrando', () => {
    expect(personInitials('  lucas   couto ')).toBe('LC');
  });

  it('uma palavra só vira as duas primeiras letras; vazio vira "?"', () => {
    expect(personInitials('Lucas')).toBe('LU');
    expect(personInitials('   ')).toBe('?');
  });
});
