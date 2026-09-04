import { describe, expect, it } from 'vitest';
import {
  NAV_SECTIONS,
  canFromCapabilities,
  getActiveTabs,
  isSectionVisible,
  visibleTabs,
} from '@/components/layout/nav-config';

// Conjuntos do seed (capability-matrix): o que cada papel tem hoje. A navegação por
// capacidade tem de reproduzir exatamente a navegação por papel do dia 0.
const GERENTE = canFromCapabilities([
  'pipeline:ler', 'portfolio:ler', 'alocacao:ler', 'timesheet-terceiro:ler', 'financeiro:ler',
  'pessoa:ler-ficha-completa', 'catalogo:editar', 'cliente:ler',
]);
const RH = canFromCapabilities(['ponto:auditar', 'ponto:ler-relatorio', 'vaga:editar', 'candidatura:ler', 'catalogo:ler']);
const COLABORADOR = canFromCapabilities(['catalogo:ler', 'projeto:ler', 'timesheet-proprio:apontar']);

const section = (label: string) => NAV_SECTIONS.find((s) => s.label === label)!;

describe('navegação superior por capacidade', () => {
  it('Início é para todo mundo', () => {
    expect(isSectionVisible(section('Início'), COLABORADOR)).toBe(true);
    expect(visibleTabs(section('Início'), COLABORADOR).map((t) => t.title)).toEqual(['Dashboard', 'Timesheet']);
  });

  it('colaborador e RH veem só Início (como o requiresManager de antes)', () => {
    for (const can of [COLABORADOR, RH]) {
      expect(NAV_SECTIONS.filter((s) => isSectionVisible(s, can)).map((s) => s.label)).toEqual(['Início']);
    }
  });

  it('gerente vê tudo o que via', () => {
    expect(NAV_SECTIONS.filter((s) => isSectionVisible(s, GERENTE)).map((s) => s.label)).toEqual([
      'Início', 'Pipeline', 'Projetos', 'Análises', 'Cadastros',
    ]);
  });

  it('desligar uma capacidade some só com a aba dela — e a seção fica se sobrar aba', () => {
    const semFinanceiro = canFromCapabilities(['timesheet-terceiro:ler', 'pipeline:ler']);
    expect(visibleTabs(section('Análises'), semFinanceiro).map((t) => t.title)).toEqual(['Meu Time', 'Comercial']);
    expect(isSectionVisible(section('Análises'), semFinanceiro)).toBe(true);
    expect(isSectionVisible(section('Análises'), canFromCapabilities([]))).toBe(false);
  });

  it('getActiveTabs filtra pelo que a pessoa pode ver quando recebe can', () => {
    expect(getActiveTabs('/analises/financeiro', GERENTE)?.map((t) => t.title)).toEqual(['Meu Time', 'Financeiro', 'Comercial']);
    expect(getActiveTabs('/analises/financeiro', canFromCapabilities(['financeiro:ler']))?.map((t) => t.title)).toEqual(['Financeiro']);
    expect(getActiveTabs('/analises/financeiro')?.length).toBe(3);
    expect(getActiveTabs('/pipeline')).toBeNull();
  });
});
