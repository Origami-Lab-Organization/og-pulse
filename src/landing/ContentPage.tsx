import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContentPageProps, ContentSection, ContentTable, FaqItem } from '@/types/landing';
import { PublicPage } from '@/landing/chrome';
import { FINAL_CTA, NAV, TRIAL } from '@/landing/content';
import { findContentPage } from '@/landing/pages';
import { focusRing } from '@/landing/styles';

/**
 * Página pública de conteúdo (PUL-242): mesma moldura da home, leitura em coluna única,
 * FAQ em `<details>` nativo (as respostas existem no HTML mesmo fechadas), tabela com
 * rolagem própria no celular e chamada para o teste no fim. Todo texto vem de `pages.ts`.
 */

function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function Table(props: ContentTable) {
  const { caption, head, rows } = props;
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-foreground">
          <tr className="border-b border-border">
            {head.map((cell, index) => (
              <th key={`${cell}-${index}`} scope="col" className="px-4 py-3 font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-muted-foreground">
          {rows.map((row) => (
            <tr key={row.join('|')} className="border-b border-border last:border-0">
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`} className={`px-4 py-3 align-top ${index === 0 ? 'font-medium text-foreground' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section(props: ContentSection) {
  const { title, paragraphs = [], bullets = [], table } = props;
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h2>
      {paragraphs.map((text) => (
        <p key={text} className="mt-4 leading-relaxed text-muted-foreground">
          {text}
        </p>
      ))}
      {bullets.length > 0 && (
        <ul className="mt-4 list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground marker:text-primary">
          {bullets.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
      {table && <Table {...table} />}
    </section>
  );
}

function Faq(props: { items: readonly FaqItem[] }) {
  const { items } = props;
  if (items.length === 0) return null;
  return (
    <section className="mt-14" aria-labelledby="faq-title">
      <h2 id="faq-title" className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        Perguntas frequentes
      </h2>
      <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
        {items.map((item) => (
          <details key={item.question} className="lp-faq px-6 py-4">
            <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground ${focusRing}`}>
              {item.question}
              <span aria-hidden="true" className="lp-faq__icon inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground">
                +
              </span>
            </summary>
            <p className="lp-faq__body mt-3 pr-11 text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Related(props: { slugs: readonly string[] }) {
  const pages = props.slugs.map(findContentPage).filter((page) => page !== undefined);
  if (pages.length === 0) return null;
  return (
    <nav aria-label="Conteúdo relacionado" className="mt-14 border-t border-border pt-8">
      <h2 className="ol-label text-muted-foreground">Leia também</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {pages.map((page) => (
          <li key={page.slug}>
            <Link to={page.slug} className={`block rounded-xl border border-border bg-card p-4 text-sm font-medium text-foreground transition-colors hover:border-primary/50 ${focusRing}`}>
              {page.navLabel}
              <span className="mt-1 block text-xs font-normal text-muted-foreground">{page.eyebrow}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Cta() {
  return (
    <aside className="dark relative isolate mt-14 overflow-hidden rounded-3xl bg-background px-6 py-10 text-center text-foreground md:px-12">
      {/* a grade é camada decorativa: `.lp-grid` mascara o próprio elemento, então nunca vai no container */}
      <div aria-hidden="true" className="lp-grid absolute inset-0 -z-10" />
      <p className="ol-label text-primary">{FINAL_CTA.eyebrow}</p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">{FINAL_CTA.title}</h2>
      <p className="mt-3 text-muted-foreground">{FINAL_CTA.subtitle}</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button size="lg" variant="gradient" asChild>
          <Link to={NAV.register}>
            {FINAL_CTA.cta}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link to="/">Conhecer o Origami Pulse</Link>
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{TRIAL.label}. Sem cartão de crédito.</p>
    </aside>
  );
}

export function ContentPage(props: ContentPageProps) {
  const { page } = props;
  return (
    <PublicPage>
      <article className="container max-w-3xl py-16 md:py-24">
        <nav aria-label="Trilha" className="text-sm text-muted-foreground">
          <Link to="/" className={`hover:text-foreground ${focusRing}`}>
            Início
          </Link>
          <span aria-hidden="true" className="mx-2">
            ›
          </span>
          <span className="text-foreground">{page.navLabel}</span>
        </nav>
        <p className="ol-label mt-8 text-primary">{page.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground md:text-5xl">{page.title}</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{page.lead}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Atualizado em <time dateTime={page.updatedAt}>{formatIsoDate(page.updatedAt)}</time>
        </p>
        {page.sections.map((section) => (
          <Section key={section.title} {...section} />
        ))}
        <Faq items={page.faq} />
        <Cta />
        <Related slugs={page.related} />
      </article>
    </PublicPage>
  );
}
