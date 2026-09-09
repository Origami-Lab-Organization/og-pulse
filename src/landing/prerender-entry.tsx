/* eslint-disable react-refresh/only-export-components -- módulo só de build (SSR em Node), nunca passa pelo Fast Refresh */
/**
 * Entrada da pré-renderização das páginas públicas (build SSR do Vite, modo `prerender`).
 *
 * Consumida só por `scripts/prerender-landing.mjs`, em Node, depois do build do
 * cliente. Para cada rota de `PUBLIC_ROUTES` (e para a 404) devolve o HTML do corpo
 * e do `<head>` a partir da mesma fonte de conteúdo que as páginas usam em runtime.
 */

import { renderToString } from 'react-dom/server';
import { Route, Routes } from 'react-router-dom';
import { StaticRouter } from 'react-router-dom/server';
import LandingPage from '@/pages/LandingPage';
import NotFound from '@/pages/NotFound';
import Privacy from '@/pages/Privacy';
import PublicContent from '@/pages/PublicContent';
import Terms from '@/pages/Terms';
import { NAV, NOT_FOUND_ROUTE, PUBLIC_ROUTES, SITE, buildJsonLd, buildLlmsTxt, buildPageJsonLd, buildSitemap } from '@/landing/content';
import { findContentPage } from '@/landing/pages';
import type { JsonLd, PublicRoute } from '@/types/landing';

export { buildJsonLd, buildLlmsTxt, buildSitemap, NOT_FOUND_ROUTE, PUBLIC_ROUTES, SITE };

const HOME = '/';

/** Espelho, só das páginas públicas, das rotas que `App.tsx` declara para o cliente. */
function PublicRoutes() {
  return (
    <Routes>
      <Route path={HOME} element={<LandingPage />} />
      <Route path={NAV.terms} element={<Terms />} />
      <Route path={NAV.privacy} element={<Privacy />} />
      <Route path="/:slug" element={<PublicContent />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export function renderBody(path: string): string {
  return renderToString(
    <StaticRouter location={path}>
      <PublicRoutes />
    </StaticRouter>,
  );
}

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const canonicalOf = (route: PublicRoute) => `${SITE.origin}${route.path === HOME ? '/' : route.path}`;

/** Título, description, robots e canônica. Página `noindex` não declara canônica: os dois sinais juntos se contradizem. */
function baseTags(route: PublicRoute, canonical: string): string[] {
  const tags = [`<title>${escapeAttr(route.title)}</title>`, `<meta name="description" content="${escapeAttr(route.description)}" />`];
  if (route.indexable) {
    tags.push(`<link rel="canonical" href="${canonical}" />`, `<meta name="robots" content="index, follow, max-image-preview:large" />`);
  } else {
    tags.push(`<meta name="robots" content="noindex, follow" />`);
  }
  return tags;
}

function socialTags(route: PublicRoute, canonical: string): string[] {
  const ogImage = `${SITE.origin}${SITE.ogImagePath}`;
  return [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE.name}" />`,
    `<meta property="og:locale" content="${SITE.locale}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:title" content="${escapeAttr(route.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(route.description)}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escapeAttr(`${SITE.name}: rentabilidade de projetos para empresas de serviços`)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(route.description)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
  ];
}

/** `</` é escapado dentro do JSON para não fechar o script. */
function jsonLdTags(docs: JsonLd[]): string[] {
  return docs.map((doc) => `<script type="application/ld+json">${JSON.stringify(doc).replace(/</g, '\\u003c')}</script>`);
}

/** Home leva Organization/WebSite/SoftwareApplication/FAQ; página de conteúdo leva WebPage/Breadcrumb/FAQ; as demais, nada. */
function jsonLdFor(route: PublicRoute): JsonLd[] {
  if (route.path === HOME) return buildJsonLd();
  const page = findContentPage(route.path);
  return page ? buildPageJsonLd(page) : [];
}

export function renderHead(route: PublicRoute): string {
  const canonical = canonicalOf(route);
  const tags = [...baseTags(route, canonical), ...socialTags(route, canonical), ...jsonLdTags(jsonLdFor(route))];
  return tags.join('\n    ');
}
