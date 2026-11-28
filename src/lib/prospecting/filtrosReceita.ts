import { FRENTES_DO_FIT } from '@/lib/prospecting/fit';
import type { GrupoDeFit } from '@/lib/prospecting/fitDoCatalogo';
import type {
  AtalhoDeExclusao,
  AtividadesIncluidas,
  AtividadesTiradas,
  FiltroDeAtividade,
  FaixaDeFaturamento,
  FaixaDeFuncionarios,
  FaixaDeIdade,
  FiltroDeDivida,
  FiltrosReceita,
  GrupoDeNatureza,
  Opcao,
} from '@/types/filtrosReceita';
import { ramosDosSetores, SETORES } from './cnae';
import { FILTROS_DE_RELACAO } from './relacao';

/**
 * Filtros da base da Receita (US-0003): opções, padrão, contagem e o que fica guardado no
 * navegador. A tradução para SQL é da Edge Function `empresas-receita`, que repete as listas.
 */

/** Dívida "qualquer" é o mesmo que não filtrar. */
export const DIVIDA_QUALQUER: FiltroDeDivida = 'qualquer';

export const IDADES: ReadonlyArray<Opcao<FaixaDeIdade>> = [
  { valor: 'ate3', rotulo: 'até 3 anos' },
  { valor: '3a10', rotulo: '3 a 10' },
  { valor: '10a20', rotulo: '10 a 20' },
  { valor: '20a40', rotulo: '20 a 40' },
  { valor: 'mais40', rotulo: 'mais de 40' },
];

export const FUNCIONARIOS: ReadonlyArray<Opcao<FaixaDeFuncionarios>> = [
  { valor: 'ate19', rotulo: 'até 19' },
  { valor: '20a49', rotulo: '20 a 49' },
  { valor: '50a99', rotulo: '50 a 99' },
  { valor: '100a249', rotulo: '100 a 249' },
  { valor: '250a499', rotulo: '250 a 499' },
  { valor: '500mais', rotulo: '500 ou mais' },
  { valor: 'sem', rotulo: 'Sem informação na RAIS' },
];

export const FATURAMENTOS: ReadonlyArray<Opcao<FaixaDeFaturamento>> = [
  { valor: 'ate10', rotulo: 'Abaixo de R$ 10 mi' },
  { valor: 'satelite', rotulo: 'R$ 10 a 100 mi (Satélite)' },
  { valor: 'ponte', rotulo: 'R$ 100 a 300 mi (Ponte)' },
  { valor: 'ancora', rotulo: 'Acima de R$ 300 mi (Âncora)' },
];

export const CAPITAIS: ReadonlyArray<Opcao<number>> = [
  { valor: 0, rotulo: 'Qualquer' },
  { valor: 1_000_000, rotulo: 'R$ 1 mi' },
  { valor: 10_000_000, rotulo: 'R$ 10 mi' },
  { valor: 50_000_000, rotulo: 'R$ 50 mi' },
  { valor: 100_000_000, rotulo: 'R$ 100 mi' },
];

/**
 * Distância de Formiga em linha reta (US-0015), escolhida pela pessoa (US-0040): a barra vai de
 * 10 a 1.000 km, de 10 em 10 (77% da Base); o campo aceita de 1 a 3.300 (a mais longe está a
 * 3.282 km). 0 = qualquer. Os valores antigos (50, 100, 200, 300, 500) continuam valendo.
 */
export const DISTANCIA_DA_BARRA = { minimo: 10, maximo: 1000, passo: 10 } as const;
export const DISTANCIA_MAXIMA = 3300;

export const distanciaValida = (km: unknown): km is number =>
  typeof km === 'number' && Number.isInteger(km) && km >= 1 && km <= DISTANCIA_MAXIMA;

export const rotuloDaDistancia = (km: number): string => `até ${km.toLocaleString('pt-BR')} km`;

export const NATUREZAS: ReadonlyArray<Opcao<GrupoDeNatureza>> = [
  { valor: 'limitada', rotulo: 'Limitada' },
  { valor: 'sa_fechada', rotulo: 'S.A. fechada' },
  { valor: 'sa_aberta', rotulo: 'S.A. aberta' },
  { valor: 'outras_empresas', rotulo: 'Outras empresas' },
  { valor: 'associacoes', rotulo: 'Associações e fundações' },
  { valor: 'pessoa_fisica', rotulo: 'Pessoa física' },
];

export const DIVIDAS: ReadonlyArray<Opcao<FiltroDeDivida>> = [
  { valor: DIVIDA_QUALQUER, rotulo: 'Qualquer' },
  { valor: 'sem', rotulo: 'Sem dívida' },
  { valor: 'sem_ajuizada', rotulo: 'Sem dívida ajuizada' },
  { valor: 'com', rotulo: 'Com dívida' },
];

export const UFS: readonly string[] = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

export const FILTROS_VAZIOS: FiltrosReceita = {
  setores: [],
  ramos: [],
  cnaes: [],
  secundaria: false,
  semSetores: [],
  semRamos: [],
  semCnaes: [],
  idades: [],
  ufs: [],
  funcionarios: [],
  faturamentos: [],
  capitalMinimo: 0,
  distanciaMaxima: 0,
  naturezas: [],
  divida: DIVIDA_QUALQUER,
  comEmail: false,
  comTelefone: false,
  relacoes: [],
  servicoDoFit: null,
  fitMinimo: 0,
};

/** Nota mínima de fit (US-0014): qualquer, 40+, 60+ (o que já conta como indício de Necessidade) ou 80+. */
export const FITS_MINIMOS: readonly number[] = [0, 40, 60, 80];

export const OPCOES_DE_FIT_MINIMO: ReadonlyArray<Opcao<number>> = FITS_MINIMOS.map((n) => ({ valor: n, rotulo: n ? `${n} ou mais` : 'Qualquer' }));

/** "Maior nota" é a ausência de serviço escolhido. */
export const MAIOR_NOTA = 'maior';

/** Opções do serviço do fit: as regras que algum serviço do catálogo usa, com o nome deles (US-0047). */
export const opcoesDeServicoDoFit = (grupos: ReadonlyArray<GrupoDeFit>): ReadonlyArray<Opcao<string>> => [
  { valor: MAIOR_NOTA, rotulo: 'Maior nota' },
  ...grupos.map((g) => ({ valor: g.frente, rotulo: g.rotulo })),
];

/** Primeiro acesso, ou navegador novo: a indústria de transformação (decisão de 16/11/2026). */
export const FILTROS_INICIAIS: FiltrosReceita = { ...FILTROS_VAZIOS, setores: ['C'] };

/** Quantos filtros estão ativos, para o botão "Filtros". Cada grupo conta uma vez. */
export function contarFiltros(f: FiltrosReceita): number {
  const ativos = [
    f.setores.length > 0,
    f.ramos.length > 0,
    f.cnaes.length > 0,
    temAtividadeTirada(f),
    f.idades.length > 0,
    f.ufs.length > 0,
    f.funcionarios.length > 0,
    f.faturamentos.length > 0,
    f.capitalMinimo > 0,
    f.distanciaMaxima > 0,
    f.naturezas.length > 0,
    f.divida !== DIVIDA_QUALQUER,
    f.comEmail || f.comTelefone,
    f.relacoes.length > 0,
    f.servicoDoFit !== null || f.fitMinimo > 0,
  ];
  return ativos.filter(Boolean).length;
}

/** Marca ou desmarca um valor de uma lista. */
export function alternar<T>(lista: readonly T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

/** Troca os setores e tira os ramos que deixaram de pertencer a eles (cenário 2). */
export function comSetores<F extends AtividadesIncluidas>(f: F, setores: string[]): F {
  const validos = new Set(ramosDosSetores(setores));
  return { ...f, setores, ramos: f.ramos.filter((r) => validos.has(r)) };
}

// ---------- tirar atividades (US-0041) ----------

/** Setor, ramo ou CNAE: cada um tem a lista de incluídos e a de tirados. */
export enum TipoDeAtividade {
  Setor = 'setor',
  Ramo = 'ramo',
  Cnae = 'cnae',
}

const LISTAS_DO_TIPO = {
  [TipoDeAtividade.Setor]: { incluidos: 'setores', tirados: 'semSetores' },
  [TipoDeAtividade.Ramo]: { incluidos: 'ramos', tirados: 'semRamos' },
  [TipoDeAtividade.Cnae]: { incluidos: 'cnaes', tirados: 'semCnaes' },
} as const;

const sem = (lista: readonly string[], tirar: readonly string[]) => lista.filter((v) => !tirar.includes(v));

/** Os incluídos de um tipo; o que entra deixa de estar tirado (cenário 5). */
export function incluirAtividades<F extends FiltroDeAtividade>(f: F, tipo: TipoDeAtividade, incluidos: string[]): F {
  const { incluidos: campo, tirados } = LISTAS_DO_TIPO[tipo];
  const novo = { ...f, [campo]: incluidos, [tirados]: sem(f[tirados], incluidos) };
  return tipo === TipoDeAtividade.Setor ? comSetores(novo, incluidos) : novo;
}

/** Os tirados de um tipo; o que sai deixa de estar incluído (cenário 5). */
export function tirarAtividades<F extends FiltroDeAtividade>(f: F, tipo: TipoDeAtividade, tirados: string[]): F {
  const { incluidos, tirados: campo } = LISTAS_DO_TIPO[tipo];
  const novo = { ...f, [campo]: tirados, [incluidos]: sem(f[incluidos], tirados) };
  return tipo === TipoDeAtividade.Setor ? comSetores(novo, novo.setores) : novo;
}

export const temAtividadeTirada = (f: AtividadesTiradas): boolean =>
  f.semSetores.length > 0 || f.semRamos.length > 0 || f.semCnaes.length > 0;

/** Atalhos (decisão de 24/11/2026): holdings e participações; atividades imobiliárias. */
export const ATALHOS_DE_EXCLUSAO: readonly AtalhoDeExclusao[] = [
  { id: 'holdings', rotulo: 'Sem holdings', ramos: [], cnaes: ['6462000', '6463800'] },
  { id: 'imobiliarias', rotulo: 'Sem imobiliárias', ramos: ['68'], cnaes: [] },
];

export const atalhoLigado = (f: AtividadesTiradas, a: AtalhoDeExclusao): boolean =>
  a.ramos.every((r) => f.semRamos.includes(r)) && a.cnaes.every((c) => f.semCnaes.includes(c));

/** Liga o atalho (tira tudo dele) ou desliga (devolve tudo dele). */
export function alternarAtalho<F extends FiltroDeAtividade>(f: F, a: AtalhoDeExclusao): F {
  if (atalhoLigado(f, a)) {
    return { ...f, semRamos: sem(f.semRamos, a.ramos), semCnaes: sem(f.semCnaes, a.cnaes) };
  }
  const comRamos = tirarAtividades(f, TipoDeAtividade.Ramo, [...new Set([...f.semRamos, ...a.ramos])]);
  return tirarAtividades(comRamos, TipoDeAtividade.Cnae, [...new Set([...comRamos.semCnaes, ...a.cnaes])]);
}

/** Todos os ramos da CNAE, para tirar um ramo de qualquer setor. */
export const TODOS_OS_RAMOS: readonly string[] = SETORES.flatMap((s) => s.divisoes);

/** "Incluir atividade secundária" só faz sentido com algum filtro de atividade. */
export const temFiltroDeAtividade = (f: FiltrosReceita): boolean =>
  f.setores.length > 0 || f.ramos.length > 0 || f.cnaes.length > 0;

// ---------- navegador ----------

/** A versão vai na chave: mudou o formato, a tela volta ao padrão em vez de quebrar. */
const CHAVE = 'pulse:empresas-receita:filtros:v1';

const lista = <T>(valor: unknown, aceitos: ReadonlySet<T>): T[] =>
  Array.isArray(valor) ? valor.filter((v): v is T => aceitos.has(v as T)) : [];

const SETORES_VALIDOS = new Set('ABCDEFGHIJKLMNOPQRSTU'.split(''));

const cnaesDe = (valor: unknown): string[] =>
  Array.isArray(valor) ? valor.filter((c): c is string => typeof c === 'string' && /^\d{2,7}$/.test(c)) : [];

const conjunto = <T extends string | number>(opcoes: ReadonlyArray<Opcao<T>>) => new Set(opcoes.map((o) => o.valor));

/** Lê só o que é válido hoje: um valor que saiu das listas é ignorado, não quebra a tela. */
export function lerFiltrosSalvos(texto: string | null): FiltrosReceita {
  if (!texto) return FILTROS_INICIAIS;
  let salvo: Record<string, unknown>;
  try {
    salvo = JSON.parse(texto);
  } catch {
    return FILTROS_INICIAIS;
  }
  const setores = lista<string>(salvo.setores, SETORES_VALIDOS);
  const capital = CAPITAIS.find((c) => c.valor === salvo.capitalMinimo)?.valor ?? 0;
  const distancia = distanciaValida(salvo.distanciaMaxima) ? salvo.distanciaMaxima : 0;
  const divida = DIVIDAS.find((d) => d.valor === salvo.divida)?.valor ?? DIVIDA_QUALQUER;
  // As frentes antigas (software, financiamento) caem para "maior nota" (US-0014).
  const servicoDoFit = FRENTES_DO_FIT.find((f) => f === salvo.servicoDoFit) ?? null;
  const fitMinimo = FITS_MINIMOS.find((n) => n === salvo.fitMinimo) ?? 0;
  return {
    servicoDoFit,
    fitMinimo,
    setores,
    ramos: lista<string>(salvo.ramos, new Set(ramosDosSetores(setores))),
    cnaes: cnaesDe(salvo.cnaes),
    secundaria: salvo.secundaria === true,
    semSetores: lista<string>(salvo.semSetores, SETORES_VALIDOS),
    semRamos: lista<string>(salvo.semRamos, new Set(TODOS_OS_RAMOS)),
    semCnaes: cnaesDe(salvo.semCnaes),
    idades: lista(salvo.idades, conjunto(IDADES)),
    ufs: lista<string>(salvo.ufs, new Set(UFS)),
    funcionarios: lista(salvo.funcionarios, conjunto(FUNCIONARIOS)),
    faturamentos: lista(salvo.faturamentos, conjunto(FATURAMENTOS)),
    capitalMinimo: capital,
    distanciaMaxima: distancia,
    naturezas: lista(salvo.naturezas, conjunto(NATUREZAS)),
    divida,
    comEmail: salvo.comEmail === true,
    comTelefone: salvo.comTelefone === true,
    relacoes: lista(salvo.relacoes, conjunto(FILTROS_DE_RELACAO)),
  };
}

export function filtrosDoNavegador(): FiltrosReceita {
  try {
    return lerFiltrosSalvos(window.localStorage.getItem(CHAVE));
  } catch {
    return FILTROS_INICIAIS; // navegador sem armazenamento (aba privada, bloqueio)
  }
}

export function guardarFiltros(f: FiltrosReceita): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(f));
  } catch {
    // Sem armazenamento, a tela só não lembra o filtro na próxima visita.
  }
}

/** "2062200" → "2062-2/00"; começo de código → "2062…". */
export function rotuloDoCnae(codigo: string): string {
  if (codigo.length !== 7) return `${codigo}…`;
  return `${codigo.slice(0, 4)}-${codigo.slice(4, 5)}/${codigo.slice(5)}`;
}

/** Só dígitos, de 2 a 7: o texto digitado pode virar um "começa com". */
export function comecoDeCnae(termo: string): string | null {
  const digitos = termo.replace(/[\s.\-/]/g, '');
  return /^\d{2,7}$/.test(digitos) ? digitos : null;
}
