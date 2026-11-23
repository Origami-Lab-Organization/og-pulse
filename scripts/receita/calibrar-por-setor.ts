/**
 * Calibra o faturamento pela RAIS por setor com os casos do time (US-0018). Com o túnel SSH
 * aberto e o CLI do Supabase logado no projeto:
 * `npx vite-node scripts/receita/calibrar-por-setor.ts`.
 *
 * Casos: empresas com faturamento "apurado" ou "estimado" pelo time no Pulse (o "calculado" é a
 * própria estimativa e fica de fora), lidos pelo `supabase db query --linked` — a credencial é a
 * do CLI, nunca do repositório. Cada caso é cruzado por CNPJ com a base da VPS e recebe a conta
 * pela RAIS (ou pelos funcionários do time) sem fator.
 *
 * Fator do grupo = mediana de (faturamento do time ÷ estimativa). Grupos: o ramo (divisão da
 * CNAE) e o setor (seção). Só entra o grupo com o mínimo de casos e que melhora o erro mediano,
 * medido com cada caso fora do ajuste. Grava em `src/lib/prospecting/calibracaoPorSetor.json`
 * só fatores e medidas agregadas, nunca o faturamento de uma empresa. Roda de novo sempre que o
 * time informar mais faturamentos; a próxima carga aplica os fatores à base.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { divisaoDoCnae, setorDoCnae } from '@/lib/prospecting/cnae';
import { estimarPorFuncionarios } from '@/lib/prospecting/faturamentoEstimado';
import type { SetorCalibrado } from '@/types/filtrosReceita';
import { ARQUIVO_DESTINO, lerAmbiente, psql, terminou } from './psql';

const DESTINO = new URL('../../src/lib/prospecting/calibracaoPorSetor.json', import.meta.url);

const CONSULTA_DO_TIME = `SELECT regexp_replace(cnpj, '\\D', '', 'g') AS cnpj, faturamento_anual, funcionarios_informados
  FROM prospect_companies
  WHERE faturamento_anual_base IN ('apurado', 'estimado') AND faturamento_anual > 0 AND cnpj IS NOT NULL`.replace(/\s+/g, ' ');

interface DoTime {
  cnpj: string;
  faturamento_anual: number;
  funcionarios_informados: number | null;
}

interface Caso {
  divisao: string;
  secao: string | null;
  /** ln(faturamento do time ÷ estimativa sem fator). */
  razao: number;
}

// ---------- leitura ----------

/** Os casos do time, pelo CLI do Supabase (a sessão do CLI, nada no repositório). */
function lerCasosDoTime(): DoTime[] {
  const r = spawnSync('npx', ['supabase', 'db', 'query', '--linked', '-o', 'json', CONSULTA_DO_TIME], { encoding: 'utf8' });
  if (r.status !== 0) {
    const motivo = (r.stderr ?? '').trim().split('\n').slice(-2).join(' ');
    throw new Error(`Não consegui ler os casos do Pulse (${motivo || `código ${r.status}`}). Confira o login do CLI do Supabase (npx supabase login).`);
  }
  // O CLI escreve avisos antes e depois do JSON ({ boundary, rows, warning }).
  const texto = r.stdout.slice(r.stdout.indexOf('{'), r.stdout.lastIndexOf('}') + 1);
  const { rows } = JSON.parse(texto) as { rows: DoTime[] };
  return rows.map((d) => ({ ...d, faturamento_anual: Number(d.faturamento_anual) }));
}

const NULO = '\\N';
const numero = (v: string) => (v === NULO ? null : Number(v));

/** Os dados do recorte (pulse.empresas, só leitura pelo pulse_carga, como a outra calibração) para os CNPJs dos casos. */
async function lerDaBase(cnpjs: string[]): Promise<Map<string, string[]>> {
  const lista = cnpjs.filter((c) => /^\d{14}$/.test(c)).map((c) => `'${c}'`).join(',');
  const consulta = `SELECT cnpj, cnae_principal, funcionarios, capital_social, natureza_juridica FROM pulse.empresas WHERE cnpj IN (${lista})`;
  const leitura = psql(lerAmbiente(ARQUIVO_DESTINO), ['-c', `\\copy (${consulta}) TO STDOUT`]);
  const base = new Map<string, string[]>();
  for await (const linha of createInterface({ input: leitura.stdout! })) {
    const c = linha.split('\t');
    base.set(c[0], c);
  }
  await terminou(leitura, 'leitura da base');
  return base;
}

function casoDe(t: DoTime, campos: string[] | undefined): Caso | null {
  if (!campos) return null;
  const [, cnae, funcionarios, capital, natureza] = campos;
  const pessoas = t.funcionarios_informados ?? numero(funcionarios);
  const estimado = estimarPorFuncionarios(cnae, pessoas, numero(capital), natureza === NULO ? null : natureza, false);
  if (!estimado) return null;
  return { divisao: divisaoDoCnae(cnae), secao: setorDoCnae(cnae), razao: Math.log(t.faturamento_anual / estimado) };
}

// ---------- conta ----------

function mediana(v: number[]): number {
  const o = [...v].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

/** Erro em vezes, para mais ou para menos. */
const vezes = (lnRazao: number) => Math.exp(Math.abs(lnRazao));

/** O erro de cada caso com o fator calculado sem ele (cada caso fora do ajuste). */
function errosForaDoAjuste(razoes: number[]): number[] {
  return razoes.map((r, i) => vezes(r - mediana(razoes.filter((_, j) => j !== i))));
}

const duas = (n: number) => Math.trunc(n * 100) / 100;

interface Grupo extends SetorCalibrado {
  chave: string;
  entra: boolean;
  /** Erro de cada caso fora do ajuste, na ordem dos casos do grupo. */
  erros: number[];
}

function calibrarGrupo(chave: string, razoes: number[], minimo: number): Grupo {
  const erros = errosForaDoAjuste(razoes);
  const antes = mediana(razoes.map(vezes));
  const depois = mediana(erros);
  return {
    chave,
    fator: duas(Math.exp(mediana(razoes))),
    casos: razoes.length,
    erro_mediano_antes: duas(antes),
    erro_mediano_depois: duas(depois),
    entra: razoes.length >= minimo && depois < antes,
    erros,
  };
}

function agrupar(casos: Caso[], chaveDe: (c: Caso) => string | null): Map<string, Caso[]> {
  const grupos = new Map<string, Caso[]>();
  for (const c of casos) {
    const chave = chaveDe(c);
    if (chave) grupos.set(chave, [...(grupos.get(chave) ?? []), c]);
  }
  return grupos;
}

/** O erro de um caso no fim: o do ramo, se entrou; senão o do setor; senão sem fator. */
function erroFinal(c: Caso, grupos: Map<string, Grupo>, porGrupo: Map<string, Caso[]>): number {
  const valido = [c.divisao, c.secao].map((k) => (k ? grupos.get(k) : undefined)).find((g) => g?.entra);
  if (!valido) return vezes(c.razao);
  return valido.erros[porGrupo.get(valido.chave)!.indexOf(c)];
}

// ---------- principal ----------

function relatorio(grupos: Grupo[], antes: number, depois: number, casos: number) {
  console.log(`Casos usados: ${casos}`);
  console.table(grupos.map((g) => ({ grupo: g.chave, casos: g.casos, fator: g.fator, antes: g.erro_mediano_antes, depois: Number.isNaN(g.erro_mediano_depois) ? '—' : g.erro_mediano_depois, entra: g.entra ? 'sim' : 'não' })));
  console.log(`Erro mediano geral: ${duas(antes)} vezes antes, ${duas(depois)} depois (cada caso fora do ajuste).`);
}

async function main() {
  const atual = JSON.parse(readFileSync(DESTINO, 'utf8'));
  const doTime = lerCasosDoTime();
  const base = await lerDaBase(doTime.map((t) => t.cnpj));
  const casos = doTime.map((t) => casoDe(t, base.get(t.cnpj))).filter((c): c is Caso => c != null);
  const porGrupo = new Map([...agrupar(casos, (c) => c.divisao), ...agrupar(casos, (c) => c.secao)]);
  const grupos = new Map([...porGrupo].map(([k, cs]) => [k, calibrarGrupo(k, cs.map((c) => c.razao), atual.minimo_de_casos)]));
  const antes = casos.length ? mediana(casos.map((c) => vezes(c.razao))) : null;
  const depois = casos.length ? mediana(casos.map((c) => erroFinal(c, grupos, porGrupo))) : null;
  relatorio([...grupos.values()], antes ?? 0, depois ?? 0, casos.length);

  const setores = Object.fromEntries([...grupos.values()].filter((g) => g.entra).map((g) => [g.chave, {
    fator: g.fator, casos: g.casos, erro_mediano_antes: g.erro_mediano_antes, erro_mediano_depois: g.erro_mediano_depois,
  }]));
  const hoje = new Date().toISOString().slice(0, 10);
  const saida = { ...atual, calibrado_em: hoje, casos: casos.length, erro_mediano_antes: antes && duas(antes), erro_mediano_depois: depois && duas(depois), setores };
  writeFileSync(DESTINO, `${JSON.stringify(saida, null, 1)}\n`);
  console.log(`Gravado em ${DESTINO.pathname}: ${Object.keys(setores).length} grupo(s) calibrado(s).`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
