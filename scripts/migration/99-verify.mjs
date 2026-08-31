/**
 * 99 — Verificação: compara origem e destino e falha se divergirem.
 *
 * Confere o que dá para conferir pela API: tabelas expostas, contagem de linhas
 * tabela por tabela, o conjunto de ids de usuário (é o que garante que as FKs
 * de employees.user_id / created_by / aprovações sobrevivem) e os arquivos de
 * cada bucket.
 *
 * O que NÃO cabe aqui — RLS, policies, triggers, cron, publication — está em
 * verify-catalog.sql, que roda nos dois SQL editors.
 *
 * Uso: node --env-file=.env.migration scripts/migration/99-verify.mjs
 */

import { buildClients, listExposedTables, countRows, listUserIds, listBuckets, walkBucket, fmt } from './_lib.mjs';

const CONCURRENCY = 8;

async function mapLimit(items, limit, worker) {
  const queue = [...items];
  const out = [];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) out.push(await worker(queue.pop()));
  });
  await Promise.all(runners);
  return out;
}

function diffSets(a, b) {
  const setB = new Set(b);
  const setA = new Set(a);
  return {
    soNaOrigem: a.filter((x) => !setB.has(x)),
    soNoDestino: b.filter((x) => !setA.has(x)),
    comuns: a.filter((x) => setB.has(x)),
  };
}

async function checkTables(clients, falhas) {
  const [origem, destino] = await Promise.all([
    listExposedTables(clients.origin),
    listExposedTables(clients.target),
  ]);
  const d = diffSets(origem, destino);

  console.log(`\n📋 Tabelas/views: origem ${fmt(origem.length)} · destino ${fmt(destino.length)}`);
  if (d.soNaOrigem.length > 0) {
    falhas.push(`${d.soNaOrigem.length} tabela(s) existem na origem e não no destino`);
    console.log(`   ❌ faltando no destino: ${d.soNaOrigem.join(', ')}`);
  }
  if (d.soNoDestino.length > 0) {
    console.log(`   ⚠️  só no destino: ${d.soNoDestino.join(', ')}`);
  }
  return d.comuns;
}

async function checkRows(clients, tables, falhas) {
  console.log(`\n🔢 Contando linhas em ${fmt(tables.length)} tabela(s)…`);
  const linhas = await mapLimit(tables, CONCURRENCY, async (table) => {
    const [o, t] = await Promise.all([countRows(clients.origin, table), countRows(clients.target, table)]);
    return { table, origem: o, destino: t };
  });

  const divergentes = linhas.filter((r) => r.origem.count !== r.destino.count);
  const comErro = linhas.filter((r) => r.origem.error || r.destino.error);

  const totalOrigem = linhas.reduce((s, r) => s + (r.origem.count ?? 0), 0);
  const totalDestino = linhas.reduce((s, r) => s + (r.destino.count ?? 0), 0);
  console.log(`   total: origem ${fmt(totalOrigem)} · destino ${fmt(totalDestino)}`);

  for (const r of divergentes.filter((x) => !x.origem.error && !x.destino.error)) {
    console.log(`   ❌ ${r.table}: origem ${fmt(r.origem.count)} · destino ${fmt(r.destino.count)}`);
  }
  for (const r of comErro) {
    console.log(`   ⚠️  ${r.table}: ${r.origem.error ?? ''} ${r.destino.error ?? ''}`.trimEnd());
  }
  if (divergentes.length > comErro.length) {
    falhas.push(`${divergentes.length - comErro.length} tabela(s) com contagem diferente`);
  }
}

async function checkUsers(clients, falhas) {
  const [origem, destino] = await Promise.all([listUserIds(clients.origin), listUserIds(clients.target)]);
  const d = diffSets(origem, destino);
  console.log(`\n👤 Usuários: origem ${fmt(origem.length)} · destino ${fmt(destino.length)}`);

  if (d.soNaOrigem.length > 0 || d.soNoDestino.length > 0) {
    falhas.push(`conjunto de ids de usuário diferente (${d.soNaOrigem.length} faltando, ${d.soNoDestino.length} sobrando)`);
    console.log(`   ❌ ids não conferem — FKs de user_id/created_by ficam órfãs`);
  } else {
    console.log('   ✓ mesmos ids nos dois lados — FKs preservadas');
  }
}

async function checkStorage(clients, falhas) {
  const [origem, destino] = await Promise.all([listBuckets(clients.origin), listBuckets(clients.target)]);
  console.log(`\n🪣 Buckets: origem ${origem.size} · destino ${destino.size}`);

  for (const id of origem.keys()) {
    if (!destino.has(id)) {
      falhas.push(`bucket ${id} não existe no destino`);
      console.log(`   ❌ ${id}: ausente no destino`);
      continue;
    }
    const [fo, ft] = await Promise.all([walkBucket(clients.origin, id), walkBucket(clients.target, id)]);
    const ok = fo.length === ft.length;
    if (!ok) falhas.push(`bucket ${id}: ${fmt(fo.length)} arquivo(s) na origem vs ${fmt(ft.length)} no destino`);
    console.log(`   ${ok ? '✓' : '❌'} ${id}: origem ${fmt(fo.length)} · destino ${fmt(ft.length)}`);
  }
}

async function run() {
  console.log('🧪 Verificação origem × destino\n');
  const clients = await buildClients();
  const falhas = [];

  const comuns = await checkTables(clients, falhas);
  await checkRows(clients, comuns, falhas);
  await checkUsers(clients, falhas);
  await checkStorage(clients, falhas);

  console.log('');
  if (falhas.length === 0) {
    console.log('✅ Origem e destino batem no que a API alcança.');
    console.log('   Falta rodar verify-catalog.sql nos dois SQL editors (RLS, policies, cron, realtime)');
    console.log('   e o teste manual: logar como colaborador comum e confirmar que ele não vê o que não deve.');
    return;
  }
  console.log(`❌ ${falhas.length} divergência(s):`);
  for (const f of falhas) console.log(`   · ${f}`);
  process.exit(1);
}

run().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
