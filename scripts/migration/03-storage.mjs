/**
 * 03 — Storage: copia todos os buckets e arquivos da origem para o destino.
 *
 * Idempotente e retomável: arquivo que já existe no destino com o mesmo
 * tamanho é pulado, então se cair no meio basta rodar de novo.
 *
 * Uso:
 *   node --env-file=.env.migration scripts/migration/03-storage.mjs
 *   node --env-file=.env.migration scripts/migration/03-storage.mjs --dry-run
 *   node --env-file=.env.migration scripts/migration/03-storage.mjs --bucket=tax-documents
 *
 * Privacidade: os caminhos carregam nome/id de pessoa e documento fiscal, então
 * por padrão o log mostra só contagens. `--verbose` imprime caminho (use só
 * para depurar, e não cole a saída em ticket).
 */

import { buildClients, listBuckets, walkBucket, fmt } from './_lib.mjs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const ONLY_BUCKET = args.find((a) => a.startsWith('--bucket='))?.split('=')[1];
const CONCURRENCY = 4;

// Buckets que NÃO devem ser copiados.
// `database_export_*` é criado pelo próprio "Export data" do Lovable e guarda o
// dump completo do banco — salário, custo, margem e hash de senha. Copiar isso
// para o projeto novo seria duplicar o artefato mais sensível que existe, num
// bucket que ninguém lembra de limpar.
const IGNORAR = [/^database_export_/];

/** Executa `worker` sobre `items` com paralelismo limitado. */
async function mapLimit(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) await worker(queue.pop());
  });
  await Promise.all(runners);
}

async function ensureBucket(target, bucket, existing) {
  if (existing.has(bucket.id)) return;
  if (DRY_RUN) {
    console.log(`   [dry-run] criaria o bucket ${bucket.id} (public=${bucket.public})`);
    return;
  }
  const { error } = await target.db.storage.createBucket(bucket.id, {
    public: bucket.public,
    fileSizeLimit: bucket.file_size_limit ?? undefined,
    allowedMimeTypes: bucket.allowed_mime_types ?? undefined,
  });
  if (error) throw new Error(`createBucket ${bucket.id}: ${error.message}`);
  console.log(`   ✓ bucket ${bucket.id} criado`);
}

async function copyFile(clients, bucketId, file, stats) {
  const { data: blob, error: dlErr } = await clients.origin.db.storage.from(bucketId).download(file.path);
  if (dlErr) {
    stats.erros.push(`download ${file.path}: ${dlErr.message}`);
    return;
  }
  const { error: upErr } = await clients.target.db.storage
    .from(bucketId)
    .upload(file.path, blob, { contentType: file.mime, upsert: true });
  if (upErr) {
    stats.erros.push(`upload ${file.path}: ${upErr.message}`);
    return;
  }
  stats.copiados += 1;
  if (VERBOSE) console.log(`     + ${file.path}`);
}

async function syncBucket(clients, bucket, targetBuckets) {
  console.log(`\n🪣 ${bucket.id}`);
  await ensureBucket(clients.target, bucket, targetBuckets);

  const originFiles = await walkBucket(clients.origin, bucket.id);
  const targetFiles = targetBuckets.has(bucket.id) && !DRY_RUN
    ? await walkBucket(clients.target, bucket.id)
    : [];
  const jaLa = new Map(targetFiles.map((f) => [f.path, f.size]));

  const pendentes = originFiles.filter((f) => jaLa.get(f.path) !== f.size);
  const stats = { copiados: 0, pulados: originFiles.length - pendentes.length, erros: [] };

  console.log(`   origem: ${fmt(originFiles.length)} arquivo(s) · pendente(s): ${fmt(pendentes.length)}`);

  if (DRY_RUN) {
    console.log(`   [dry-run] copiaria ${fmt(pendentes.length)} arquivo(s)`);
    return stats;
  }

  await mapLimit(pendentes, CONCURRENCY, (file) => copyFile(clients, bucket.id, file, stats));
  console.log(`   ✓ copiados: ${fmt(stats.copiados)} · pulados: ${fmt(stats.pulados)} · erros: ${stats.erros.length}`);
  return stats;
}

async function run() {
  console.log(`🚚 Migração de Storage${DRY_RUN ? ' (dry-run)' : ''}\n`);
  const clients = await buildClients();

  let originBuckets = await listBuckets(clients.origin);
  const targetBuckets = await listBuckets(clients.target);

  // Em modo usuário a RLS de storage.buckets normalmente esconde a listagem.
  // O destino já tem os buckets restaurados do dump, com a mesma configuração —
  // então ele serve de catálogo confiável de quais buckets existem.
  if (originBuckets.size === 0 && targetBuckets.size > 0) {
    console.log(`   ℹ️  a origem não listou buckets (RLS); usando os ${targetBuckets.size} do destino como catálogo`);
    originBuckets = targetBuckets;
  }

  const alvos = [...originBuckets.values()]
    .filter((b) => !ONLY_BUCKET || b.id === ONLY_BUCKET)
    .filter((b) => {
      const pular = IGNORAR.some((re) => re.test(b.id));
      if (pular) console.log(`   ⏭  ${b.id} ignorado (bucket de export — contém o dump)`);
      return !pular;
    });
  if (alvos.length === 0) {
    console.error(`❌ Nenhum bucket para migrar${ONLY_BUCKET ? ` (--bucket=${ONLY_BUCKET} não existe na origem)` : ''}.`);
    process.exit(1);
  }
  console.log(`Buckets a migrar: ${alvos.map((b) => b.id).join(', ')}`);

  const erros = [];
  for (const bucket of alvos) {
    const stats = await syncBucket(clients, bucket, targetBuckets);
    erros.push(...stats.erros);
  }

  if (erros.length > 0) {
    console.log(`\n⚠️  ${erros.length} erro(s):`);
    for (const e of erros.slice(0, 20)) console.log(`   · ${e}`);
    if (erros.length > 20) console.log(`   … e outros ${erros.length - 20}`);
    console.log('\nRode de novo — o que já foi copiado é pulado.');
    process.exit(1);
  }

  console.log('\n✅ Storage sincronizado. Confirme com 99-verify.mjs.');
}

run().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
