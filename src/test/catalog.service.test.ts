import { beforeEach, describe, expect, it, vi } from 'vitest';
import { benefitService } from '@/services/benefitService';
import { toolService } from '@/services/toolService';

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockSingle = vi.hoisted(() => vi.fn());
const mockOrder  = vi.hoisted(() => vi.fn());
const mockEq     = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn());
const mockInsert = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockFrom   = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

const NOW = '2026-06-19T13:00:00.000Z';

const benefitRow = {
  id: 'b-1',
  tenant_id: 'tenant-1',
  name: 'Vale Refeição',
  description: 'Cartão Alelo',
  value: 800,
  is_active: true,
  created_at: NOW,
  updated_at: NOW,
};

const toolRow = {
  id: 't-1',
  tenant_id: 'tenant-1',
  name: 'GitHub Copilot',
  description: 'Assistente IA',
  value: 100,
  is_active: true,
  created_at: NOW,
  updated_at: NOW,
};

// Monta o builder encadeado; o último método da cadeia retorna a promise
function makeChain(terminal: () => Promise<unknown>) {
  const chain: Record<string, unknown> = {};
  // cada mock retorna o próprio chain para suportar qualquer encadeamento
  [mockSelect, mockInsert, mockUpdate, mockDelete, mockEq, mockOrder].forEach((m) => {
    m.mockReturnValue(chain);
  });
  // o terminal (single ou order) resolve a promise
  mockSingle.mockImplementation(terminal);
  mockOrder.mockImplementation(terminal);
  Object.assign(chain, {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
  });
  mockFrom.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── benefitService ────────────────────────────────────────────────────────────

describe('benefitService.getAll', () => {
  it('retorna lista de benefits', async () => {
    makeChain(() => Promise.resolve({ data: [benefitRow], error: null }));
    const result = await benefitService.getAll('tenant-1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Vale Refeição');
    expect(mockFrom).toHaveBeenCalledWith('benefits');
  });

  it('retorna array vazio quando data é null', async () => {
    makeChain(() => Promise.resolve({ data: null, error: null }));
    const result = await benefitService.getAll('tenant-1');
    expect(result).toEqual([]);
  });

  it('lança erro do supabase', async () => {
    makeChain(() => Promise.resolve({ data: null, error: { message: 'DB error', code: 'PGRST200' } }));
    await expect(benefitService.getAll('tenant-1')).rejects.toMatchObject({ message: 'DB error' });
  });
});

describe('benefitService.create', () => {
  it('cria e retorna o benefit', async () => {
    makeChain(() => Promise.resolve({ data: benefitRow, error: null }));
    const result = await benefitService.create({ name: 'Vale Refeição', value: 800 }, 'tenant-1');
    expect(result.name).toBe('Vale Refeição');
    expect(mockFrom).toHaveBeenCalledWith('benefits');
  });

  it('lança mensagem amigável em duplicidade (23505)', async () => {
    makeChain(() => Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate' } }));
    await expect(
      benefitService.create({ name: 'Vale Refeição', value: 800 }, 'tenant-1')
    ).rejects.toThrow('Já existe um benefício com este nome.');
  });

  it('lança outros erros sem tradução', async () => {
    makeChain(() => Promise.resolve({ data: null, error: { code: '42501', message: 'permission denied' } }));
    await expect(
      benefitService.create({ name: 'X', value: 0 }, 'tenant-1')
    ).rejects.toMatchObject({ code: '42501' });
  });
});

describe('benefitService.update', () => {
  it('atualiza e retorna o benefit', async () => {
    const updated = { ...benefitRow, name: 'VR Novo' };
    makeChain(() => Promise.resolve({ data: updated, error: null }));
    const result = await benefitService.update('b-1', { name: 'VR Novo' });
    expect(result.name).toBe('VR Novo');
  });

  it('lança mensagem amigável em duplicidade', async () => {
    makeChain(() => Promise.resolve({ data: null, error: { code: '23505', message: 'dup' } }));
    await expect(benefitService.update('b-1', { name: 'X' })).rejects.toThrow(
      'Já existe um benefício com este nome.'
    );
  });
});

describe('benefitService.toggleActive', () => {
  it('ativa o benefit', async () => {
    makeChain(() => Promise.resolve({ data: { ...benefitRow, is_active: true }, error: null }));
    const result = await benefitService.toggleActive('b-1', true);
    expect(result.is_active).toBe(true);
  });

  it('desativa o benefit', async () => {
    makeChain(() => Promise.resolve({ data: { ...benefitRow, is_active: false }, error: null }));
    const result = await benefitService.toggleActive('b-1', false);
    expect(result.is_active).toBe(false);
  });
});

describe('benefitService.delete', () => {
  // Para delete, a chain termina em .eq() — não em .single()/.order()
  // então mockEq precisa retornar a Promise diretamente nesses testes

  it('deleta sem retornar dados', async () => {
    makeChain(() => Promise.resolve({ error: null }));
    mockEq.mockReturnValueOnce(Promise.resolve({ error: null }));
    await expect(benefitService.delete('b-1')).resolves.toBeUndefined();
  });

  it('lança erro ao deletar', async () => {
    makeChain(() => Promise.resolve({ error: null }));
    mockEq.mockReturnValueOnce(
      Promise.resolve({ error: { message: 'not found', code: 'PGRST116' } })
    );
    await expect(benefitService.delete('b-1')).rejects.toMatchObject({ message: 'not found' });
  });
});

// ── toolService ───────────────────────────────────────────────────────────────

describe('toolService.getAll', () => {
  it('retorna lista de tools', async () => {
    makeChain(() => Promise.resolve({ data: [toolRow], error: null }));
    const result = await toolService.getAll('tenant-1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('GitHub Copilot');
    expect(mockFrom).toHaveBeenCalledWith('tools');
  });

  it('retorna array vazio quando data é null', async () => {
    makeChain(() => Promise.resolve({ data: null, error: null }));
    const result = await toolService.getAll('tenant-1');
    expect(result).toEqual([]);
  });

  it('lança erro do supabase', async () => {
    makeChain(() => Promise.resolve({ data: null, error: { message: 'DB error', code: 'PGRST200' } }));
    await expect(toolService.getAll('tenant-1')).rejects.toMatchObject({ message: 'DB error' });
  });
});

describe('toolService.create', () => {
  it('cria e retorna a tool', async () => {
    makeChain(() => Promise.resolve({ data: toolRow, error: null }));
    const result = await toolService.create({ name: 'GitHub Copilot', value: 100 }, 'tenant-1');
    expect(result.name).toBe('GitHub Copilot');
  });

  it('lança mensagem amigável em duplicidade (23505)', async () => {
    makeChain(() => Promise.resolve({ data: null, error: { code: '23505', message: 'dup' } }));
    await expect(
      toolService.create({ name: 'GitHub Copilot', value: 100 }, 'tenant-1')
    ).rejects.toThrow('Já existe uma ferramenta com este nome.');
  });
});

describe('toolService.update', () => {
  it('atualiza e retorna a tool', async () => {
    const updated = { ...toolRow, value: 120 };
    makeChain(() => Promise.resolve({ data: updated, error: null }));
    const result = await toolService.update('t-1', { value: 120 });
    expect(result.value).toBe(120);
  });
});

describe('toolService.toggleActive', () => {
  it('desativa a tool', async () => {
    makeChain(() => Promise.resolve({ data: { ...toolRow, is_active: false }, error: null }));
    const result = await toolService.toggleActive('t-1', false);
    expect(result.is_active).toBe(false);
  });
});

describe('toolService.delete', () => {
  it('deleta sem retornar dados', async () => {
    makeChain(() => Promise.resolve({ error: null }));
    await expect(toolService.delete('t-1')).resolves.toBeUndefined();
  });
});
