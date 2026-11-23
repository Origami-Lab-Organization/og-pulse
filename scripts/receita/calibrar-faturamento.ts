/**
 * Calibra o modelo de empresas parecidas do faturamento estimado (US-0006). Com o túnel SSH
 * aberto, depois de uma carga: `npx vite-node scripts/receita/calibrar-faturamento.ts`.
 *
 * Regressão ridge do log dos funcionários da RAIS sobre `caracteristicasDoModelo`, a mesma
 * função da carga. 20% das empresas ficam de fora para medir o erro. Grava só coeficientes e
 * medidas em `src/lib/prospecting/modeloDeFaturamento.json`, nunca dado de empresa.
 */

import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { CARACTERISTICAS, caracteristicasDoModelo } from '@/lib/prospecting/faturamentoEstimado';
import type { EmpresaParaModelo } from '@/types/filtrosReceita';
import { ARQUIVO_DESTINO, lerAmbiente, psql, terminou } from './psql';

const DESTINO = new URL('../../src/lib/prospecting/modeloDeFaturamento.json', import.meta.url);
const LAMBDA = 1;
const FAIXAS: ReadonlyArray<[number, number]> = [[1, 9], [10, 49], [50, 249], [250, Infinity]];

const CONSULTA = `SELECT cnpj, secao, natureza_juridica, capital_social, data_inicio_atividade, filiais_ativas,
  socios, uf, divida_total, tem_email, tem_telefone, funcionarios
  FROM pulse.empresas WHERE funcionarios > 0`.replace(/\s+/g, ' ');

const NULO = '\\N';
const VERDADEIRO = 't';
const valor = (v: string) => (v === NULO ? null : v);
const numero = (v: string) => (v === NULO ? null : Number(v));

interface Linha {
  teste: boolean;
  x: number[];
  y: number;
}

function lerLinha(texto: string, hoje: string): Linha {
  const c = texto.split('\t');
  const empresa: EmpresaParaModelo = {
    secao: valor(c[1]), natureza: valor(c[2]), capital: numero(c[3]), abertura: valor(c[4]),
    filiais: Number(c[5]), socios: Number(c[6]), uf: valor(c[7]), divida: numero(c[8]),
    email: c[9] === VERDADEIRO, telefone: c[10] === VERDADEIRO,
  };
  return { teste: Number(c[0].slice(-1)) % 5 === 0, x: caracteristicasDoModelo(empresa, hoje), y: Math.log(Number(c[11])) };
}

/** Acumula XᵀX e Xᵀy do treino; guarda o teste para medir. */
async function lerEmpresas(hoje: string) {
  const k = CARACTERISTICAS.length;
  const xtx = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const xty = new Array<number>(k).fill(0);
  const teste: Linha[] = [];
  let treino = 0;
  const leitura = psql(lerAmbiente(ARQUIVO_DESTINO), ['-c', `\\copy (${CONSULTA}) TO STDOUT`]);
  for await (const texto of createInterface({ input: leitura.stdout! })) {
    const l = lerLinha(texto, hoje);
    if (l.teste) { teste.push(l); continue; }
    treino += 1;
    for (let i = 0; i < k; i++) {
      if (!l.x[i]) continue;
      xty[i] += l.x[i] * l.y;
      for (let j = 0; j < k; j++) xtx[i][j] += l.x[i] * l.x[j];
    }
  }
  await terminou(leitura, 'leitura de pulse.empresas');
  return { xtx, xty, teste, treino };
}

/** Resolve A·b = y por eliminação de Gauss com pivô parcial. */
function resolver(a: number[][], y: number[]): number[] {
  const n = y.length;
  const m = a.map((linha, i) => [...linha, y[i]]);
  for (let c = 0; c < n; c++) {
    const p = m.slice(c).reduce((melhor, _, i) => (Math.abs(m[c + i][c]) > Math.abs(m[melhor][c]) ? c + i : melhor), c);
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / m[c][c];
      for (let j = c; j <= n; j++) m[r][j] -= f * m[c][j];
    }
  }
  const b = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) b[r] = (m[r][n] - jaResolvidos(m[r], b, r, n)) / m[r][r];
  return b;
}

function jaResolvidos(linha: number[], b: number[], r: number, n: number): number {
  let s = 0;
  for (let j = r + 1; j < n; j++) s += linha[j] * b[j];
  return s;
}

const mediana = (v: number[]) => {
  const o = [...v].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)] ?? 0;
};

function medir(teste: Linha[], beta: number[]) {
  const prever = (x: number[]) => x.reduce((s, v, i) => s + v * beta[i], 0);
  const erros = teste.map((l) => ({ real: Math.exp(l.y), razao: Math.exp(Math.abs(l.y - prever(l.x))), res: l.y - prever(l.x) }));
  const media = teste.reduce((s, l) => s + l.y, 0) / teste.length;
  const total = teste.reduce((s, l) => s + (l.y - media) ** 2, 0);
  const r2 = 1 - erros.reduce((s, e) => s + e.res ** 2, 0) / total;
  const porFaixa = FAIXAS.map(([de, ate]) => {
    const f = erros.filter((e) => e.real >= de && e.real <= ate);
    return { funcionarios: ate === Infinity ? `${de} ou mais` : `${de} a ${ate}`, empresas: f.length, erro_mediano: +mediana(f.map((e) => e.razao)).toFixed(1) };
  });
  const dentroDoDobro = erros.filter((e) => e.razao <= 2).length / erros.length;
  return { r2: +r2.toFixed(3), erro_mediano: +mediana(erros.map((e) => e.razao)).toFixed(1), dentro_do_dobro: +dentroDoDobro.toFixed(2), por_faixa: porFaixa };
}

async function main() {
  const hoje = new Date().toISOString().slice(0, 10);
  const { xtx, xty, teste, treino } = await lerEmpresas(hoje);
  xtx.forEach((linha, i) => { if (i > 0) linha[i] += LAMBDA; });
  const beta = resolver(xtx, xty);
  const medidas = medir(teste, beta);
  const modelo = {
    calibrado_em: hoje,
    empresas_no_treino: treino,
    empresas_no_teste: teste.length,
    ...medidas,
    nomes: CARACTERISTICAS,
    coeficientes: beta.map((b) => +b.toFixed(6)),
  };
  writeFileSync(DESTINO, `${JSON.stringify(modelo, null, 1)}\n`);
  console.log(`Treino: ${treino.toLocaleString('pt-BR')} empresas; teste: ${teste.length.toLocaleString('pt-BR')}`);
  console.log(`R² ${medidas.r2}; erro mediano ${medidas.erro_mediano}×; dentro do dobro: ${Math.round(medidas.dentro_do_dobro * 100)}%`);
  medidas.por_faixa.forEach((f) => console.log(`  ${f.funcionarios} funcionários: ${f.empresas} empresas, erro mediano ${f.erro_mediano}×`));
}

main().catch((erro: Error) => {
  console.error(`Falhou: ${erro.message}`);
  process.exit(1);
});
