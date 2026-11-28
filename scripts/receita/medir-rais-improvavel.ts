// US-0054: mede, sem gravar nada, quantas empresas da Base a regra da RAIS improvável muda.
//
// Uso (com o túnel SSH aberto: ssh -N -L 5433:localhost:5432 root@<vps>):
//   npx vite-node scripts/receita/medir-rais-improvavel.ts
//
// Lê pulse.empresas com o usuário da carga (só SELECT). Regra aprovada em 26/11/2026: RAIS abaixo
// de 10 com capital a partir de R$ 10 mi ou porte "demais", ou RAIS menor que um quinto da
// estimativa por empresas parecidas. A Base só tem porte "demais", então a primeira parte vale
// para toda RAIS abaixo de 10; o script mede as duas partes separadas e a variante só com capital.

import { funcionariosPrevistos } from '@/lib/prospecting/faturamentoEstimado';
import type { EmpresaParaModelo } from '@/types/filtrosReceita';
import { ARQUIVO_DESTINO, lerAmbiente, psql, terminou } from './psql';

const CONSULTA = `COPY (
  SELECT cnpj, nome_exibicao, cnae_principal, secao, natureza_juridica, capital_social, data_inicio_atividade,
         uf, funcionarios, filiais_ativas, socios, divida_total, tem_email, tem_telefone
  FROM pulse.empresas WHERE funcionarios IS NOT NULL
) TO STDOUT WITH (FORMAT csv, HEADER false)`;

interface Linha { cnpj: string; nome: string; cnae: string; rais: number; capital: number; previsto: number }

const MINIMO = 10;
const CAPITAL_MINIMO = 10_000_000;
const FRACAO = 5;

function paraModelo(c: string[]): EmpresaParaModelo {
  return {
    nome: c[1], secao: c[3] || null, natureza: c[4] || null, capital: c[5] ? Number(c[5]) : null, abertura: c[6] || null,
    uf: c[7] || null, filiais: Number(c[9] || 0), socios: Number(c[10] || 0), divida: c[11] ? Number(c[11]) : null,
    email: c[12] === 't', telefone: c[13] === 't',
  };
}

async function ler(): Promise<Linha[]> {
  const ambiente = lerAmbiente(ARQUIVO_DESTINO);
  const processo = psql(ambiente, ['-At', '-c', CONSULTA]);
  let texto = '';
  processo.stdout?.on('data', (d) => (texto += d));
  await terminou(processo, 'psql');
  const hoje = new Date().toISOString().slice(0, 10);
  return texto.split('\n').filter(Boolean).map((l) => {
    const c = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((x) => x.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    const e = paraModelo(c);
    return { cnpj: c[0], nome: c[1], cnae: c[2], rais: Number(c[8]), capital: e.capital ?? 0, previsto: Math.round(funcionariosPrevistos(e, hoje)) };
  });
}

const fmt = (n: number) => n.toLocaleString('pt-BR');

async function main() {
  const linhas = await ler();
  const baixa = linhas.filter((l) => l.rais < MINIMO);
  const baixaComCapital = baixa.filter((l) => l.capital >= CAPITAL_MINIMO);
  const fracao = linhas.filter((l) => l.rais * FRACAO < l.previsto);
  const aprovada = linhas.filter((l) => l.rais < MINIMO || l.rais * FRACAO < l.previsto);
  const soCapital = linhas.filter((l) => (l.rais < MINIMO && l.capital >= CAPITAL_MINIMO) || l.rais * FRACAO < l.previsto);
  console.log(`Empresas com RAIS na Base: ${fmt(linhas.length)}`);
  console.log(`RAIS < ${MINIMO}: ${fmt(baixa.length)} (com capital >= R$ 10 mi: ${fmt(baixaComCapital.length)})`);
  console.log(`RAIS < 1/${FRACAO} da estimativa: ${fmt(fracao.length)}`);
  console.log(`Regra aprovada (RAIS < ${MINIMO} OU < 1/${FRACAO}): ${fmt(aprovada.length)}`);
  console.log(`Variante (RAIS < ${MINIMO} só com capital >= R$ 10 mi, OU < 1/${FRACAO}): ${fmt(soCapital.length)}`);
  // Variantes estreitas: capital a partir de R$ 10 mi, fora de holdings (64), imobiliárias (68) e
  // sedes de grupo (7020), e a estimativa muito acima da RAIS.
  const fora = (l: Linha) => ['64', '68'].includes(l.cnae.slice(0, 2)) || l.cnae.startsWith('7020') || l.cnae.startsWith('4110');
  const base = linhas.filter((l) => l.capital >= CAPITAL_MINIMO && !fora(l));
  const variantes: Array<[string, (l: Linha) => boolean]> = [
    ['V1 capital >= 10 mi, fora holdings, RAIS < 10', (l) => l.rais < MINIMO],
    ['V2 V1 e estimativa >= 50', (l) => l.rais < MINIMO && l.previsto >= 50],
    ['V3 capital >= 10 mi, fora holdings, RAIS < 1/10 da estimativa', (l) => l.rais * 10 < l.previsto],
    ['V4 V1 e RAIS < 1/10 da estimativa', (l) => l.rais < MINIMO && l.rais * 10 < l.previsto],
  ];
  console.log(`\nCapital >= R$ 10 mi, fora de holdings e imobiliárias: ${fmt(base.length)}`);
  for (const [nome, regra] of variantes) console.log(`  ${nome}: ${fmt(base.filter(regra).length)}`);
  const v4 = base.filter((l) => l.rais < MINIMO && l.rais * 10 < l.previsto);
  console.log('\nV4, maiores capitais:');
  for (const l of [...v4].sort((a, b) => b.capital - a.capital).slice(0, 12)) {
    console.log(`  ${l.nome} · CNAE ${l.cnae} · capital R$ ${fmt(Math.round(l.capital / 1e6))} mi · RAIS ${fmt(l.rais)} → ${fmt(l.previsto)}`);
  }
  console.log('V4, amostra do meio (capital R$ 10 a 30 mi):');
  for (const l of v4.filter((x) => x.capital < 30_000_000).slice(0, 8)) {
    console.log(`  ${l.nome} · CNAE ${l.cnae} · capital R$ ${fmt(Math.round(l.capital / 1e6))} mi · RAIS ${fmt(l.rais)} → ${fmt(l.previsto)}`);
  }
  const v2 = base.filter((l) => l.rais < MINIMO && l.previsto >= 50);
  console.log('\nV2, amostra aleatória de 15:');
  for (const l of [...v2].sort(() => 0.5 - Math.random()).slice(0, 15)) {
    console.log(`  ${l.nome} · CNAE ${l.cnae} · capital R$ ${fmt(Math.round(l.capital / 1e6))} mi · RAIS ${fmt(l.rais)} → ${fmt(l.previsto)}`);
  }
  console.log('\nMaiores capitais que a regra aprovada muda (RAIS → estimativa):');
  for (const l of [...aprovada].sort((a, b) => b.capital - a.capital).slice(0, 15)) {
    console.log(`  ${l.nome} · CNAE ${l.cnae} · capital R$ ${fmt(Math.round(l.capital / 1e6))} mi · RAIS ${fmt(l.rais)} → ${fmt(l.previsto)}`);
  }
  const gecal = linhas.find((l) => l.cnpj.startsWith('20302873'));
  if (gecal) console.log(`\nGecal: RAIS ${gecal.rais} → estimativa ${fmt(gecal.previsto)}`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
