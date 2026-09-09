#!/usr/bin/env node
/**
 * Garante que toda rota de topo declarada em `src/App.tsx` tem rewrite para
 * `/app.html` em `vercel.json`.
 *
 * Por quê: desde PUL-240 a Vercel devolve 404 de verdade para caminho desconhecido
 * (`dist/404.html`), em vez de servir o shell da SPA para tudo. O preço é manter a
 * lista de rotas do app no `vercel.json`. Rota nova esquecida continuaria funcionando
 * na navegação interna e quebraria no F5, no link compartilhado e no favorito, por
 * isso este checador roda antes do `vite build` e derruba o build.
 */

import { readFileSync } from 'node:fs';

const APP = 'src/App.tsx';
const CONFIG = 'vercel.json';
const APP_SHELL = '/app.html';
const SEGMENT_LIST = /^\/:segment\(([^)]+)\)/;

function fail(message) {
  console.error(`✖ check-app-routes: ${message}`);
  process.exit(1);
}

function appSegments(source) {
  if (/\bpath=\{/.test(source)) fail(`${APP} tem <Route path={...}> dinâmico; este checador só entende path="..."`);
  const found = new Set();
  for (const match of source.matchAll(/\bpath="\/([^"/:*]*)/g)) {
    if (match[1]) found.add(match[1]);
  }
  return found;
}

function coveredSegments(config) {
  const lists = config.rewrites
    .filter((rule) => rule.destination === APP_SHELL)
    .map((rule) => rule.source.match(SEGMENT_LIST)?.[1])
    .filter(Boolean);
  if (lists.length === 0) fail(`nenhum rewrite para ${APP_SHELL} com lista de segmentos em ${CONFIG}`);
  const distinct = new Set(lists);
  if (distinct.size > 1) fail(`os rewrites para ${APP_SHELL} em ${CONFIG} têm listas de segmentos diferentes entre si`);
  return new Set(lists[0].split('|'));
}

function main() {
  const wanted = appSegments(readFileSync(APP, 'utf8'));
  const covered = coveredSegments(JSON.parse(readFileSync(CONFIG, 'utf8')));

  const missing = [...wanted].filter((segment) => !covered.has(segment));
  if (missing.length > 0) {
    fail(`rotas de ${APP} sem rewrite em ${CONFIG} (dariam 404 no F5): ${missing.join(', ')}`);
  }
  const stale = [...covered].filter((segment) => !wanted.has(segment));
  if (stale.length > 0) {
    console.warn(`⚠ check-app-routes: segmentos em ${CONFIG} sem rota em ${APP} (pode remover): ${stale.join(', ')}`);
  }
  console.log(`✔ check-app-routes: ${wanted.size} rotas de topo cobertas em ${CONFIG}`);
}

main();
