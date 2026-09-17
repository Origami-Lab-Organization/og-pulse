#!/usr/bin/env node
/**
 * Search Console pela API — padrão da casa (skill SEO & GEO do Harness).
 *
 * Comandos:
 *   sites                      lista as propriedades que a conta de serviço enxerga
 *   sitemaps                   lista os sitemaps enviados da propriedade
 *   submit [url]               envia o sitemap (padrão: <origem>/sitemap.xml)
 *   inspect <url>              inspeção de URL: estado no índice, canônica do Google, último rastreio
 *   status                     inspeciona as páginas do sitemap publicado (fallback: a home)
 *   query [dias]               impressões, cliques e posição no período (padrão: 90 dias)
 *
 * Configuração (variáveis de ambiente, nunca no repositório):
 *   GSC_CREDENTIALS  caminho do JSON da conta de serviço (padrão ~/.config/gsc/pulse.json)
 *   GSC_SITE         propriedade (padrão sc-domain:origamipulse.com.br)
 *   GSC_ORIGIN       origem canônica das URLs (padrão https://origamipulse.com.br)
 *
 * Sem dependências: o JWT da conta de serviço é assinado com `node:crypto` e
 * trocado por um access token no endpoint OAuth do Google. Solicitar indexação
 * NÃO existe na API (só pela interface, ~10 por dia); a Indexing API é restrita
 * a vagas de emprego e não deve ser usada aqui.
 */

import { readFile } from 'node:fs/promises';
import { createSign } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';

const CREDENTIALS = process.env.GSC_CREDENTIALS ?? path.join(homedir(), '.config', 'gsc', 'pulse.json');
const SITE = process.env.GSC_SITE ?? 'sc-domain:origamipulse.com.br';
const ORIGIN = process.env.GSC_ORIGIN ?? 'https://origamipulse.com.br';
const SCOPE = 'https://www.googleapis.com/auth/webmasters';
/** Páginas-chave = o que o sitemap publicado declara; se ele não responder, só a home. */
async function keyPages() {
  try {
    const res = await fetch(`${ORIGIN}/sitemap.xml`);
    if (!res.ok) return ['/'];
    const locs = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(ORIGIN, '') || '/');
    return locs.length ? locs : ['/'];
  } catch {
    return ['/'];
  }
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

async function loadServiceAccount() {
  try {
    const raw = await readFile(CREDENTIALS, 'utf8');
    const json = JSON.parse(raw);
    if (!json.client_email || !json.private_key) {
      throw new Error('arquivo sem client_email/private_key');
    }
    return json;
  } catch (err) {
    console.error(`Não foi possível ler a credencial em ${CREDENTIALS}: ${err.message}`);
    console.error('Defina GSC_CREDENTIALS apontando para o JSON da conta de serviço (fora do repositório).');
    process.exit(2);
  }
}

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(sa.private_key, 'base64url');
  const assertion = `${header}.${claims}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`token: HTTP ${res.status} ${await res.text()}`);
  }
  const { access_token } = await res.json();
  return access_token;
}

async function api(token, method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${url}: HTTP ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

const enc = encodeURIComponent;
const WEBMASTERS = 'https://www.googleapis.com/webmasters/v3';
const SC = 'https://searchconsole.googleapis.com/v1';

async function cmdSites(token) {
  const data = await api(token, 'GET', `${WEBMASTERS}/sites`);
  const entries = data.siteEntry ?? [];
  if (entries.length === 0) {
    console.log('Nenhuma propriedade visível para esta conta de serviço.');
    return;
  }
  for (const s of entries) console.log(`${s.permissionLevel.padEnd(16)} ${s.siteUrl}`);
}

const show = (value, fallback = '-') => (value === undefined || value === null ? fallback : value);

function describeSitemap(s) {
  const contents = (s.contents ?? [])
    .map((c) => `${c.type}: ${c.submitted} enviadas, ${c.indexed} indexadas`)
    .join('; ');
  const header = [
    `último envio: ${show(s.lastSubmitted)}`,
    `último download: ${show(s.lastDownloaded)}`,
    `pendente: ${show(s.isPending, false)}`,
    `erros: ${show(s.errors, 0)}`,
    `avisos: ${show(s.warnings, 0)}`,
  ].join(' | ');
  return `${s.path}\n  ${header}\n  ${contents}`;
}

async function cmdSitemaps(token) {
  const data = await api(token, 'GET', `${WEBMASTERS}/sites/${enc(SITE)}/sitemaps`);
  const list = data.sitemap ?? [];
  if (list.length === 0) {
    console.log(`Nenhum sitemap enviado em ${SITE}.`);
    return;
  }
  for (const s of list) console.log(describeSitemap(s));
}

async function cmdSubmit(token, url = `${ORIGIN}/sitemap.xml`) {
  await api(token, 'PUT', `${WEBMASTERS}/sites/${enc(SITE)}/sitemaps/${enc(url)}`);
  console.log(`Sitemap enviado: ${url}`);
}

async function inspect(token, url) {
  const data = await api(token, 'POST', `${SC}/urlInspection/index:inspect`, {
    inspectionUrl: url,
    siteUrl: SITE,
    languageCode: 'pt-BR',
  });
  const r = data.inspectionResult?.indexStatusResult ?? {};
  return {
    url,
    verdict: r.verdict,
    coverage: r.coverageState,
    robots: r.robotsTxtState,
    indexing: r.indexingState,
    lastCrawl: r.lastCrawlTime,
    userCanonical: r.userCanonical,
    googleCanonical: r.googleCanonical,
    link: data.inspectionResult?.inspectionResultLink,
  };
}

function printInspection(r) {
  const lines = [
    r.url,
    `  veredito: ${show(r.verdict)} | cobertura: ${show(r.coverage)}`,
    `  robots: ${show(r.robots)} | indexação: ${show(r.indexing)} | último rastreio: ${show(r.lastCrawl, 'nunca')}`,
    `  canônica declarada: ${show(r.userCanonical)}`,
    `  canônica do Google: ${show(r.googleCanonical)}`,
  ];
  if (r.link) lines.push(`  ver no Search Console: ${r.link}`);
  console.log(lines.join('\n'));
}

async function cmdInspect(token, url) {
  if (!url) {
    console.error('Uso: search-console.mjs inspect <url>');
    process.exit(1);
  }
  printInspection(await inspect(token, url));
}

async function cmdStatus(token) {
  for (const p of await keyPages()) {
    printInspection(await inspect(token, `${ORIGIN}${p}`));
    console.log('');
  }
}

/** `YYYY-MM-DD` de N dias atrás. A API do Search Console só aceita data, não timestamp. */
function diasAtras(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

async function searchAnalytics(token, corpo) {
  return api(token, 'POST', `${WEBMASTERS}/sites/${enc(SITE)}/searchAnalytics/query`, corpo);
}

function linhaDeDesempenho(chaves, r) {
  const rotulo = chaves.length ? `${chaves.join(' | ')} → ` : '';
  return `${rotulo}impressões=${r.impressions} cliques=${r.clicks} ctr=${(r.ctr * 100).toFixed(1)}% posição=${r.position.toFixed(1)}`;
}

/**
 * Desempenho real na busca: é o que diz se o trabalho de conteúdo virou alguma coisa.
 * Zero impressão não é ranqueamento ruim — é ausência, e tem causa diferente.
 */
async function cmdQuery(token, dias = '90') {
  const periodo = { startDate: diasAtras(Number(dias)), endDate: diasAtras(0) };
  console.log(`Período: ${periodo.startDate} a ${periodo.endDate} — ${SITE}\n`);

  const total = await searchAnalytics(token, { ...periodo, rowLimit: 1 });
  const resumo = total.rows?.[0];
  console.log(resumo ? `TOTAL: ${linhaDeDesempenho([], resumo)}` : 'TOTAL: nenhum dado no período.');

  if (!resumo || resumo.impressions === 0) {
    console.log('\nSem impressões: as páginas não estão aparecendo para ninguém. Verifique a indexação com `status`.');
    return;
  }

  for (const [dimensao, titulo] of [['query', 'CONSULTAS'], ['page', 'PÁGINAS']]) {
    const dados = await searchAnalytics(token, { ...periodo, dimensions: [dimensao], rowLimit: 25 });
    console.log(`\n${titulo}`);
    for (const linha of dados.rows ?? []) console.log(`  ${linhaDeDesempenho(linha.keys, linha)}`);
    if (!dados.rows?.length) console.log('  (vazio)');
  }
}

const COMMANDS = {
  sites: cmdSites,
  query: cmdQuery,
  sitemaps: cmdSitemaps,
  submit: cmdSubmit,
  inspect: cmdInspect,
  status: cmdStatus,
};

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  const run = COMMANDS[cmd];
  if (!run) {
    console.error(`Comando desconhecido: ${cmd ?? '(vazio)'}\nUse: ${Object.keys(COMMANDS).join(' | ')}`);
    process.exit(1);
  }
  const sa = await loadServiceAccount();
  const token = await accessToken(sa);
  await run(token, arg);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
