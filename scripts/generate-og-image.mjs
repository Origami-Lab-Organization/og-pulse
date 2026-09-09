#!/usr/bin/env node
/**
 * Gera public/og-image.png (1200×630) com o Chromium do Playwright já presente
 * nas devDependencies. Rodar de novo (`npm run og:image`) quando o título da
 * home mudar em src/landing/content.ts; o arquivo é versionado porque é estático.
 *
 * Cores: os mesmos valores dos tokens escuros do tema (src/index.css) — é um
 * raster, então não há como ler CSS variables aqui.
 */

import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const out = path.resolve('public/og-image.png');
const logo = pathToFileURL(path.resolve('public/brand/origami-pulse-logo.png')).href;

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: hsl(0 0% 10.2%); color: hsl(65 42.9% 94.5%);
         font-family: Inter, system-ui, sans-serif; display: flex; flex-direction: column; justify-content: space-between; padding: 72px 80px; }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 28px; font-weight: 700; }
  .brand img { height: 44px; }
  .brand em { color: hsl(159 80.2% 54.5%); font-style: normal; }
  h1 { font-size: 64px; line-height: 1.08; font-weight: 800; letter-spacing: -0.02em; max-width: 980px; }
  p { font-size: 28px; line-height: 1.35; color: hsl(69 5.7% 62%); max-width: 940px; margin-top: 20px; }
  .foot { display: flex; justify-content: space-between; align-items: center; font-size: 22px; color: hsl(69 5.7% 62%); }
  .pill { border: 2px solid hsl(159 80.2% 54.5%); color: hsl(159 80.2% 54.5%); border-radius: 999px; padding: 10px 22px; font-weight: 700; }
</style></head>
<body>
  <div class="brand"><img src="${logo}" alt="" /><span>Origami <em>Pulse</em></span></div>
  <div>
    <h1>Saiba qual projeto dá lucro de verdade.</h1>
    <p>PSA para consultorias, agências e escritórios técnicos: pipeline, orçamentos, alocação, horas e margem real por projeto.</p>
  </div>
  <div class="foot"><span>origamipulse.com.br</span><span class="pill">Teste grátis por 14 dias</span></div>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: out, type: 'png' });
  console.log(`✔ og-image gerada em ${out}`);
} finally {
  await browser.close();
}
