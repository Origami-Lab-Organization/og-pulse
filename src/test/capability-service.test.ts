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

  it('sucesso não retenta', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    await expect(fetchMyCapabilities('t-1')).resolves.toEqual([]);
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it('falha transitória é coberta pela segunda tentativa', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: null, error: { message: 'fetch failed' } })
      .mockResolvedValueOnce({ data: ['financeiro:ler'], error: null });
    await expect(fetchMyCapabilities('t-1')).resolves.toEqual(['financeiro:ler']);
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });

  // `null`, e não `[]`: quem chama precisa distinguir "não consegui confirmar" de
  // "confirmei que não tem nenhuma". Tratar as duas como iguais foi o que escondeu as
  // abas de um admin no deploy de PUL-206.
  it('erro nas duas tentativas devolve null, com log, sem lançar', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    await expect(fetchMyCapabilities('t-1')).resolves.toBeNull();
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalled();
  });

  it('ignora o que não for string e resposta sem lista', async () => {
    rpcMock.mockResolvedValue({ data: ['ok:sim', 42, null], error: null });
    await expect(fetchMyCapabilities('t-1')).resolves.toEqual(['ok:sim']);
    rpcMock.mockResolvedValue({ data: { x: 1 }, error: null });
    await expect(fetchMyCapabilities('t-1')).resolves.toEqual([]);
  });
});
