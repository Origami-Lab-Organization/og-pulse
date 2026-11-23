/**
 * Monta src/lib/prospecting/receitaPorPessoa.json (US-0006): receita por pessoa ocupada por
 * classe da CNAE e por porte, das pesquisas anuais do IBGE de 2024, pela API do SIDRA.
 * `npx vite-node scripts/receita/montar-receita-por-pessoa.ts` — refazer quando o IBGE
 * publicar um ano novo, e levar o resultado à aprovação antes de carregar.
 *
 * Valores em mil reais por pessoa, truncados. Os fatores de porte dividem a produtividade da
 * faixa pela do recorte em que a classe foi medida (30+ pessoas na indústria, 20+ no
 * comércio, todas nos serviços). Só lê dados agregados e públicos.
 */

import { writeFileSync } from 'node:fs';

const DESTINO = new URL('../../src/lib/prospecting/receitaPorPessoa.json', import.meta.url);
const ANO = '2024';

type Linha = { chave: string[]; receita: number; pessoas: number };
type Faixa = [number, number, number];

async function sidra(tabela: number, variaveis: string, classificacao: string): Promise<Linha[]> {
  const url = `https://servicodados.ibge.gov.br/api/v3/agregados/${tabela}/periodos/${ANO}/variaveis/${variaveis}?localidades=N1[all]&classificacao=${classificacao}`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`SIDRA ${tabela}: ${resposta.status}`);
  const dados = (await resposta.json()) as Array<{ id: string; resultados: Array<{ classificacoes: Array<{ categoria: Record<string, string> }>; series: Array<{ serie: Record<string, string> }> }> }>;
  const [receita, pessoas] = variaveis.split('|');
  const porChave = new Map<string, Linha>();
  for (const v of dados) {
    for (const r of v.resultados) {
      const chave = r.classificacoes.map((c) => Object.values(c.categoria)[0]);
      const linha = porChave.get(chave.join('|')) ?? { chave, receita: 0, pessoas: 0 };
      const valor = Number(r.series[0].serie[ANO]);
      if (v.id === receita) linha.receita = Number.isFinite(valor) ? valor * 1000 : 0;
      if (v.id === pessoas) linha.pessoas = Number.isFinite(valor) ? valor : 0;
      porChave.set(chave.join('|'), linha);
    }
  }
  return [...porChave.values()];
}

const milPorPessoa = (l: { receita: number; pessoas: number }) => (l.pessoas > 0 && l.receita > 0 ? l.receita / l.pessoas / 1000 : null);
/** "10.91-1 Fabricação…" → "1091"; "46.1 …" → "461"; "4641 …" → "4641"; "45 …" → "45". */
const codigo = (nome: string) => nome.split(' ')[0].replace(/-\d$/, '').replace(/\D/g, '');

function faixaDe(nome: string): [number, number] | null {
  const ate = nome.match(/^Até (\d+)/);
  if (ate) return [1, Number(ate[1])];
  const de = nome.match(/^(\d+) a (\d+)/);
  if (de) return [Number(de[1]), Number(de[2])];
  const mais = nome.match(/^(\d+) ou mais/);
  return mais ? [Number(mais[1]), 1e9] : null;
}

const soma = (linhas: Linha[]) => linhas.reduce((a, l) => ({ receita: a.receita + l.receita, pessoas: a.pessoas + l.pessoas }), { receita: 0, pessoas: 0 });
const trunc = (v: number | null) => (v == null ? null : Math.trunc(v));
const tres = (v: number) => Math.trunc(v * 1000) / 1000;

/** Classes, grupos e divisões de uma tabela por CNAE. */
function porCodigo(linhas: Linha[]) {
  const classes: Record<string, number> = {};
  const grupos: Record<string, number> = {};
  const divisoes: Record<string, number> = {};
  for (const l of linhas) {
    const c = codigo(l.chave[0]);
    const v = trunc(milPorPessoa(l));
    if (!v || !c) continue;
    if (c.length === 4) classes[c] = v;
    else if (c.length === 3) grupos[c] = v;
    else if (c.length === 2) divisoes[c] = v;
  }
  return { classes, grupos, divisoes };
}

/** Fatores de porte em relação ao recorte em que a classe foi medida (a partir de `desde` pessoas). */
function fatores(linhas: Linha[], desde: number): Faixa[] {
  const comFaixa = linhas.map((l) => ({ l, f: faixaDe(l.chave[l.chave.length - 1]) })).filter((x) => x.f);
  const referencia = milPorPessoa(soma(comFaixa.filter((x) => x.f![0] >= desde).map((x) => x.l)))!;
  return comFaixa.map(({ l, f }) => [f![0], f![1], tres((milPorPessoa(l) ?? referencia) / referencia)]);
}

async function industria() {
  const classes = porCodigo(await sidra(10473, '806|631', '12762[all]'));
  const porte = (await sidra(10452, '806|631', '9117[all]|319[all]')).filter((l) => l.chave[0].startsWith('Indústrias de transformação'));
  return { ...classes, porte: fatores(porte, 30) };
}

async function comercio() {
  const classes = porCodigo(await sidra(10655, '643|631', '11070[all]'));
  const linhas = await sidra(10647, '643|312', '11065[all]|319[all]');
  const divisao: Record<string, string> = { '45': 'Comércio de veículos', '46': 'Comércio por atacado', '47': 'Comércio varejista' };
  const porte = Object.fromEntries(Object.entries(divisao).map(([d, nome]) => [d, fatores(linhas.filter((l) => l.chave[0].startsWith(nome)), 20)]));
  return { ...classes, porte };
}

async function construcao() {
  const linhas = await sidra(6667, '1240|631', '12223[all]|319[all]');
  const grupos: Record<string, Faixa[]> = {};
  for (const l of linhas) {
    const g = codigo(l.chave[0]);
    const f = faixaDe(l.chave[1]);
    const v = trunc(milPorPessoa(l));
    if (!g || !f || !v) continue;
    (grupos[g] ??= []).push([f[0], f[1], v]);
  }
  return { grupos };
}

// Divisão da CNAE → atividades da PAS que a cobrem (mesmo mapa do anexo da US-0006).
const ATIVIDADES_DA_PAS: Record<string, string[]> = {
  '49': ['5.1.1', '5.1.2', '5.1.3'], '50': ['5.1.4'], '51': ['5.1.5'], '52': ['5.1.6'], '53': ['5.2'],
  '55': ['2.1'], '56': ['2.2'], '58': ['3.4'], '59': ['3.3'], '60': ['3.3'], '61': ['3.1'], '62': ['3.2'], '63': ['3.2'],
  '68': ['6.'], '69': ['4.1'], '70': ['4.1'], '71': ['4.1'], '72': ['4.1'], '73': ['4.1'], '74': ['4.1'], '75': ['4.1'],
  '77': ['4.2'], '78': ['4.3'], '79': ['4.4'], '80': ['4.5'], '81': ['4.6'], '82': ['4.7'],
  '90': ['2.3'], '91': ['2.3'], '93': ['2.3'], '95': ['7.2', '7.3'], '96': ['2.4'],
  '37': ['8.3'], '38': ['8.3'], '39': ['8.3'], '66': ['8.2'],
};

/** Serviços: fator para menos de 20 pessoas e para 20 ou mais, em relação a todas. */
async function servicos() {
  const todas = await sidra(10758, '643|631', '12355[all]');
  const vinteMais = await sidra(10760, '643|631', '1369[all]');
  const achar = (linhas: Linha[], cod: string) => linhas.find((l) => l.chave[0].split(' ')[0] === cod);
  const porte: Record<string, [number, number]> = {};
  for (const [d, cods] of Object.entries(ATIVIDADES_DA_PAS)) {
    const t = soma(cods.map((c) => achar(todas, c)!).filter(Boolean));
    const v = soma(cods.map((c) => achar(vinteMais, c)!).filter(Boolean));
    const geral = milPorPessoa(t);
    const grandes = milPorPessoa(v);
    const pequenas = milPorPessoa({ receita: t.receita - v.receita, pessoas: t.pessoas - v.pessoas });
    if (!geral || !grandes || !pequenas) continue;
    porte[d] = [tres(pequenas / geral), tres(grandes / geral)];
  }
  return { porte };
}

async function main() {
  const tabela = {
    ano: ANO,
    montado_em: new Date().toISOString().slice(0, 10),
    fontes: {
      industria: 'IBGE, PIA-Empresa 2024: tabela 10473 (classes, empresas com 30+ pessoas) e 10452 (faixas de pessoal ocupado)',
      comercio: 'IBGE, PAC 2024: tabela 10655 (classes, empresas com 20+ pessoas) e 10647 (divisão × faixas)',
      construcao: 'IBGE, PAIC 2024: tabela 6667 (grupos × faixas, empresas com 5+ pessoas)',
      servicos: 'IBGE, PAS 2024: tabelas 10758 (todas) e 10760 (20+ pessoas)',
    },
    industria: await industria(),
    comercio: await comercio(),
    construcao: await construcao(),
    servicos: await servicos(),
  };
  writeFileSync(DESTINO, `${JSON.stringify(tabela, null, 1)}\n`);
  const i = tabela.industria;
  console.log(`Indústria: ${Object.keys(i.classes).length} classes, ${Object.keys(i.grupos).length} grupos; porte`, i.porte);
  console.log(`Comércio: ${Object.keys(tabela.comercio.classes).length} classes, ${Object.keys(tabela.comercio.grupos).length} grupos`);
  console.log(`Construção: ${Object.keys(tabela.construcao.grupos).length} grupos; serviços: ${Object.keys(tabela.servicos.porte).length} divisões com porte`);
}

main().catch((erro: Error) => {
  console.error(`Falhou: ${erro.message}`);
  process.exit(1);
});
