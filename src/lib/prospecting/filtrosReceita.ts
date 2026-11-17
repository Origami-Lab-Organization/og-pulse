import type {
  FaixaDeFuncionarios,
  FaixaDeIdade,
  FiltroDeDivida,
  FiltrosReceita,
  GrupoDeNatureza,
  Opcao,
} from '@/types/filtrosReceita';
import { ramosDosSetores } from './cnae';

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

export const CAPITAIS: ReadonlyArray<Opcao<number>> = [
  { valor: 0, rotulo: 'Qualquer' },
  { valor: 1_000_000, rotulo: 'R$ 1 mi' },
  { valor: 10_000_000, rotulo: 'R$ 10 mi' },
  { valor: 50_000_000, rotulo: 'R$ 50 mi' },
  { valor: 100_000_000, rotulo: 'R$ 100 mi' },
];

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
  idades: [],
  ufs: [],
  funcionarios: [],
  capitalMinimo: 0,
  naturezas: [],
  divida: DIVIDA_QUALQUER,
  comEmail: false,
  comTelefone: false,
};

/** Primeiro acesso, ou navegador novo: a indústria de transformação (decisão de 16/11/2026). */
export const FILTROS_INICIAIS: FiltrosReceita = { ...FILTROS_VAZIOS, setores: ['C'] };

/** Quantos filtros estão ativos, para o botão "Filtros". Cada grupo conta uma vez. */
export function contarFiltros(f: FiltrosReceita): number {
  const ativos = [
    f.setores.length > 0,
    f.ramos.length > 0,
    f.cnaes.length > 0,
    f.idades.length > 0,
    f.ufs.length > 0,
    f.funcionarios.length > 0,
    f.capitalMinimo > 0,
    f.naturezas.length > 0,
    f.divida !== DIVIDA_QUALQUER,
    f.comEmail || f.comTelefone,
  ];
  return ativos.filter(Boolean).length;
}

/** Marca ou desmarca um valor de uma lista. */
export function alternar<T>(lista: readonly T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

/** Troca os setores e tira os ramos que deixaram de pertencer a eles (cenário 2). */
export function comSetores(f: FiltrosReceita, setores: string[]): FiltrosReceita {
  const validos = new Set(ramosDosSetores(setores));
  return { ...f, setores, ramos: f.ramos.filter((r) => validos.has(r)) };
}

/** "Incluir atividade secundária" só faz sentido com algum filtro de atividade. */
export const temFiltroDeAtividade = (f: FiltrosReceita): boolean =>
  f.setores.length > 0 || f.ramos.length > 0 || f.cnaes.length > 0;

// ---------- navegador ----------

/** A versão vai na chave: mudou o formato, a tela volta ao padrão em vez de quebrar. */
const CHAVE = 'pulse:empresas-receita:filtros:v1';

const lista = <T>(valor: unknown, aceitos: ReadonlySet<T>): T[] =>
  Array.isArray(valor) ? valor.filter((v): v is T => aceitos.has(v as T)) : [];

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
  const setores = lista<string>(salvo.setores, new Set('ABCDEFGHIJKLMNOPQRSTU'.split('')));
  const capital = CAPITAIS.find((c) => c.valor === salvo.capitalMinimo)?.valor ?? 0;
  const divida = DIVIDAS.find((d) => d.valor === salvo.divida)?.valor ?? DIVIDA_QUALQUER;
  return {
    setores,
    ramos: lista<string>(salvo.ramos, new Set(ramosDosSetores(setores))),
    cnaes: Array.isArray(salvo.cnaes) ? salvo.cnaes.filter((c): c is string => typeof c === 'string' && /^\d{2,7}$/.test(c)) : [],
    secundaria: salvo.secundaria === true,
    idades: lista(salvo.idades, conjunto(IDADES)),
    ufs: lista<string>(salvo.ufs, new Set(UFS)),
    funcionarios: lista(salvo.funcionarios, conjunto(FUNCIONARIOS)),
    capitalMinimo: capital,
    naturezas: lista(salvo.naturezas, conjunto(NATUREZAS)),
    divida,
    comEmail: salvo.comEmail === true,
    comTelefone: salvo.comTelefone === true,
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
