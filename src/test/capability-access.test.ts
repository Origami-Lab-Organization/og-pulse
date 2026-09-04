import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAPABILITY_KEYS, hasAnyCapability } from '@/lib/access/capabilities';

describe('hasAnyCapability', () => {
  const granted = new Set(['financeiro:ler', 'pipeline:ler']);

  it('sem exigência, todo mundo passa', () => {
    expect(hasAnyCapability(granted)).toBe(true);
    expect(hasAnyCapability([], undefined)).toBe(true);
  });

  it('exigência única: tem ou não tem', () => {
    expect(hasAnyCapability(granted, 'financeiro:ler')).toBe(true);
    expect(hasAnyCapability(granted, 'folha:ler')).toBe(false);
  });

  it('lista: qualquer uma basta', () => {
    expect(hasAnyCapability(granted, ['folha:ler', 'pipeline:ler'])).toBe(true);
    expect(hasAnyCapability(granted, ['folha:ler', 'okr:editar'])).toBe(false);
    expect(hasAnyCapability(granted, [])).toBe(false);
  });

  it('aceita array como conjunto concedido', () => {
    expect(hasAnyCapability(['cliente:ler'], 'cliente:ler')).toBe(true);
    expect(hasAnyCapability([], 'cliente:ler')).toBe(false);
  });
});

describe('CAPABILITY_KEYS espelha o vocabulário seeded por migration', () => {
  // Se alguém criar capacidade nova só no banco, ou digitar errado aqui, este teste aponta.
  const dir = join(process.cwd(), 'supabase', 'migrations');
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n');

  it.each(CAPABILITY_KEYS)('%s existe em alguma migration', (key) => {
    expect(sql).toContain(`'${key}'`);
  });

  it('não tem chave duplicada', () => {
    expect(new Set(CAPABILITY_KEYS).size).toBe(CAPABILITY_KEYS.length);
  });
});
