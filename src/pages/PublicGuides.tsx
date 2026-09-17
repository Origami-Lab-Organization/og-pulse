import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLink } from '@/landing/AppLink';
import { PublicPage } from '@/landing/chrome';
import { FINAL_CTA, GUIDES_HUB, NAV, TRIAL } from '@/landing/content';
import { CONTENT_PAGES } from '@/landing/pages';
import { focusRing } from '@/landing/styles';

/**
 * Hub `/guias`: índice de todas as páginas de conteúdo, agrupadas pelo tipo de
 * pergunta que respondem. Sem ele, as páginas só se alcançavam pelo rodapé e pelo
 * "Leia também" — quem chega numa página não descobre as outras, e o rastreador
 * precisa de mais saltos para encontrar o conjunto.
 */
const PublicGuides = () => (
  <PublicPage>
    <article className="container max-w-3xl py-12 md:py-20">
      <nav aria-label="Trilha de navegação" className="text-sm text-muted-foreground">
        <Link to="/" className={`hover:text-foreground ${focusRing}`}>
          Início
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span className="text-foreground">{GUIDES_HUB.eyebrow}</span>
      </nav>

      <p className="ol-label mt-8 text-primary">{GUIDES_HUB.eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{GUIDES_HUB.title}</h1>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{GUIDES_HUB.lead}</p>

      {GUIDES_HUB.groups.map((group) => {
        const pages = CONTENT_PAGES.filter((page) => page.kind === group.kind);
        if (pages.length === 0) return null;
        return (
          <section key={group.title} className="mt-12">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{group.title}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{group.description}</p>
            <ul className="mt-6 space-y-3">
              {pages.map((page) => (
                <li key={page.slug}>
                  <Link
                    to={page.slug}
                    className={`block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 ${focusRing}`}
                  >
                    <span className="block font-medium text-foreground">{page.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{page.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="mt-16 rounded-2xl border border-border bg-card p-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{FINAL_CTA.title}</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">{TRIAL.label}, sem cartão de crédito.</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="gradient" asChild>
            <AppLink to={NAV.register}>
              {FINAL_CTA.cta}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </AppLink>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/">Conhecer o Origami Pulse</Link>
          </Button>
        </div>
      </section>
    </article>
  </PublicPage>
);

export default PublicGuides;
