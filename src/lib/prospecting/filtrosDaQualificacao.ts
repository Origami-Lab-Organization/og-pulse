import { divisaoDoCnae, setorDoCnae } from '@/lib/prospecting/cnae';
import { BASE_PISO } from '@/lib/prospecting/faturamentoEstimado';
import { companyFit, servicoEmDestaque } from '@/lib/prospecting/fit';
import { FILTROS_VAZIOS, lerFiltrosSalvos } from '@/lib/prospecting/filtrosReceita';
import { sugerirTipoDeConta } from '@/lib/prospecting/tipoDeConta';
import { formatCNPJ } from '@/lib/masks';
import { opportunityName, type ProspectWithCompany } from '@/types/prospect';
import type { BantDaOportunidade } from '@/types/bant';
import type { FaixaDeFaturamento, Opcao } from '@/types/filtrosReceita';
import {
  ColunaDaQualificacao,
  type ColunaOrdenavel,
  type FiltrosDaQualificacao,
  type LinhaDaQualificacao,
  type OrdemDaQualificacao,
} from '@/types/qualificacao';
import type { FitFront } from '@/types/receita';
import { nomeDaCidade } from '@/lib/prospecting/cidade';

/**
 * Filtros e ordem da aba "Em qualificação" (US-0042), na própria tela: a lista é do tenant e
 * pequena. Setor, ramo e CNAE vêm do CNAE principal da Receita gravada; a distância, do retrato da
 * Base (US-0014). Empresa sem o dado fica fora do filtro que depende dele (mesma regra da Base).
 */

export const SEM = 'sem';
const ABAIXO_DE_10_MI: FaixaDeFaturamento = 'ate10';

export const BANTS_MINIMOS: ReadonlyArray<Opcao<number>> = [
  { valor: 0, rotulo: 'Qualquer' },
  { valor: 25, rotulo: '25 ou mais' },
  { valor: 50, rotulo: '50 ou mais' },
  { valor: 75, rotulo: '75 ou mais' },
];

export const DIAS_NA_ETAPA: ReadonlyArray<Opcao<number>> = [
  { valor: 0, rotulo: 'Qualquer' },
  { valor: 7, rotulo: 'mais de 7 dias' },
  { valor: 15, rotulo: 'mais de 15 dias' },
  { valor: 30, rotulo: 'mais de 30 dias' },
];

export const FILTROS_DA_QUALIFICACAO_VAZIOS: FiltrosDaQualificacao = {
  setores: [],
  ramos: [],
  cnaes: [],
  semSetores: [],
  semRamos: [],
  semCnaes: [],
  ufs: [],
  cidades: [],
  distanciaMaxima: 0,
  tiposDeConta: [],
  faturamentos: [],
  linhaDoFit: null,
  fitMinimo: 0,
  bantMinimo: 0,
  comPropostas: false,
  responsaveis: [],
  diasMinimos: 0,
};

export const ORDEM_PADRAO: OrdemDaQualificacao = { coluna: ColunaDaQualificacao.Bant, crescente: false };

// ---------- a linha ----------

/** Faixa de faturamento da Base: abaixo de R$ 10 mi, Satélite, Ponte ou Âncora. */
export function faixaDoFaturamento(valor: number | null): FaixaDeFaturamento | null {
  if (valor == null) return null;
  return sugerirTipoDeConta(valor) ?? ABAIXO_DE_10_MI;
}

function faturamentoDaLinha(p: ProspectWithCompany): { valor: number | null; estimado: boolean } {
  const e = p.company;
  if (e?.faturamento_anual != null) return { valor: Number(e.faturamento_anual), estimado: false };
  const temEstimativa = e?.base_faturamento_estimado != null && e.base_faturamento_base !== BASE_PISO;
  return temEstimativa ? { valor: Number(e.base_faturamento_estimado), estimado: true } : { valor: null, estimado: false };
}

export const chaveDaCidade = (uf: string, cidade: string) => `${uf}:${cidade}`;

/** CNAE principal da Receita gravada, com 7 dígitos (a BrasilAPI perde o zero à esquerda). */
function atividadeDe(p: ProspectWithCompany): Pick<LinhaDaQualificacao, 'cnae' | 'setor' | 'ramo'> {
  const codigo = p.company?.receita?.cnaePrincipal?.codigo;
  if (!codigo) return { cnae: null, setor: null, ramo: null };
  const cnae = String(codigo).replace(/\D/g, '').padStart(7, '0');
  return { cnae, setor: setorDoCnae(cnae), ramo: divisaoDoCnae(cnae) };
}

const enderecoDe = (p: ProspectWithCompany) => p.company?.receita?.endereco ?? {};

function regiaoDe(p: ProspectWithCompany): Pick<LinhaDaQualificacao, 'uf' | 'cidade' | 'distanciaKm'> {
  const endereco: { uf?: string | null; municipio?: string | null } = enderecoDe(p);
  return { uf: endereco.uf ?? null, cidade: nomeDaCidade(endereco.municipio, endereco.uf) || null, distanciaKm: p.company?.base_distancia_km ?? null };
}

function bantDe(bant: BantDaOportunidade | undefined): Pick<LinhaDaQualificacao, 'bant' | 'propostas'> {
  return bant ? { bant: bant.nota, propostas: bant.propostas.length } : { bant: 0, propostas: 0 };
}

function identidadeDe(p: ProspectWithCompany): Pick<LinhaDaQualificacao, 'nome' | 'cnpj' | 'tipoConta' | 'responsavel' | 'fits'> {
  const e = p.company;
  const responsavel = p.owner_id ?? null;
  if (!e) return { nome: opportunityName(p), cnpj: null, tipoConta: null, responsavel, fits: null };
  return {
    nome: opportunityName(p),
    cnpj: e.cnpj ? formatCNPJ(e.cnpj) : null,
    tipoConta: e.tipo_conta ?? null,
    responsavel,
    fits: companyFit(e, e.fomento ?? null),
  };
}

/** Tudo o que a aba filtra, ordena e mostra, de uma vez. `entrouEm`: a última entrada na etapa. */
export function linhaDaQualificacao(p: ProspectWithCompany, bant: BantDaOportunidade | undefined, entrouEm: string | undefined): LinhaDaQualificacao {
  const faturamento = faturamentoDaLinha(p);
  return {
    prospect: p,
    ...identidadeDe(p),
    ...atividadeDe(p),
    ...regiaoDe(p),
    faturamento: faturamento.valor,
    faturamentoEstimado: faturamento.estimado,
    ...bantDe(bant),
    entrouEm: entrouEm ?? p.created_at.slice(0, 10),
  };
}

// ---------- filtrar ----------

const notaDoFit = (l: LinhaDaQualificacao, servico: FitFront | null): number | null => {
  if (!l.fits) return null;
  if (!servico) return servicoEmDestaque(l.fits)?.nota ?? Math.max(...l.fits.map((f) => f.nota));
  return l.fits.find((f) => f.frente === servico)?.nota ?? null;
};

const algum = <T>(marcados: readonly T[], valor: T | null) => !marcados.length || (valor !== null && marcados.includes(valor));

const diasDesde = (data: string, hoje: Date) => Math.floor((hoje.getTime() - new Date(`${data}T00:00:00`).getTime()) / 86_400_000);

/** Inclusão: o ramo refina o setor (como na Base); o CNAE é começo de código. */
function incluiAtividade(l: LinhaDaQualificacao, f: FiltrosDaQualificacao): boolean {
  const pelaArvore = f.ramos.length ? algum(f.ramos, l.ramo) : algum(f.setores, l.setor);
  const peloCnae = !f.cnaes.length || (l.cnae !== null && f.cnaes.some((c) => l.cnae!.startsWith(c)));
  return pelaArvore && peloCnae;
}

/** Tirados (US-0041): só pela atividade principal; sem CNAE conhecido, não há o que tirar. */
function foraDosTirados(l: LinhaDaQualificacao, f: FiltrosDaQualificacao): boolean {
  if (!l.cnae) return true;
  const tirado = f.semSetores.includes(l.setor ?? '') || f.semRamos.includes(l.ramo ?? '') || f.semCnaes.some((c) => l.cnae!.startsWith(c));
  return !tirado;
}

function naRegiao(l: LinhaDaQualificacao, f: FiltrosDaQualificacao): boolean {
  const cidade = l.uf && l.cidade ? chaveDaCidade(l.uf, l.cidade) : null;
  const perto = !f.distanciaMaxima || (l.distanciaKm !== null && l.distanciaKm <= f.distanciaMaxima);
  return algum(f.ufs, l.uf) && algum(f.cidades, cidade) && perto;
}

/** A maior nota entre as linhas de serviço do fit (US-0047). */
function maiorNotaDasLinhas(l: LinhaDaQualificacao): number | null {
  const notas = Object.values(l.notasPorLinha ?? {}).filter((n): n is number => n !== null);
  return notas.length ? Math.max(...notas) : null;
}

/** Com linha escolhida, sai quem não tem nota (sem os dados da Receita); com mínimo, quem fica abaixo. */
function noFit(l: LinhaDaQualificacao, f: FiltrosDaQualificacao): boolean {
  if (!f.linhaDoFit && !f.fitMinimo) return true;
  const nota = f.linhaDoFit ? l.notasPorLinha?.[f.linhaDoFit] ?? null : maiorNotaDasLinhas(l);
  return nota !== null && nota >= f.fitMinimo;
}

function naConta(l: LinhaDaQualificacao, f: FiltrosDaQualificacao): boolean {
  return algum(f.tiposDeConta, l.tipoConta ?? SEM) && algum(f.faturamentos, faixaDoFaturamento(l.faturamento)) && noFit(l, f);
}

function noTime(l: LinhaDaQualificacao, f: FiltrosDaQualificacao, hoje: Date): boolean {
  const bant = l.bant >= f.bantMinimo && (!f.comPropostas || l.propostas > 0);
  const tempo = !f.diasMinimos || diasDesde(l.entrouEm, hoje) > f.diasMinimos;
  return bant && tempo && algum(f.responsaveis, l.responsavel ?? SEM);
}

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Nome, CNPJ (só dígitos) ou cidade. */
function casaComBusca(l: LinhaDaQualificacao, busca: string): boolean {
  const termo = semAcento(busca.trim());
  if (!termo) return true;
  const digitos = termo.replace(/\D/g, '');
  const peloCnpj = digitos.length >= 3 && (l.cnpj ?? '').replace(/\D/g, '').includes(digitos);
  return peloCnpj || semAcento(l.nome).includes(termo) || semAcento(l.cidade ?? '').includes(termo);
}

export function filtrarQualificacao(linhas: LinhaDaQualificacao[], f: FiltrosDaQualificacao, busca: string, hoje = new Date()): LinhaDaQualificacao[] {
  return linhas.filter(
    (l) => incluiAtividade(l, f) && foraDosTirados(l, f) && naRegiao(l, f) && naConta(l, f) && noTime(l, f, hoje) && casaComBusca(l, busca),
  );
}

/** Quantos grupos de filtro estão valendo, para o selo do ícone. */
export function contarFiltrosDaQualificacao(f: FiltrosDaQualificacao): number {
  return [
    f.setores.length + f.ramos.length + f.cnaes.length > 0,
    f.semSetores.length + f.semRamos.length + f.semCnaes.length > 0,
    f.ufs.length + f.cidades.length > 0,
    f.distanciaMaxima > 0,
    f.tiposDeConta.length > 0,
    f.faturamentos.length > 0,
    f.linhaDoFit !== null || f.fitMinimo > 0,
    f.bantMinimo > 0 || f.comPropostas,
    f.responsaveis.length > 0,
    f.diasMinimos > 0,
  ].filter(Boolean).length;
}

// ---------- ordenar ----------

/** Prefixo da coluna de fit de uma linha de serviço (US-0047). */
const PREFIXO_DA_COLUNA_DE_LINHA = 'linha:';

export const colunaDaLinha = (linhaId: string): ColunaOrdenavel => `${PREFIXO_DA_COLUNA_DE_LINHA}${linhaId}`;

const linhaDaColuna = (coluna: ColunaOrdenavel): string | null =>
  coluna.startsWith(PREFIXO_DA_COLUNA_DE_LINHA) ? coluna.slice(PREFIXO_DA_COLUNA_DE_LINHA.length) : null;

/** Trocou a linha do fit: a ordem passa a ser por ela, da maior nota para a menor. */
export function ordemDosFiltros(atual: OrdemDaQualificacao, antes: FiltrosDaQualificacao, depois: FiltrosDaQualificacao): OrdemDaQualificacao {
  if (!depois.linhaDoFit || depois.linhaDoFit === antes.linhaDoFit) return atual;
  return { coluna: colunaDaLinha(depois.linhaDoFit), crescente: false };
}

const VALOR_DA_COLUNA: Record<ColunaDaQualificacao, (l: LinhaDaQualificacao) => number | string | null> = {
  [ColunaDaQualificacao.Bant]: (l) => l.bant,
  [ColunaDaQualificacao.Studio]: (l) => notaDoFit(l, 'studio'),
  [ColunaDaQualificacao.LeiDoBem]: (l) => notaDoFit(l, 'lei_do_bem'),
  [ColunaDaQualificacao.Captacao]: (l) => notaDoFit(l, 'captacao'),
  [ColunaDaQualificacao.Consultoria]: (l) => notaDoFit(l, 'consultoria'),
  [ColunaDaQualificacao.Faturamento]: (l) => l.faturamento,
  [ColunaDaQualificacao.Distancia]: (l) => l.distanciaKm,
  [ColunaDaQualificacao.Desde]: (l) => l.entrouEm,
};

/** Primeiro clique: distância e "Desde" do menor para o maior; o resto, do maior para o menor. */
export const COMECA_CRESCENTE: ReadonlySet<ColunaDaQualificacao> = new Set([ColunaDaQualificacao.Distancia, ColunaDaQualificacao.Desde]);

export function alternarOrdem(atual: OrdemDaQualificacao, coluna: ColunaOrdenavel): OrdemDaQualificacao {
  if (atual.coluna === coluna) return { coluna, crescente: !atual.crescente };
  return { coluna, crescente: COMECA_CRESCENTE.has(coluna as ColunaDaQualificacao) };
}

function valorDaColuna(coluna: ColunaOrdenavel): (l: LinhaDaQualificacao) => number | string | null {
  const linhaId = linhaDaColuna(coluna);
  if (linhaId) return (l) => l.notasPorLinha?.[linhaId] ?? null;
  return VALOR_DA_COLUNA[coluna as ColunaDaQualificacao] ?? VALOR_DA_COLUNA[ColunaDaQualificacao.Bant];
}

/** Sem valor vai sempre para o fim; empate, pelo nome. */
export function ordenarQualificacao(linhas: LinhaDaQualificacao[], ordem: OrdemDaQualificacao): LinhaDaQualificacao[] {
  const valor = valorDaColuna(ordem.coluna);
  const sinal = ordem.crescente ? 1 : -1;
  return [...linhas].sort((a, b) => {
    const va = valor(a);
    const vb = valor(b);
    if (va === null || vb === null) return va === vb ? a.nome.localeCompare(b.nome) : va === null ? 1 : -1;
    if (va === vb) return a.nome.localeCompare(b.nome);
    return (va < vb ? -1 : 1) * sinal;
  });
}

// ---------- navegador ----------

/** Separada da Base; a versão vai na chave (mudou o formato, volta ao padrão). */
const CHAVE = 'pulse:em-qualificacao:v1';

const textos = (valor: unknown): string[] => (Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : []);
const umDe = (valor: unknown, aceitos: ReadonlyArray<Opcao<number>>): number => aceitos.find((o) => o.valor === valor)?.valor ?? 0;
const COLUNAS = new Set<string>(Object.values(ColunaDaQualificacao));

function lerFiltros(s: Record<string, unknown>): FiltrosDaQualificacao {
  const atividade = { ...FILTROS_VAZIOS, ...lerFiltrosSalvos(JSON.stringify({ ...s, setores: s.setores ?? [] })) };
  return {
    setores: atividade.setores,
    ramos: atividade.ramos,
    cnaes: atividade.cnaes,
    semSetores: atividade.semSetores,
    semRamos: atividade.semRamos,
    semCnaes: atividade.semCnaes,
    distanciaMaxima: atividade.distanciaMaxima,
    faturamentos: atividade.faturamentos,
    linhaDoFit: typeof s.linhaDoFit === 'string' ? s.linhaDoFit : null,
    fitMinimo: atividade.fitMinimo,
    ufs: atividade.ufs,
    cidades: textos(s.cidades),
    tiposDeConta: textos(s.tiposDeConta),
    responsaveis: textos(s.responsaveis),
    bantMinimo: umDe(s.bantMinimo, BANTS_MINIMOS),
    comPropostas: s.comPropostas === true,
    diasMinimos: umDe(s.diasMinimos, DIAS_NA_ETAPA),
  };
}

function lerOrdem(valor: unknown): OrdemDaQualificacao {
  const o = (valor ?? {}) as Record<string, unknown>;
  const coluna = String(o.coluna);
  const valida = COLUNAS.has(coluna) || linhaDaColuna(coluna as ColunaOrdenavel) !== null;
  return valida ? { coluna: coluna as ColunaOrdenavel, crescente: o.crescente === true } : ORDEM_PADRAO;
}

/** O que a aba guarda: filtros, ordem e busca. Valor que não vale mais é ignorado. */
export function lerQualificacaoSalva(texto: string | null): { filtros: FiltrosDaQualificacao; ordem: OrdemDaQualificacao; busca: string } {
  const padrao = { filtros: FILTROS_DA_QUALIFICACAO_VAZIOS, ordem: ORDEM_PADRAO, busca: '' };
  if (!texto) return padrao;
  try {
    const s = JSON.parse(texto) as Record<string, unknown>;
    return { filtros: lerFiltros((s.filtros ?? {}) as Record<string, unknown>), ordem: lerOrdem(s.ordem), busca: typeof s.busca === 'string' ? s.busca : '' };
  } catch {
    return padrao;
  }
}

export function qualificacaoDoNavegador() {
  try {
    return lerQualificacaoSalva(window.localStorage.getItem(CHAVE));
  } catch {
    return lerQualificacaoSalva(null); // navegador sem armazenamento
  }
}

export function guardarQualificacao(estado: { filtros: FiltrosDaQualificacao; ordem: OrdemDaQualificacao; busca: string }): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    // Sem armazenamento, a aba só não lembra na próxima visita.
  }
}
