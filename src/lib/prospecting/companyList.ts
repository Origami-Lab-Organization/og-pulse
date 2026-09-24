import { COMPANY_STATUS_META, type CompanyApproachAction, type CompanyRow } from './companyStatus';

/**
 * Busca, filtros, ordenação e paginação da tela de Empresas (24/09/2026).
 *
 * Tudo puro e em memória: a lista de empresas do tenant cabe na tela, e a contagem por
 * faceta ("quantas ficariam se eu marcar isto") precisa enxergar a lista inteira.
 */

export type CompanyTab = 'todas' | CompanyApproachAction;
export type CompanyFacetKey = 'setor' | 'anel' | 'tier' | 'resp';
export type CompanySortKey = 'name' | 'anel' | 'tier' | 'next';
export type CompanyFilters = Record<CompanyFacetKey, string[]>;

export const FILTROS_VAZIOS: CompanyFilters = { setor: [], anel: [], tier: [], resp: [] };

/** Valores "sem" de cada faceta: aparecem por último no popover. */
export const SEM_SETOR = 'Não segmentada';
export const SEM_ANEL = 'Sem anel';
export const SEM_TIER = 'Sem tier';
export const SEM_RESPONSAVEL = '__sem_responsavel__';

const VALORES_SEM = new Set([SEM_SETOR, SEM_ANEL, SEM_TIER, SEM_RESPONSAVEL]);

export const COMPANY_FACETS: ReadonlyArray<{
  key: CompanyFacetKey;
  label: string;
  /** Uma empresa pode ter vários responsáveis — por isso a faceta devolve lista. */
  values: (row: CompanyRow) => string[];
}> = [
  { key: 'setor', label: 'Setor', values: (r) => [r.setor ?? SEM_SETOR] },
  { key: 'anel', label: 'Anel', values: (r) => [r.anel ? `Anel ${r.anel}` : SEM_ANEL] },
  { key: 'tier', label: 'Tier', values: (r) => [r.tier ? `Tier ${r.tier}` : SEM_TIER] },
  { key: 'resp', label: 'Responsável', values: (r) => (r.ownerIds.length ? r.ownerIds : [SEM_RESPONSAVEL]) },
];

export interface CompanyQuery {
  tab: CompanyTab;
  busca: string;
  filtros: CompanyFilters;
}

export function passaNaAba(row: CompanyRow, tab: CompanyTab): boolean {
  return tab === 'todas' || COMPANY_STATUS_META[row.status].action === tab;
}

/** Filtros de faceta, podendo ignorar um — é assim que o popover conta as próprias opções. */
export function passaNosFiltros(row: CompanyRow, filtros: CompanyFilters, ignorar?: CompanyFacetKey): boolean {
  return COMPANY_FACETS.every(({ key, values }) => {
    const marcados = filtros[key];
    if (key === ignorar || marcados.length === 0) return true;
    return values(row).some((v) => marcados.includes(v));
  });
}

/** Nome, CNPJ (por dígitos, a partir de 3), setor e subsetor. Sem acento e sem caixa. */
export function passaNaBusca(row: CompanyRow, busca: string): boolean {
  const termo = normalizar(busca);
  if (!termo) return true;
  const texto = normalizar([row.company.name, row.setor, row.subsetor].filter(Boolean).join(' '));
  if (texto.includes(termo)) return true;
  const digitos = busca.replace(/\D/g, '');
  return digitos.length >= 3 && (row.company.cnpj ?? '').replace(/\D/g, '').includes(digitos);
}

export function temFiltroAtivo(consulta: CompanyQuery): boolean {
  return consulta.busca.trim() !== '' || COMPANY_FACETS.some((f) => consulta.filtros[f.key].length > 0);
}

export function aplicarConsulta(rows: CompanyRow[], consulta: CompanyQuery): CompanyRow[] {
  return rows.filter(
    (r) => passaNaBusca(r, consulta.busca) && passaNosFiltros(r, consulta.filtros) && passaNaAba(r, consulta.tab),
  );
}

/** Contadores das abas: refletem busca e filtros, mas não a própria aba. */
export function contarAbas(rows: CompanyRow[], consulta: CompanyQuery): Record<CompanyTab, number> {
  const base = rows.filter((r) => passaNaBusca(r, consulta.busca) && passaNosFiltros(r, consulta.filtros));
  return {
    todas: base.length,
    abordar: base.filter((r) => passaNaAba(r, 'abordar')).length,
    nao_abordar: base.filter((r) => passaNaAba(r, 'nao_abordar')).length,
  };
}

export interface FacetOption {
  value: string;
  count: number;
}

/**
 * Opções de uma faceta com contagem "faceted": cada número considera busca, aba e os
 * OUTROS filtros — não o da própria faceta, senão marcar uma opção zeraria as vizinhas.
 */
export function opcoesDaFaceta(rows: CompanyRow[], key: CompanyFacetKey, consulta: CompanyQuery): FacetOption[] {
  const faceta = COMPANY_FACETS.find((f) => f.key === key)!;
  const universo = [...new Set(rows.flatMap(faceta.values))];
  const pool = rows.filter(
    (r) => passaNaBusca(r, consulta.busca) && passaNaAba(r, consulta.tab) && passaNosFiltros(r, consulta.filtros, key),
  );
  return universo
    .map((value) => ({ value, count: pool.filter((r) => faceta.values(r).includes(value)).length }))
    .sort(compararOpcoes);
}

function compararOpcoes(a: FacetOption, b: FacetOption): number {
  const semA = VALORES_SEM.has(a.value);
  if (semA !== VALORES_SEM.has(b.value)) return semA ? 1 : -1;
  return a.value.localeCompare(b.value, 'pt-BR', { numeric: true });
}

export interface CompanySort {
  key: CompanySortKey;
  dir: 1 | -1;
}

const VALOR_DE_ORDEM: Record<CompanySortKey, (r: CompanyRow) => string | number | null> = {
  name: (r) => r.company.name,
  anel: (r) => r.anel,
  tier: (r) => r.tier,
  next: (r) => r.nextActivityOn,
};

/** Nulos vão sempre para o fim, nos dois sentidos; empate desempata por nome. */
export function ordenar(rows: CompanyRow[], { key, dir }: CompanySort): CompanyRow[] {
  const valor = VALOR_DE_ORDEM[key];
  return [...rows].sort((a, b) => {
    const va = valor(a);
    const vb = valor(b);
    if (va === vb || (va == null && vb == null)) return porNome(a, b);
    if (va == null) return 1;
    if (vb == null) return -1;
    return comparar(va, vb) * dir;
  });
}

function comparar(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR');
}

function porNome(a: CompanyRow, b: CompanyRow): number {
  return a.company.name.localeCompare(b.company.name, 'pt-BR');
}

export function paginar<T>(itens: T[], pagina: number, tamanho: number): T[] {
  return itens.slice(pagina * tamanho, (pagina + 1) * tamanho);
}

export type NextActivityTone = 'atrasada' | 'hoje' | 'futura';

export interface NextActivityText {
  rotulo: string;
  dica: string;
  tom: NextActivityTone;
}

/** "Atrasada 2 dias", "Hoje", "Amanhã", "Em 5 dias" — a data sempre em dd/mm. */
export function descreverProximaAtividade(iso: string, hoje = new Date()): NextActivityText {
  const [, mes, dia] = iso.split('-');
  const ddmm = `${dia}/${mes}`;
  const dias = diasEntre(hoje, iso);
  if (dias < 0) return { rotulo: ddmm, dica: `Atrasada ${-dias} ${dias === -1 ? 'dia' : 'dias'}`, tom: 'atrasada' };
  if (dias === 0) return { rotulo: 'Hoje', dica: ddmm, tom: 'hoje' };
  return { rotulo: ddmm, dica: dias === 1 ? 'Amanhã' : `Em ${dias} dias`, tom: 'futura' };
}

function diasEntre(hoje: Date, iso: string): number {
  const inicio = new Date(hoje);
  inicio.setHours(0, 0, 0, 0);
  const alvo = new Date(`${iso}T00:00:00`);
  return Math.round((alvo.getTime() - inicio.getTime()) / 86400000);
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
