import { describe, expect, it } from 'vitest';
import {
  LEGACY_ROLE_CAPABILITY,
  deriveLegacyRoleFlags,
  resolveCapabilities,
} from '@/lib/access/capabilities';

/**
 * Regra de negócio sob teste: falha ao consultar capacidade NÃO é ausência de
 * capacidade. Foi a confusão entre as duas que fez um admin ver duas abas num projeto
 * durante o deploy de PUL-206.
 */
describe('resolveCapabilities', () => {
  it('conjunto vindo do banco é confirmado, mesmo vazio', () => {
    expect(resolveCapabilities(['projeto:ler'])).toEqual({
      capabilities: ['projeto:ler'],
      confirmed: true,
    });
    expect(resolveCapabilities([], ['projeto:editar'])).toEqual({
      capabilities: [],
      confirmed: true,
    });
  });

  it('falha cai no último conjunto conhecido e marca como não confirmado', () => {
    expect(resolveCapabilities(null, ['projeto:editar', 'pessoa:editar-papel'])).toEqual({
      capabilities: ['projeto:editar', 'pessoa:editar-papel'],
      confirmed: false,
    });
  });

  it('falha sem histórico devolve vazio, e ainda assim não confirmado', () => {
    expect(resolveCapabilities(null)).toEqual({ capabilities: [], confirmed: false });
    expect(resolveCapabilities(null, [])).toEqual({ capabilities: [], confirmed: false });
  });

  it('não devolve a mesma referência do histórico', () => {
    const anterior = ['projeto:editar'];
    const { capabilities } = resolveCapabilities(null, anterior);
    capabilities.push('pessoa:editar-papel');
    expect(anterior).toEqual(['projeto:editar']);
  });
});

describe('deriveLegacyRoleFlags', () => {
  it('cada flag vem da capacidade equivalente ao papel antigo', () => {
    expect(deriveLegacyRoleFlags([LEGACY_ROLE_CAPABILITY.isAdmin])).toEqual({
      isAdmin: true,
      isManager: false,
      isRH: false,
    });
    expect(deriveLegacyRoleFlags([LEGACY_ROLE_CAPABILITY.isManager])).toEqual({
      isAdmin: false,
      isManager: true,
      isRH: false,
    });
    expect(deriveLegacyRoleFlags([LEGACY_ROLE_CAPABILITY.isRH])).toEqual({
      isAdmin: false,
      isManager: false,
      isRH: true,
    });
  });

  it('sem capacidade, nenhuma flag — e é por isso que a origem do vazio importa', () => {
    expect(deriveLegacyRoleFlags([])).toEqual({
      isAdmin: false,
      isManager: false,
      isRH: false,
    });
  });
});
