/**
 * Converte o Tier das empresas da Prospecção em tipo de conta pelo faturamento (US-0017). Roda
 * uma vez, antes da migration 20261123160000, que apaga a coluna. Com o túnel SSH aberto e o
 * CLI do Supabase logado no projeto:
 *
 *   npx vite-node scripts/receita/converter-tier.ts              simula e mostra as contagens
 *   npx vite-node scripts/receita/converter-tier.ts -- --aplicar grava o tipo de conta
 *
 * Mesma regra de mover para qualificação (src/lib/prospecting/tipoDeConta.ts): o faturamento
 * do time, senão o estimado pela base da Receita, sem o piso do porte. O número do Tier não
 * decide nada (decisão do Victor, 23/11/2026). Só grava onde `tipo_conta` é nulo. O script só
 * imprime contagens, nunca CNPJ nem faturamento.
 */

import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { faturamentoDaSugestao, sugerirTipoDeConta } from '@/lib/prospecting/tipoDeConta';
import type { BaseDoFaturamento } from '@/types/filtrosReceita';
import type { TipoDeConta } from '@/types/prospect';
import { ARQUIVO_DESTINO, lerAmbiente, psql, terminou } from './psql';

const APLICAR = process.argv.includes('--aplicar');

const CONSULTA_COM_TIER = `SELECT id, regexp_replace(coalesce(cnpj, ''), '\\D', '', 'g') AS cnpj, faturamento_anual
  FROM prospect_companies
  WHERE nullif(btrim(tier), '') IS NOT NULL AND tipo_conta IS NULL`.replace(/\s+/g, ' ');

interface ComTier {
  id: string;
  cnpj: string;
  faturamento_anual: number | null;
}

interface DaBase {
  faturamento_estimado: number;
  faturamento_base: BaseDoFaturamento;
}

/** Consulta pelo CLI do Supabase (a sessão do CLI, nada no repositório). */
function consultarPulse<T>(sql: string): T[] {
  const r = spawnSync('npx', ['supabase', 'db', 'query', '--linked', '-o', 'json', sql], { encoding: 'utf8' });
  if (r.status !== 0) {
    const motivo = (r.stderr ?? '').trim().split('\n').slice(-2).join(' ');
    throw new Error(`Falha no Pulse (${motivo || `código ${r.status}`}). Confira o login do CLI do Supabase.`);
  }
  const texto = r.stdout.slice(r.stdout.indexOf('{'), r.stdout.lastIndexOf('}') + 1);
  return (JSON.parse(texto) as { rows: T[] }).rows;
}

async function lerDaBase(cnpjs: string[]): Promise<Map<string, DaBase>> {
  const base = new Map<string, DaBase>();
  const lista = cnpjs.filter((c) => /^\d{14}$/.test(c)).map((c) => `'${c}'`).join(',');
  if (!lista) return base;
  const consulta = `SELECT cnpj, faturamento_estimado, faturamento_base FROM pulse.empresas WHERE cnpj IN (${lista})`;
  const leitura = psql(lerAmbiente(ARQUIVO_DESTINO), ['-c', `\\copy (${consulta}) TO STDOUT`]);
  for await (const linha of createInterface({ input: leitura.stdout! })) {
    const [cnpj, valor, origem] = linha.split('\t');
    base.set(cnpj, { faturamento_estimado: Number(valor), faturamento_base: origem as BaseDoFaturamento });
  }
  await terminou(leitura, 'leitura da base');
  return base;
}

function tipoDe(e: ComTier, base: Map<string, DaBase>): TipoDeConta | null {
  const daBase = base.get(e.cnpj);
  return sugerirTipoDeConta(faturamentoDaSugestao({
    faturamento_informado: e.faturamento_anual == null ? null : Number(e.faturamento_anual),
    faturamento_estimado: daBase?.faturamento_estimado ?? null,
    faturamento_base: daBase?.faturamento_base ?? null,
  }));
}

function gravar(tipos: Array<[string, TipoDeConta]>) {
  const valores = tipos.map(([id, tipo]) => `('${id}'::uuid, '${tipo}')`).join(', ');
  consultarPulse(`UPDATE prospect_companies c SET tipo_conta = v.tipo FROM (VALUES ${valores}) AS v(id, tipo)
    WHERE c.id = v.id AND c.tipo_conta IS NULL RETURNING c.id`.replace(/\s+/g, ' '));
}

async function main() {
  const empresas = consultarPulse<ComTier>(CONSULTA_COM_TIER);
  const base = await lerDaBase(empresas.map((e) => e.cnpj));
  const tipos = empresas.map((e) => [e.id, tipoDe(e, base)] as const);
  const convertidas = tipos.filter((t): t is [string, TipoDeConta] => t[1] != null);
  const porTipo = Object.fromEntries(['ancora', 'ponte', 'satelite'].map((t) => [t, convertidas.filter(([, x]) => x === t).length]));
  console.log(`Com Tier e sem tipo de conta: ${empresas.length}`);
  console.log(`Convertidas pelo faturamento: ${convertidas.length}`, porTipo);
  console.log(`Ficam sem tipo (sem CNPJ, sem faturamento ou abaixo de R$ 10 mi): ${empresas.length - convertidas.length}`);
  if (!APLICAR) return console.log('Simulação: nada gravado. Rode com -- --aplicar para gravar.');
  if (convertidas.length) gravar(convertidas);
  console.log('Tipo de conta gravado.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
