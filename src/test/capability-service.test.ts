import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: rpcMock } }));

import { fetchMyCapabilities } from '@/services/capabilityService';

describe('fetchMyCapabilities', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('chama my_capabilities com o tenant e devolve as chaves', async () => {
    rpcMock.mockResolvedValue({ data: ['financeiro:ler', 'pipeline:ler'], error: null });
    await expect(fetchMyCapabilities('t-1')).resolves.toEqual(['financeiro:ler', 'pipeline:ler']);
    expect(rpcMock).toHaveBeenCalledWith('my_capabilities', { _tenant_id: 't-1' });
  });

  it('erro do banco vira lista vazia (tela conservadora), com log', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    await expect(fetchMyCapabilities('t-1')).resolves.toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it('ignora o que não for string e resposta sem lista', async () => {
    rpcMock.mockResolvedValue({ data: ['ok:sim', 42, null], error: null });
    await expect(fetchMyCapabilities('t-1')).resolves.toEqual(['ok:sim']);
    rpcMock.mockResolvedValue({ data: { x: 1 }, error: null });
    await expect(fetchMyCapabilities('t-1')).resolves.toEqual([]);
  });
});
