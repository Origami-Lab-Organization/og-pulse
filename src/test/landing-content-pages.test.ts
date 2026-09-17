import { describe, expect, it } from 'vitest';
import { CONTENT_PAGES, findContentPage } from '@/landing/pages';
import { PUBLIC_ROUTES, buildLlmsTxt, buildPageJsonLd, buildSitemap } from '@/landing/content';
import { SLUG } from '@/landing/slugs';
import { SITE } from '@/landing/site';

/**
 * Integridade das páginas públicas de conteúdo. O build já derruba a pré-renderização
 * quando falta `<h1>` ou JSON-LD (scripts/prerender-landing.mjs), mas só depois de
 * compilar tudo: estas regras valem para o dado e falham em segundos no PR.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe('páginas públicas de conteúdo', () => {
  it('todo slug declarado em SLUG tem página, e toda página tem slug declarado', () => {
    const declarados = [...Object.values(SLUG)].sort();
    const usados = CONTENT_PAGES.map((page) => page.slug).sort();
    expect(usados).toEqual(declarados);
  });

  it('slug é único, absoluto e sem barra final', () => {
    for (const page of CONTENT_PAGES) {
      expect(page.slug).toMatch(/^\/[a-z0-9-]+$/);
      expect(findContentPage(page.slug)).toBe(page);
    }
    expect(new Set(CONTENT_PAGES.map((p) => p.slug)).size).toBe(CONTENT_PAGES.length);
  });

  it('cada página tem lead que responde sozinho, seções, FAQ e data válida', () => {
    for (const page of CONTENT_PAGES) {
      // O lead é o primeiro parágrafo e o trecho que um motor generativo cita.
      expect(page.lead.length).toBeGreaterThan(200);
      expect(page.sections.length).toBeGreaterThanOrEqual(3);
      expect(page.faq.length).toBeGreaterThanOrEqual(3);
      expect(page.updatedAt).toMatch(ISO_DATE);
      // Description entra na SERP: fora da faixa, o Google reescreve.
      expect(page.description.length).toBeGreaterThan(70);
      expect(page.seoTitle).toContain(SITE.name);
    }
  });

  it('links de "Leia também" apontam para páginas que existem, nunca para a própria', () => {
    for (const page of CONTENT_PAGES) {
      for (const slug of page.related) {
        expect(slug).not.toBe(page.slug);
        expect(findContentPage(slug)).toBeDefined();
      }
    }
  });

  it('toda página de conteúdo é rota pública indexável, com JSON-LD de FAQ', () => {
    for (const page of CONTENT_PAGES) {
      const rota = PUBLIC_ROUTES.find((r) => r.path === page.slug);
      expect(rota?.indexable).toBe(true);
      const tipos = buildPageJsonLd(page).map((doc) => doc['@type']);
      expect(tipos).toContain('BreadcrumbList');
      expect(tipos).toContain('FAQPage');
    }
  });

  it('sitemap e llms.txt saem coerentes com a lista de páginas', () => {
    const sitemap = buildSitemap('2026-09-16');
    const llms = buildLlmsTxt();
    for (const page of CONTENT_PAGES) {
      expect(sitemap).toContain(`${SITE.origin}${page.slug}</loc>`);
      expect(llms).toContain(`${SITE.origin}${page.slug}`);
    }
  });
});
