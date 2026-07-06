import { describe, expect, it } from 'vitest';
import { dbToBenefit } from '@/types/benefit';
import { dbToTool } from '@/types/tool';
import type { BenefitDB } from '@/types/benefit';
import type { ToolDB } from '@/types/tool';

const NOW = '2026-06-19T13:00:00.000Z';

const benefitDB: BenefitDB = {
  id: 'b-1',
  tenant_id: 'tenant-1',
  name: 'Vale Refeição',
  description: 'Cartão Alelo',
  value: 800,
  is_active: true,
  created_at: NOW,
  updated_at: NOW,
};

const toolDB: ToolDB = {
  id: 't-1',
  tenant_id: 'tenant-1',
  name: 'GitHub Copilot',
  description: 'Assistente IA',
  value: 100,
  is_active: true,
  created_at: NOW,
  updated_at: NOW,
};

describe('dbToBenefit', () => {
  it('mapeia todos os campos corretamente', () => {
    const result = dbToBenefit(benefitDB);
    expect(result.id).toBe('b-1');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.name).toBe('Vale Refeição');
    expect(result.description).toBe('Cartão Alelo');
    expect(result.value).toBe(800);
    expect(result.isActive).toBe(true);
    expect(result.createdAt).toBe(NOW);
    expect(result.updatedAt).toBe(NOW);
  });

  it('mapeia is_active false para isActive false', () => {
    const result = dbToBenefit({ ...benefitDB, is_active: false });
    expect(result.isActive).toBe(false);
  });

  it('preserva description null', () => {
    const result = dbToBenefit({ ...benefitDB, description: null });
    expect(result.description).toBeNull();
  });

  it('preserva value zero', () => {
    const result = dbToBenefit({ ...benefitDB, value: 0 });
    expect(result.value).toBe(0);
  });
});

describe('dbToTool', () => {
  it('mapeia todos os campos corretamente', () => {
    const result = dbToTool(toolDB);
    expect(result.id).toBe('t-1');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.name).toBe('GitHub Copilot');
    expect(result.description).toBe('Assistente IA');
    expect(result.value).toBe(100);
    expect(result.isActive).toBe(true);
    expect(result.createdAt).toBe(NOW);
    expect(result.updatedAt).toBe(NOW);
  });

  it('mapeia is_active false para isActive false', () => {
    const result = dbToTool({ ...toolDB, is_active: false });
    expect(result.isActive).toBe(false);
  });

  it('preserva description null', () => {
    const result = dbToTool({ ...toolDB, description: null });
    expect(result.description).toBeNull();
  });

  it('preserva value decimal', () => {
    const result = dbToTool({ ...toolDB, value: 89.9 });
    expect(result.value).toBe(89.9);
  });
});
