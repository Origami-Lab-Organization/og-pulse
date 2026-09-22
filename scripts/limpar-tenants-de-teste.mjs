#!/usr/bin/env node
/**
 * Apaga tenants de teste em produção — pontual, e com trava.
 *
 * POR QUE SCRIPT E NÃO MIGRATION. Isto é limpeza de DADO, não mudança de schema. Como
 * migration, rodaria em todo ambiente para sempre e ficaria no histórico do banco de cada
 * cliente novo, apagando ids que só existem numa base. Script roda uma vez, onde se aponta.
 *
 * A TRAVA É O PONTO. O script recusa rodar se o banco não estiver exatamente como quem
 * mandou apagar viu: os cinco tenants esperados, e os dois alvos vazios. Um `DELETE` por id
 * parece seguro até alguém rodar o script num banco diferente, ou semanas depois, quando o
 * tenant que era um teste virou coisa de alguém.
 *
 * O QUE APAGA, e A ORDEM IMPORTA:
 *   1. os tenants — o cascade leva `employees` e o resto junto;
 *   2. só então os usuários de login (`auth.users`) das pessoas que estavam neles. O `DELETE`
 *      do tenant não alcança `auth.users` (outro schema), e o login que sobra é capaz de
 *      autenticar e cair numa sessão sem empresa.
 *
 * ESTA ORDEM É CORREÇÃO, não preferência. A primeira versão apagava o login primeiro e as
 * quatro chamadas voltaram 500: `employees.auth_id` ainda apontava para a linha de
 * `auth.users`, e a FK segurou. Os tenants foram apagados na sequência, o que deixou quatro
 * logins órfãos — apagados depois, à mão. Quem apaga por cima de FK apaga de fora para
 * dentro: primeiro quem referencia, depois quem é referenciado.
 *
 * NOTA DE HISTÓRICO: depois da execução de 21/09 sobraram três tenants, e a trava abaixo
 * espera cinco. Rodar de novo neste banco é recusado de propósito — o script é o registro do
 * que foi feito, e a trava é o que impede de ele virar uma arma apontada para o banco atual.
 *
 * Uso:  node scripts/limpar-tenants-de-teste.mjs           (só mostra o que faria)
 *       node scripts/limpar-tenants-de-teste.mjs --apagar  (executa)
 */

import { readFileSync } from 'node:fs';

/** Os dois alvos, por id inteiro. Nunca "todos menos os que eu quero manter". */
const APAGAR = [
  { id: 'c9a28f6e-03ad-4cee-8368-8b1c874a164d', nome: 'Origami Lab (duplicado vazio)' },
  { id: '75a8db10-6b3d-48b0-b983-bc7fb4fc7315', nome: 'Studio Pulse Demo' },
];

/** Os que ficam. Estão aqui para a trava conferir, não para serem tocados. */
const MANTER = [
  { id: '93e40db0-4946-48ba-b40f-7ee9d02734e0', nome: 'Origami Lab (a casa)' },
  { id: 'b5081f27-4df3-49a4-81b8-43fe011f3a57', nome: '8020 Consultoria em Gestão' },
  { id: '50fe361a-0423-44aa-b95d-2603a5b4e80e', nome: 'Pulse Demo Consultoria' },
];

/** Tabelas que, se tiverem qualquer linha no alvo, cancelam tudo: não era teste. */
const NAO_PODE_TER = ['projects', 'clients', 'services', 'leads', 'budgets', 'activity_types'];

const env = Object.fromEntries(
  readFileSync(new URL('../.env.migration', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const [k, ...resto] = l.split('=');
      return [k.trim(), resto.join('=').trim().replace(/^["']|["']$/g, '')];
    }),
);

const URL_BASE = env.TARGET_SUPABASE_URL.replace(/\/$/, '');
const KEY = env.TARGET_SERVICE_KEY;
const cabecalhos = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function rest(caminho, opcoes = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${caminho}`, { ...opcoes, headers: { ...cabecalhos, ...opcoes.headers } });
  if (!r.ok) throw new Error(`${r.status} em ${caminho}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

async function contar(tabela, tenantId) {
  const r = await fetch(`${URL_BASE}/rest/v1/${tabela}?select=id&tenant_id=eq.${tenantId}`, {
    headers: { ...cabecalhos, Prefer: 'count=exact', Range: '0-0' },
  });
  return Number(r.headers.get('content-range')?.split('/')[1] ?? -1);
}

/** As duas travas. Qualquer divergência cancela tudo antes de apagar a primeira linha. */
async function conferirTravas(porId, tenants) {
  const esperados = [...APAGAR, ...MANTER];
  if (tenants.length !== esperados.length) {
    throw new Error(
      `Este banco tem ${tenants.length} tenants; o script foi escrito para ${esperados.length}. ` +
        'Alguém criou ou apagou tenant desde a conferência — releia a lista antes de rodar.',
    );
  }
  for (const { id, nome } of esperados) {
    if (!porId.has(id)) throw new Error(`Tenant esperado não existe aqui: ${nome} (${id}).`);
  }

  for (const alvo of APAGAR) {
    if (porId.get(alvo.id).is_platform_owner) {
      throw new Error(`${alvo.nome} é o DONO DA PLATAFORMA. Cancelado.`);
    }
    await conferirVazio(alvo);
    console.log(`  ${alvo.nome}: vazio, pode ir.`);
  }
}

async function conferirVazio(alvo) {
  for (const tabela of NAO_PODE_TER) {
    const n = await contar(tabela, alvo.id);
    if (n > 0) {
      throw new Error(
        `${alvo.nome} tem ${n} linha(s) em ${tabela}. Não é mais um tenant vazio — ` +
          'alguém passou a usar. Cancelado.',
      );
    }
  }
}

async function apagar(logins) {
  console.log('\nApagando...');

  // O TENANT PRIMEIRO. `employees.auth_id` referencia `auth.users`, então o login só sai
  // depois que o cascade do tenant levou a linha de `employees` que apontava para ele.
  for (const alvo of APAGAR) {
    await rest(`tenants?id=eq.${alvo.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    console.log(`  tenant ${alvo.nome}: apagado`);
  }

  // Agora o login, que o cascade não alcança: ele vive em `auth.users`, outro schema.
  // Falha aqui é grave e não é ruído: o tenant já foi, então o que sobrar fica órfão — capaz
  // de autenticar e cair numa sessão sem empresa. Por isso a lista vai no fim, para não se
  // perder no meio do log.
  const orfaos = [];
  for (const p of logins) {
    const r = await fetch(`${URL_BASE}/auth/v1/admin/users/${p.auth_id}`, { method: 'DELETE', headers: cabecalhos });
    console.log(`  login de ${p.nome}: ${r.ok ? 'apagado' : `FALHOU (${r.status})`}`);
    if (!r.ok) orfaos.push(p);
  }

  if (orfaos.length > 0) {
    console.log(`\n⚠ ${orfaos.length} login(s) ficaram ÓRFÃOS — o tenant já não existe. Apague à mão:`);
    for (const p of orfaos) {
      console.log(`  DELETE ${URL_BASE}/auth/v1/admin/users/${p.auth_id}   (${p.email ?? p.nome})`);
    }
  }
}

async function main() {
  const executar = process.argv.includes('--apagar');
  const tenants = await rest('tenants?select=id,name,is_platform_owner');

  console.log('Conferindo os alvos...\n');
  await conferirTravas(new Map(tenants.map((t) => [t.id, t])), tenants);

  const ids = APAGAR.map((a) => a.id).join(',');
  const pessoas = await rest(`employees?select=id,nome,email,auth_id,tenant_id&tenant_id=in.(${ids})`);
  const logins = pessoas.filter((p) => p.auth_id);

  console.log(`\n${pessoas.length} pessoa(s), ${logins.length} com login:`);
  for (const p of pessoas) {
    console.log(`  - ${p.nome} <${p.email ?? 'sem e-mail'}>${p.auth_id ? '' : '  (sem login)'}`);
  }

  if (!executar) {
    console.log('\nEnsaio. Nada foi apagado. Rode com --apagar para executar.');
    return;
  }

  await apagar(logins);

  const restantes = await rest('tenants?select=id,name&order=name');
  console.log(`\nSobraram ${restantes.length} tenants:`);
  for (const t of restantes) console.log(`  - ${t.name}`);
}

main().catch((e) => {
  console.error(`\n✖ ${e.message}`);
  process.exit(1);
});
