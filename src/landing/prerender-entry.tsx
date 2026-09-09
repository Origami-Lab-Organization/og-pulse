/* eslint-disable react-refresh/only-export-components -- módulo só de build (SSR em Node), nunca passa pelo Fast Refresh */
/**
 * Entrada da pré-renderização da landing (build SSR do Vite, modo `prerender`).
 *
 * Consumida só por `scripts/prerender-landing.mjs`, em Node, depois do build do
 * cliente. Devolve o HTML do corpo e do `<head>` a partir da mesma fonte de
 * conteúdo que a página usa em runtime.
 */

import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import LandingPage from '@/pages/LandingPage';
import { SEO, SITE, buildJsonLd, buildLlmsTxt, buildSitemap } from '@/landing/content';

export { buildJsonLd, buildLlmsTxt, buildSitemap, SITE, SEO };

export function renderBody(): string {
  return renderToString(
    <StaticRouter location="/">
      <LandingPage />
    </StaticRouter>,
  );
}

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Metatags e JSON-LD da home. `</` é escapado dentro do JSON para não fechar o script. */
export function renderHead(): string {
  const ogImage = `${SITE.origin}${SITE.ogImagePath}`;
  const meta = [
    `<title>${escapeAttr(SEO.title)}</title>`,
    `<meta name="description" content="${escapeAttr(SEO.description)}" />`,
    `<link rel="canonical" href="${SEO.canonical}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE.name}" />`,
    `<meta property="og:locale" content="${SITE.locale}" />`,
    `<meta property="og:url" content="${SEO.canonical}" />`,
    `<meta property="og:title" content="${escapeAttr(SEO.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(SEO.description)}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escapeAttr(`${SITE.name}: rentabilidade de projetos para empresas de serviços`)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(SEO.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(SEO.description)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
  ];
  const jsonLd = buildJsonLd().map(
    (doc) => `<script type="application/ld+json">${JSON.stringify(doc).replace(/</g, '\\u003c')}</script>`,
  );
  return [...meta, ...jsonLd].join('\n    ');
}
