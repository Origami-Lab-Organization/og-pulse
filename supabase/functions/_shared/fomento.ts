// Cruzamento de fomento público por CNPJ (ADR-0042). FONTE ÚNICA: a Edge Function
// company-funding-check e o scripts/importar-empresas-lote.ts usam este arquivo.
// Sem import nenhum, para rodar em Deno e Node.

export interface OperacaoDeFomento {
  fonte: 'FINEP' | 'BNDES';
  ano: number | null;
  valor: number | null;
  instrumento: string | null;
  descricao: string | null;
}

export interface LinhaDeReferencia {
  fonte: string;
  ano: number | null;
  valor: number | null;
  instrumento: string | null;
  descricao: string | null;
}

export interface SinaisDeFomento {
  leiDoBem: 'ja_usa' | 'nunca_usou' | 'desconhecido';
  leiDoBemAno: number | null;
  captouFomento: boolean;
  fomentos: OperacaoDeFomento[];
  governo: { contratos: number; valorTotal: number | null } | null;
}

const BNDES_API = 'https://dadosabertos.bndes.gov.br/api/3/action/datastore_search';
const BNDES_NAO_AUTOMATICAS = '6f56b78c-510f-44b6-8274-78a5b7e931f4';
const FONTE_LEI_DO_BEM = 'lei_do_bem';
const FONTE_FINEP = 'finep';
const INOVACAO_SIM = 'SIM';
const TEMPO_MS = 10000;

const mascarado = (cnpj: string) => cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

const anoDe = (data: unknown) => {
  const ano = Number(String(data ?? '').slice(0, 4));
  return Number.isFinite(ano) && ano > 1990 ? ano : null;
};

const numero = (valor: unknown) => {
  if (typeof valor === 'number') return valor;
  const n = Number(String(valor ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** BNDES, operações diretas e indiretas não automáticas, por CNPJ exato. POST: o GET com filtro é barrado pelo WAF deles. */
export async function operacoesBndes(cnpj: string): Promise<OperacaoDeFomento[]> {
  const resposta = await fetch(BNDES_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource_id: BNDES_NAO_AUTOMATICAS, filters: { cnpj: mascarado(cnpj) }, limit: 50 }),
    signal: AbortSignal.timeout(TEMPO_MS),
  });
  if (!resposta.ok) throw new Error(`bndes ${resposta.status}`);
  const corpo = await resposta.json();
  const registros: Record<string, unknown>[] = corpo?.result?.records ?? [];
  return registros.map((r) => ({
    fonte: 'BNDES' as const,
    ano: anoDe(r.data_da_contratacao),
    valor: numero(r.valor_contratado_reais),
    instrumento: [r.produto, r.inovacao === INOVACAO_SIM ? 'inovação' : null].filter(Boolean).join(' · ') || null,
    descricao: String(r.descricao_do_projeto ?? '').replace(/\s+/g, ' ').trim().slice(0, 300) || null,
  }));
}

/**
 * Monta os sinais. `temLeiDoBem` = a lista do MCTI já foi importada; sem ela, "desconhecido"
 * — nunca "nunca usou".
 */
export function montarSinais(
  referencia: LinhaDeReferencia[],
  temLeiDoBem: boolean,
  bndes: OperacaoDeFomento[],
  governo: SinaisDeFomento['governo'],
): SinaisDeFomento {
  const leiDoBem = referencia.filter((l) => l.fonte === FONTE_LEI_DO_BEM);
  const finep: OperacaoDeFomento[] = referencia
    .filter((l) => l.fonte === FONTE_FINEP)
    .map((l) => ({ fonte: 'FINEP', ano: l.ano, valor: l.valor, instrumento: l.instrumento, descricao: l.descricao }));
  const fomentos = [...finep, ...bndes].sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0));
  const situacao: SinaisDeFomento['leiDoBem'] = leiDoBem.length > 0 ? 'ja_usa' : temLeiDoBem ? 'nunca_usou' : 'desconhecido';
  return {
    leiDoBem: situacao,
    leiDoBemAno: leiDoBem.reduce<number | null>((m, l) => (l.ano && (!m || l.ano > m) ? l.ano : m), null),
    captouFomento: fomentos.length > 0,
    fomentos: fomentos.slice(0, 30),
    governo,
  };
}
