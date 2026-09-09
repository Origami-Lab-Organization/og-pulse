#!/usr/bin/env node
/**
 * Pré-renderiza a landing page em `dist/index.html` e gera `sitemap.xml` e
 * `llms.txt` a partir de `src/landing/content.ts`.
 *
 * Roda depois de `vite build` (ver `npm run build`). Motivo: o Pulse é uma SPA;
 * sem este passo, Google e motores generativos (GPTBot, ClaudeBot, PerplexityBot)
 * recebem um `<div id="root"></div>` vazio na home. Com ele, a home é HTML
 * completo, e o app continua carregando por cima (o `main.tsx` re-renderiza a
 * mesma página para o visitante, ou redireciona quem já tem sessão).
 *
 * Falha alto se qualquer artefato não puder ser gerado ou se o JSON-LD estiver
 * incompleto: página pública quebrada não entra no ar.
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const dist = path.join(root, 'dist');
const ssrOut = path.join(root, '.prerender');
const indexHtml = path.join(dist, 'index.html');

const HEAD_START = '<!--LANDING_HEAD_START-->';
const HEAD_END = '<!--LANDING_HEAD_END-->';
const BODY_MARK = '<!--LANDING_BODY-->';

function fail(message) {
  console.error(`✖ prerender: ${message}`);
  process.exit(1);
}

function buildSsrBundle() {
  console.log('→ prerender: compilando entrada SSR da landing');
  execSync(
    'npx vite build --ssr src/landing/prerender-entry.tsx --mode prerender --outDir .prerender --emptyOutDir --logLevel warn',
    { stdio: 'inherit', cwd: root },
  );
  const entry = readdirSync(ssrOut).find((f) => /^prerender-entry\.(m?js)$/.test(f));
  if (!entry) fail('bundle SSR não gerado em .prerender/');
  return path.join(ssrOut, entry);
}

/** Tipos schema.org que a home precisa carregar. Comparar sempre pelo membro, nunca pela string. */
const SCHEMA = Object.freeze({
  CONTEXT: 'https://schema.org',
  FAQ_PAGE: 'FAQPage',
  SOFTWARE: 'SoftwareApplication',
});

function isWellFormed(doc) {
  return doc['@context'] === SCHEMA.CONTEXT && typeof doc['@type'] === 'string';
}

function findByType(docs, type) {
  return docs.find((d) => d['@type'] === type);
}

function assertFaq(docs) {
  const faq = findByType(docs, SCHEMA.FAQ_PAGE);
  const questions = Array.isArray(faq?.mainEntity) ? faq.mainEntity.length : 0;
  if (questions === 0) fail('FAQPage sem perguntas');
}

function assertSoftwareOffer(docs) {
  const software = findByType(docs, SCHEMA.SOFTWARE);
  if (!software?.offers) fail('SoftwareApplication sem oferta');
}

function validateJsonLd(docs) {
  if (!Array.isArray(docs) || docs.length === 0) fail('JSON-LD vazio');
  const malformed = docs.find((doc) => !isWellFormed(doc));
  if (malformed) fail(`JSON-LD sem @context/@type: ${JSON.stringify(malformed).slice(0, 80)}`);
  assertFaq(docs);
  assertSoftwareOffer(docs);
}

function inject(html, head, body) {
  const start = html.indexOf(HEAD_START);
  const end = html.indexOf(HEAD_END);
  if (start === -1 || end === -1 || end < start) fail(`marcadores ${HEAD_START}/${HEAD_END} ausentes em dist/index.html`);
  if (!html.includes(BODY_MARK)) fail(`marcador ${BODY_MARK} ausente em dist/index.html`);
  const withHead = html.slice(0, start) + head + html.slice(end + HEAD_END.length);
  return withHead.replace(BODY_MARK, body);
}

async function main() {
  if (!existsSync(indexHtml)) fail('dist/index.html não existe; rode `vite build` antes');

  const entryFile = buildSsrBundle();
  const mod = await import(pathToFileURL(entryFile).href);

  const jsonLd = mod.buildJsonLd();
  validateJsonLd(jsonLd);

  const body = mod.renderBody();
  if (!body.includes('<main') || !body.includes('<h1')) fail('HTML da landing sem <main> ou <h1>');
  const head = mod.renderHead();

  const html = inject(await readFile(indexHtml, 'utf8'), head, body);
  await writeFile(indexHtml, html, 'utf8');

  const today = new Date().toISOString().slice(0, 10);
  await mkdir(dist, { recursive: true });
  await writeFile(path.join(dist, 'sitemap.xml'), mod.buildSitemap(today), 'utf8');
  await writeFile(path.join(dist, 'llms.txt'), mod.buildLlmsTxt(), 'utf8');

  await rm(ssrOut, { recursive: true, force: true });

  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`✔ prerender: home pré-renderizada (${kb} kB), sitemap.xml e llms.txt gerados em dist/`);
}

main().catch((err) => fail(err.stack ?? err.message));
