import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { FooterLink, PublicPageProps, ScrollProgressProps, SiteHeaderProps } from '@/types/landing';
import { FOOTER, FOOTER_COLUMNS, HERO, NAV, SITE, copyrightLine } from '@/landing/content';
import { useMotionEnabled, useRevealOnScroll, useScrollProgress } from '@/landing/hooks';
import { focusRing } from '@/landing/styles';
import '@/landing/landing.css';

/**
 * Cabeçalho, rodapé e moldura das páginas públicas (home, 404, termos, privacidade).
 *
 * Tudo aqui é pré-renderizado no build (`scripts/prerender-landing.mjs`): nada depende
 * de sessão, banco ou `window` em tempo de render. Os efeitos ligam só no cliente via
 * `data-motion="on"` e desligam com `prefers-reduced-motion`.
 *
 * Cabeçalho e rodapé usam a classe `dark` como escopo: os tokens trocam de valor e os
 * componentes continuam lendo `bg-background`, `text-foreground` etc.
 */

const contactHref = `mailto:${SITE.contactEmail}`;
const navLinkClass = `text-sm text-muted-foreground transition-colors hover:text-foreground ${focusRing}`;

export function SkipLink() {
  return (
    <a
      href="#conteudo"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
    >
      Pular para o conteúdo
    </a>
  );
}

export function ScrollProgress(props: ScrollProgressProps) {
  const { progress } = props;
  return (
    <div
      aria-hidden="true"
      className="lp-progress fixed inset-x-0 top-0 z-[70] h-0.5 bg-primary"
      style={{ ['--lp-progress' as string]: progress } as CSSProperties}
    />
  );
}

/**
 * Superfície do cabeçalho. Página secundária (`solid`) é opaca desde o topo: por baixo
 * dela está o fundo claro da raiz, e translúcido ali vira cinza. Na home, transparente
 * sobre o hero e translúcida com desfoque depois que a página rola.
 */
function headerSurface(scrolled: boolean, solid: boolean): string {
  if (solid) return 'border-border bg-background';
  if (scrolled) return 'border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70';
  return 'border-transparent bg-transparent';
}

export function SiteHeader(props: SiteHeaderProps) {
  const { scrolled, solid = false } = props;
  const surface = headerSurface(scrolled, solid);
  return (
    <header data-scrolled={scrolled} className={`lp-header dark sticky top-0 z-50 w-full border-b text-foreground ${surface}`}>
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link to="/" className={`flex shrink-0 items-center gap-2 ${focusRing}`}>
          <img src={SITE.logoPath} alt="" width={32} height={32} className="h-8 w-auto" />
          <span className="whitespace-nowrap text-lg font-semibold">
            Origami <span className="ol-text-accent">Pulse</span>
          </span>
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
          <a href={NAV.features} className={navLinkClass}>
            Funcionalidades
          </a>
          <a href={NAV.howItWorks} className={navLinkClass}>
            Como funciona
          </a>
          <a href={NAV.faq} className={navLinkClass}>
            Perguntas
          </a>
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to={NAV.login}>{HERO.secondaryCta}</Link>
          </Button>
          <Button variant="gradient" asChild className="px-3 sm:px-4">
            <Link to={NAV.register}>{HERO.primaryCta}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/** Âncoras (`/#secao`) e `mailto:` são links nativos: o navegador rola até a seção, mesmo vindo de outra página. */
function FooterLinkItem(props: FooterLink) {
  const { label, href } = props;
  if (href.includes('#') || href.startsWith('mailto:')) {
    return (
      <a href={href} className={navLinkClass}>
        {label}
      </a>
    );
  }
  return (
    <Link to={href} className={navLinkClass}>
      {label}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="dark border-t border-border bg-background py-14 text-foreground">
      <div className="container grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2">
            <img src={SITE.logoPath} alt="" width={28} height={28} className="h-7 w-auto" />
            <span className="font-semibold">
              Origami <span className="ol-text-accent">Pulse</span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">{HERO.subtitle}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            {FOOTER.tagline}{' '}
            <a href={SITE.maker.url} rel="noopener" className={`underline-offset-4 hover:underline ${focusRing}`}>
              {SITE.maker.url.replace('https://', '')}
            </a>
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="ol-label text-muted-foreground">{column.title}</h2>
            <ul className="mt-4 space-y-3">
              {column.links.map((link) => (
                <li key={link.href}>
                  <FooterLinkItem label={link.label} href={link.href} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container mt-12 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>{copyrightLine()}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link to={NAV.terms} className={`hover:text-foreground ${focusRing}`}>
            Termos de uso
          </Link>
          <Link to={NAV.privacy} className={`hover:text-foreground ${focusRing}`}>
            Privacidade
          </Link>
          <a href={contactHref} className={`hover:text-foreground ${focusRing}`}>
            {SITE.contactEmail}
          </a>
        </p>
      </div>
    </footer>
  );
}

/**
 * Moldura das páginas públicas secundárias (404, termos, privacidade): cabeçalho sólido,
 * conteúdo e rodapé, com a mesma raiz de movimento da home.
 */
export function PublicPage(props: PublicPageProps) {
  const { children, mainClassName = '' } = props;
  const motion = useMotionEnabled();
  const revealRef = useRevealOnScroll<HTMLDivElement>(motion);
  const { progress, scrolled } = useScrollProgress();
  return (
    <div ref={revealRef} data-motion={motion ? 'on' : 'off'} className="flex min-h-screen flex-col bg-background">
      <SkipLink />
      <ScrollProgress progress={progress} />
      <SiteHeader scrolled={scrolled} solid />
      <main id="conteudo" className={`flex-1 ${mainClassName}`}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
