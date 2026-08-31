/**
 * 00 — Preflight: prova que temos acesso aos dois projetos antes de mover nada.
 *
 * Não escreve NADA em nenhum dos lados. Roda quantas vezes quiser.
 *
 * Uso: node --env-file=.env.migration scripts/migration/00-preflight.mjs
 */

import { buildClients, listExposedTables, listUserIds, listBuckets, fmt } from './_lib.mjs';

async function inspect(project) {
  const tables = await listExposedTables(project);
  const users = await listUserIds(project);
  const buckets = await listBuckets(project);
  return { tables, users, buckets };
}

function report(label, snapshot) {
  console.log(`\n📦 ${label}`);
  console.log(`   tabelas/views expostas: ${fmt(snapshot.tables.length)}`);
  console.log(`   usuários em auth.users: ${fmt(snapshot.users.length)}`);
  console.log(`   buckets de storage:     ${snapshot.buckets.size}`);
  if (snapshot.buckets.size > 0) {
    console.log(`     ${[...snapshot.buckets.keys()].join(', ')}`);
  }
}

function verdict(origin, target) {
  const problems = [];
  const warnings = [];

  if (origin.tables.length === 0) problems.push('A origem não expôs tabela nenhuma — service key errada?');
  if (target.users.length > 0) warnings.push(`O destino já tem ${fmt(target.users.length)} usuário(s).`);
  if (target.tables.length > 0) warnings.push(`O destino já expõe ${fmt(target.tables.length)} tabela(s)/view(s).`);

  return { problems, warnings };
}

async function run() {
  console.log('🔎 Preflight da migração (somente leitura)\n');
  const { origin, target } = await buildClients();

  const [originSnap, targetSnap] = await Promise.all([inspect(origin), inspect(target)]);
  report('ORIGEM  (Lovable Cloud)', originSnap);
  report('DESTINO (Supabase próprio)', targetSnap);

  const { problems, warnings } = verdict(originSnap, targetSnap);

  console.log('');
  for (const w of warnings) console.log(`⚠️  ${w}`);
  for (const p of problems) console.log(`❌ ${p}`);

  if (problems.length > 0) process.exit(1);

  if (warnings.length > 0) {
    console.log('\n⚠️  O destino NÃO está vazio. Confirme que é o projeto certo antes do restore —');
    console.log('   restaurar sobre dado existente é o tipo de erro que não tem desfazer.');
  } else {
    console.log('✅ Acesso aos dois lados confirmado e destino vazio. Pode seguir para o restore.');
  }
}

run().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
