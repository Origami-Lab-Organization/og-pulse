import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dbToEmployee } from '@/hooks/useEmployees';

// ── Supabase mock (mesmo padrão de catalog.service.test.ts) ──────────────────

const mockSingle = vi.hoisted(() => vi.fn());
const mockOrder  = vi.hoisted(() => vi.fn());
const mockEq     = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockFrom   = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeChain(terminal: () => Promise<unknown>): any {
  const chain: Record<string, unknown> = {};
  [mockSelect, mockUpdate, mockEq, mockOrder].forEach((m) => m.mockReturnValue(chain));
  mockSingle.mockImplementation(terminal);
  mockOrder.mockImplementation(terminal);
  Object.assign(chain, {
    select: mockSelect,
    update: mockUpdate,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
  });
  mockFrom.mockReturnValue(chain);
  return chain;
}

beforeEach(() => vi.clearAllMocks());

// ── Base mínimo de EmployeeDB para uso nos testes ────────────────────────────

const NOW = '2026-06-19T14:00:00.000Z';

const baseEmployeeDB = {
  id: 'emp-1',
  nome: 'Ana Lima',
  email: 'ana@empresa.com',
  telefone: '11999999999',
  cargo: 'Desenvolvedora',
  cpf: '12345678901',
  data_admissao: '2024-01-01',
  is_gerente: false,
  system_role: 'user',
  status: 'ativo',
  salario_mensal: 8000,
  beneficios: 500,
  encargos: 1200,
  tipo_contratacao: 'CLT',
  jornada_mensal: 176,
  jornada_diaria: 8,
  salario_liquido: 6000,
  fgts: 640,
  inss_empresa: 1600,
  decimo_terceiro: 667,
  ferias: 889,
  pro_labore: 0,
  bolsa_auxilio: 0,
  valor_contrato_pj: 0,
  dividendos: 0,
  provisao_13: 667,
  provisao_ferias: 889,
  provisao_recesso: 0,
  total_monthly_cost_estimated: 11000,
  total_annual_cost_estimated: 132000,
  breakdown_json: null,
  data_nascimento: '1990-05-15',
  foto_url: null,
  tenant_id: 'tenant-1',
  auth_id: 'auth-1',
  must_change_password: false,
  termination_id: null,
  created_at: NOW,
  updated_at: NOW,
  // Campos bancários novos
  pix_key_type: null,
  pix_key: null,
  bank_name: null,
  bank_agency: null,
  bank_account: null,
  bank_account_type: null,
};

// ── dbToEmployee — campos bancários ─────────────────────────────────────────

describe('dbToEmployee — campos bancários/PIX', () => {
  it('mapeia todos os campos nulos quando não preenchidos', () => {
    const result = dbToEmployee(baseEmployeeDB);
    expect(result.pixKeyType).toBeNull();
    expect(result.pixKey).toBeNull();
    expect(result.bankName).toBeNull();
    expect(result.bankAgency).toBeNull();
    expect(result.bankAccount).toBeNull();
    expect(result.bankAccountType).toBeNull();
  });

  it('mapeia chave PIX completa', () => {
    const db = { ...baseEmployeeDB, pix_key_type: 'cpf', pix_key: '12345678901' };
    const result = dbToEmployee(db);
    expect(result.pixKeyType).toBe('cpf');
    expect(result.pixKey).toBe('12345678901');
  });

  it('mapeia chave PIX do tipo email', () => {
    const db = { ...baseEmployeeDB, pix_key_type: 'email', pix_key: 'ana@empresa.com' };
    const result = dbToEmployee(db);
    expect(result.pixKeyType).toBe('email');
    expect(result.pixKey).toBe('ana@empresa.com');
  });

  it('mapeia chave PIX aleatória', () => {
    const db = { ...baseEmployeeDB, pix_key_type: 'aleatoria', pix_key: 'abc123-uuid' };
    const result = dbToEmployee(db);
    expect(result.pixKeyType).toBe('aleatoria');
    expect(result.pixKey).toBe('abc123-uuid');
  });

  it('mapeia dados bancários completos', () => {
    const db = {
      ...baseEmployeeDB,
      bank_name: 'Nubank',
      bank_agency: '0001',
      bank_account: '12345-6',
      bank_account_type: 'corrente',
    };
    const result = dbToEmployee(db);
    expect(result.bankName).toBe('Nubank');
    expect(result.bankAgency).toBe('0001');
    expect(result.bankAccount).toBe('12345-6');
    expect(result.bankAccountType).toBe('corrente');
  });

  it('mapeia conta poupança', () => {
    const db = { ...baseEmployeeDB, bank_account_type: 'poupanca' };
    const result = dbToEmployee(db);
    expect(result.bankAccountType).toBe('poupanca');
  });

  it('preserva demais campos ao adicionar dados bancários', () => {
    const db = { ...baseEmployeeDB, pix_key_type: 'telefone', pix_key: '11999999999' };
    const result = dbToEmployee(db);
    expect(result.nome).toBe('Ana Lima');
    expect(result.salarioMensal).toBe(8000);
    expect(result.tipoContratacao).toBe('CLT');
  });
});

// ── employeeService.update — mapeamento dos campos bancários ─────────────────

describe('employeeService.update — campos bancários/PIX', () => {
  it('envia pix_key_type e pix_key para o banco', async () => {
    const { employeeService } = await import('@/services/employeeService');
    makeChain(() => Promise.resolve({
      data: { ...baseEmployeeDB, pix_key_type: 'cpf', pix_key: '12345678901' },
      error: null,
    }));

    await employeeService.update('emp-1', { pixKeyType: 'cpf', pixKey: '12345678901' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ pix_key_type: 'cpf', pix_key: '12345678901' })
    );
  });

  it('envia dados bancários completos para o banco', async () => {
    const { employeeService } = await import('@/services/employeeService');
    makeChain(() => Promise.resolve({
      data: { ...baseEmployeeDB, bank_name: 'Itaú', bank_agency: '1234', bank_account: '56789-0', bank_account_type: 'corrente' },
      error: null,
    }));

    await employeeService.update('emp-1', {
      bankName: 'Itaú',
      bankAgency: '1234',
      bankAccount: '56789-0',
      bankAccountType: 'corrente',
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        bank_name: 'Itaú',
        bank_agency: '1234',
        bank_account: '56789-0',
        bank_account_type: 'corrente',
      })
    );
  });

  it('permite limpar chave PIX enviando null', async () => {
    const { employeeService } = await import('@/services/employeeService');
    makeChain(() => Promise.resolve({ data: baseEmployeeDB, error: null }));

    await employeeService.update('emp-1', { pixKeyType: null, pixKey: null });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ pix_key_type: null, pix_key: null })
    );
  });

  it('não inclui campos bancários quando não fornecidos', async () => {
    const { employeeService } = await import('@/services/employeeService');
    makeChain(() => Promise.resolve({ data: baseEmployeeDB, error: null }));

    await employeeService.update('emp-1', { nome: 'Ana Lima Atualizada' });

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall).not.toHaveProperty('pix_key_type');
    expect(updateCall).not.toHaveProperty('pix_key');
    expect(updateCall).not.toHaveProperty('bank_name');
  });
});
