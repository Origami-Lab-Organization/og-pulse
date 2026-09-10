import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  MessageSquare,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  AiPillarIcon,
  EyebrowProps,
  FeatureIcon,
  SpotlightMock,
  SpotlightRowProps,
} from '@/types/landing';
import { MockTone } from '@/types/landing';
import {
  AI_CONNECTION,
  AUDIENCE,
  COMPARISON,
  DEFINITION,
  FAQ,
  FEATURES,
  FINAL_CTA,
  HERO,
  HERO_STATS,
  MARQUEE,
  NAV,
  PROBLEM,
  SITE,
  SPOTLIGHTS,
  TRIAL_SECTION,
} from '@/landing/content';
import { ScrollProgress, SiteFooter, SiteHeader, SkipLink } from '@/landing/chrome';
import { useMotionEnabled, useParallax, useRevealOnScroll, useScrollProgress, useTilt } from '@/landing/hooks';
import { AllocationMock, DashboardMock, FloatingBadge, MarginMock, PipelineMock } from '@/landing/mocks';
import { OrigamiCrane } from '@/landing/OrigamiCrane';
import { focusRing } from '@/landing/styles';
import '@/landing/landing.css';

/**
 * Landing page pública em `/`.
 *
 * É pré-renderizada no build (`scripts/prerender-landing.mjs`) para que Google e
 * motores generativos recebam o HTML completo sem executar JavaScript. Por isso:
 *  - toda copy vem de `src/landing/content.ts`, a mesma fonte do JSON-LD e do llms.txt;
 *  - o FAQ usa `<details>` nativo, para as respostas existirem no HTML mesmo fechadas;
 *  - nada aqui depende de sessão, dado do banco ou `window` em tempo de render.
 *
 * Os efeitos (parallax, revelação por scroll, inclinação 3D, faixa em movimento)
 * são progressivos: só ligam no cliente, via `data-motion="on"`, e desligam com
 * `prefers-reduced-motion`. Sem JavaScript a página é a mesma, parada.
 *
 * Seções escuras usam a classe `dark` como escopo: os tokens do tema trocam de valor
 * e os componentes continuam lendo `bg-background`, `text-foreground` etc.
 * (pattern `.harness/patterns/design-system.md`: nunca cor avulsa).
 */

const ICONS: Record<FeatureIcon, LucideIcon> = { TrendingUp, FolderKanban, Users, FileText, Clock, Shield };
const AI_ICONS: Record<AiPillarIcon, LucideIcon> = { MessageSquare, Clock, ShieldCheck };

const MOCKS: Record<SpotlightMock, () => JSX.Element> = {
  pipeline: PipelineMock,
  allocation: AllocationMock,
  margin: MarginMock,
};

/** Grade "bento": posições por índice das seis funcionalidades. */
const BENTO_SPAN = ['md:col-span-4', 'md:col-span-2', 'md:col-span-2', 'md:col-span-4', 'md:col-span-3', 'md:col-span-3'];

const contactHref = `mailto:${SITE.contactEmail}`;

const delay = (index: number, step = 90): CSSProperties => ({ ['--lp-delay' as string]: `${index * step}ms` });

function Eyebrow(props: EyebrowProps) {
  const { children, className = '' } = props;
  return <p className={`ol-label mb-4 text-primary ${className}`}>{children}</p>;
}

function HeroSection() {
  const motion = useMotionEnabled();
  const ref = useParallax<HTMLElement>(motion);
  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="lp-parallax dark relative -mt-16 overflow-hidden bg-background pb-24 pt-32 text-foreground md:pb-32 md:pt-40"
    >
      <div className="lp-grid absolute inset-0" aria-hidden="true" />
      <div className="lp-orb lp-orb--primary -left-40 top-10 h-[36rem] w-[36rem]" aria-hidden="true" />
      <div className="lp-orb lp-orb--deep -right-32 bottom-0 h-[30rem] w-[30rem]" aria-hidden="true" />

      <div className="container relative grid items-center gap-16 lg:grid-cols-[1.05fr_1fr]">
        <div className="max-w-2xl">
          <div className="lp-enter" style={delay(0)}>
            <Eyebrow>{HERO.eyebrow}</Eyebrow>
          </div>
          <h1 id="hero-title" className="ol-display lp-enter lp-gradient-text" style={delay(1)}>
            {HERO.title}
          </h1>
          <p className="lp-enter mt-6 text-lg text-muted-foreground md:text-xl" style={delay(2)}>
            {HERO.subtitle}
          </p>
          <div className="lp-enter mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center" style={delay(3)}>
            <Button variant="gradient" size="lg" asChild>
              <Link to={NAV.register}>
                {HERO.primaryCta}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to={NAV.login}>{HERO.secondaryCta}</Link>
            </Button>
          </div>
          <p className="lp-enter mt-4 text-sm text-muted-foreground" style={delay(4)}>
            {HERO.note}
          </p>
          <dl className="lp-enter mt-12 grid grid-cols-3 gap-6 border-t border-border pt-8" style={delay(5)}>
            {HERO_STATS.map((stat) => (
              <div key={stat.value}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-xl font-semibold text-foreground md:text-2xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lp-enter relative mx-auto w-full max-w-xl lg:max-w-none" style={delay(3)}>
          <div className="lp-layer" style={{ ['--lp-depth' as string]: 0.5 } as CSSProperties}>
            <DashboardMock />
          </div>
          <div className="lp-layer lp-bob absolute -left-8 -top-6 hidden sm:block" style={{ ['--lp-depth' as string]: 1.6 } as CSSProperties}>
            <FloatingBadge label="Margem realizada" value="+3 p.p. sobre o plano" />
          </div>
          <div className="lp-layer lp-bob lp-bob--late absolute -bottom-6 -right-6 hidden sm:block" style={{ ['--lp-depth' as string]: 1.2 } as CSSProperties}>
            <FloatingBadge label="Semana 37" value="Horas fechadas" tone={MockTone.PRIMARY} />
          </div>
        </div>
      </div>
    </section>
  );
}

function MarqueeSection() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <section aria-label="Segmentos atendidos" className="border-y border-border bg-card py-5">
      <div className="lp-marquee overflow-hidden">
        <div className="lp-marquee__track">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              aria-hidden={index >= MARQUEE.length}
              className="flex items-center gap-3 whitespace-nowrap text-sm font-medium uppercase tracking-widest text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function DefinitionSection() {
  return (
    <section aria-labelledby="definicao-title" className="bg-background py-20 md:py-28">
      <div className="container grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="lp-reveal">
          <Eyebrow>Em uma frase</Eyebrow>
          <h2 id="definicao-title" className="ol-h2 text-foreground">
            {DEFINITION.heading}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-foreground md:text-xl">{DEFINITION.answer}</p>
        </div>
        <aside className="lp-reveal rounded-2xl border border-border bg-card p-8 shadow-sm" style={delay(2)}>
          <h3 className="ol-h3 text-foreground">{DEFINITION.psaHeading}</h3>
          <p className="mt-4 text-muted-foreground">{DEFINITION.psaAnswer}</p>
        </aside>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section aria-labelledby="problema-title" className="dark relative overflow-hidden bg-background py-20 text-foreground md:py-28">
      <div className="lp-orb lp-orb--deep -right-40 -top-40 h-[28rem] w-[28rem]" aria-hidden="true" />
      <div className="container relative">
        <div className="lp-reveal mx-auto max-w-3xl text-center">
          <Eyebrow>{PROBLEM.eyebrow}</Eyebrow>
          <h2 id="problema-title" className="ol-h2">
            {PROBLEM.title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{PROBLEM.paragraphs[0]}</p>
        </div>
        <ul className="mt-14 grid gap-6 md:grid-cols-3">
          {PROBLEM.pains.map((pain, index) => (
            <li key={pain.title} className="lp-reveal rounded-2xl border border-border bg-card p-7" style={delay(index + 1)}>
              <span className="ol-label text-primary" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">{pain.title}</h3>
              <p className="mt-2 text-muted-foreground">{pain.description}</p>
            </li>
          ))}
        </ul>
        <p className="lp-reveal mx-auto mt-14 max-w-3xl text-center text-lg font-medium text-foreground" style={delay(4)}>
          {PROBLEM.paragraphs[1]}
        </p>
      </div>
    </section>
  );
}

function SpotlightRow(props: SpotlightRowProps) {
  const { item, index } = props;
  const Mock = MOCKS[item.mock];
  const flipped = index % 2 === 1;
  return (
    <li className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={`lp-reveal ${flipped ? 'lg:order-2' : ''}`}>
        <Eyebrow>{item.eyebrow}</Eyebrow>
        <h3 className="ol-h2 text-foreground">{item.title}</h3>
        <p className="mt-5 text-lg text-muted-foreground">{item.description}</p>
        <ul className="mt-6 space-y-3">
          {item.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-3 text-foreground">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={`lp-reveal ${flipped ? 'lg:order-1' : ''}`} style={delay(1)}>
        <div data-tilt className="lp-tilt rounded-xl">
          <Mock />
        </div>
      </div>
    </li>
  );
}

function SpotlightsSection() {
  return (
    <section aria-labelledby="destaques-title" className="bg-muted/40 py-20 md:py-28">
      <div className="container">
        <div className="lp-reveal mx-auto mb-16 max-w-3xl text-center">
          <Eyebrow>Como o Pulse trabalha</Eyebrow>
          <h2 id="destaques-title" className="ol-h2 text-foreground">
            Do comercial à margem, <span className="ol-text-accent">um fluxo só.</span>
          </h2>
        </div>
        <ol className="space-y-24">
          {SPOTLIGHTS.map((item, index) => (
            <SpotlightRow key={item.title} item={item} index={index} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="funcionalidades" aria-labelledby="funcionalidades-title" className="bg-background py-20 md:py-28">
      <div className="container">
        <div className="lp-reveal mb-12 max-w-3xl">
          <Eyebrow>Funcionalidades</Eyebrow>
          <h2 id="funcionalidades-title" className="ol-h2 text-foreground">
            Comercial, projetos e pessoas <span className="ol-text-accent">na mesma base.</span>
          </h2>
        </div>
        <ul className="grid gap-5 md:grid-cols-6">
          {FEATURES.map((feature, index) => {
            const Icon = ICONS[feature.icon];
            return (
              <li key={feature.title} className={`lp-reveal ${BENTO_SPAN[index]}`} style={delay(index)}>
                <div data-tilt className="lp-tilt h-full rounded-2xl border border-border bg-card p-7">
                  <div className="inline-flex rounded-xl bg-gradient-brand p-3 text-primary-foreground shadow-md shadow-primary/30" aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-muted-foreground">{feature.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="lp-reveal mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-8" style={delay(2)}>
          <span className="ol-label text-muted-foreground">{AUDIENCE.title}</span>
          {AUDIENCE.items.map((item) => (
            <span key={item} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Conexão com IA (PUL-254). Fica entre Funcionalidades (fundo claro) e Comparativo (escuro)
 * com `bg-muted/40`, para manter a alternância de fundos da página.
 *
 * O tsuru aqui NÃO recebe `state`: na landing ele flutua pelo `.lp-crane__body` de
 * `landing.css` com `data-motion`, igual à 404. Passar `state` faria as duas animações
 * disputarem o mesmo elemento.
 */
function AiConnectionSection() {
  return (
    <section id="conexao-ia" aria-labelledby="conexao-ia-title" className="bg-muted/40 py-20 md:py-28">
      <div className="container">
        <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="lp-reveal max-w-2xl">
            <Eyebrow>{AI_CONNECTION.eyebrow}</Eyebrow>
            <h2 id="conexao-ia-title" className="ol-h2 text-foreground">
              {AI_CONNECTION.title} <span className="ol-text-accent">{AI_CONNECTION.accent}</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">{AI_CONNECTION.description}</p>
          </div>
          <div className="lp-reveal flex justify-center lg:justify-end" style={delay(1)}>
            <OrigamiCrane className="lp-crane w-full max-w-[14rem] drop-shadow-[0_24px_48px_hsl(var(--primary)/0.25)] md:max-w-[18rem]" />
          </div>
        </div>

        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {AI_CONNECTION.pillars.map((pilar, index) => {
            const Icon = AI_ICONS[pilar.icon];
            return (
              <li key={pilar.title} className="lp-reveal" style={delay(index)}>
                <div data-tilt className="lp-tilt h-full rounded-2xl border border-border bg-card p-7">
                  <div className="inline-flex rounded-xl bg-gradient-brand p-3 text-primary-foreground shadow-md shadow-primary/30" aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{pilar.title}</h3>
                  <p className="mt-2 text-muted-foreground">{pilar.description}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="lp-reveal mt-10 flex flex-col gap-8 rounded-2xl border border-primary/30 bg-primary/5 p-6 lg:flex-row lg:items-center sm:p-8" style={delay(2)}>
          <div className="flex-1">
            <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {AI_CONNECTION.examplesTitle}
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {AI_CONNECTION.examples.map((example) => (
                <li key={example} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
                  “{example}”
                </li>
              ))}
            </ul>
          </div>
          <div className="shrink-0 space-y-4 lg:max-w-[260px]">
            <p className="text-sm leading-relaxed text-muted-foreground">{AI_CONNECTION.note}</p>
            <Button asChild variant="gradient">
              <Link to={NAV.register}>
                {AI_CONNECTION.cta}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section aria-labelledby="comparativo-title" className="dark bg-background py-20 text-foreground md:py-28">
      <div className="container">
        <div className="lp-reveal mb-12 text-center">
          <Eyebrow>{COMPARISON.eyebrow}</Eyebrow>
          <h2 id="comparativo-title" className="ol-h2">
            {COMPARISON.title}
          </h2>
        </div>
        <div className="lp-reveal mx-auto max-w-4xl overflow-x-auto rounded-2xl border border-border bg-card" style={delay(1)}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">{COMPARISON.title}</caption>
            <thead className="text-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="px-5 py-4 font-semibold">
                  O que você precisa saber
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-muted-foreground">
                  {COMPARISON.columns[0]}
                </th>
                <th scope="col" className="bg-primary/10 px-5 py-4 font-semibold text-primary">
                  {COMPARISON.columns[1]}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.rows.map((row) => (
                <tr key={row.topic} className="border-b border-border last:border-0">
                  <th scope="row" className="px-5 py-4 font-medium text-foreground">
                    {row.topic}
                  </th>
                  <td className="px-5 py-4 text-muted-foreground">{row.spreadsheets}</td>
                  <td className="bg-primary/10 px-5 py-4 text-foreground">{row.pulse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function TrialSection() {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-title" className="bg-background py-20 md:py-28">
      <div className="container">
        <div className="lp-reveal mb-14 text-center">
          <Eyebrow>{TRIAL_SECTION.eyebrow}</Eyebrow>
          <h2 id="como-funciona-title" className="ol-h2 text-foreground">
            {TRIAL_SECTION.title}
          </h2>
        </div>
        <ol className="relative grid gap-8 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" aria-hidden="true" />
          {TRIAL_SECTION.steps.map((step, index) => (
            <li key={step.title} className="lp-reveal relative" style={delay(index)}>
              <span className="relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="perguntas-frequentes" aria-labelledby="faq-title" className="bg-muted/40 py-20 md:py-28">
      <div className="container">
        <div className="mx-auto max-w-3xl">
          <div className="lp-reveal mb-12 text-center">
            <Eyebrow>Dúvidas</Eyebrow>
            <h2 id="faq-title" className="ol-h2 text-foreground">
              Perguntas <span className="ol-text-accent">frequentes</span>
            </h2>
          </div>
          <div className="lp-reveal divide-y divide-border rounded-2xl border border-border bg-card" style={delay(1)}>
            {FAQ.map((item) => (
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
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section aria-labelledby="cta-title" className="dark relative overflow-hidden bg-background py-24 text-foreground md:py-32">
      <div className="lp-grid absolute inset-0" aria-hidden="true" />
      <div className="lp-orb lp-orb--primary left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
      <div className="container relative">
        <div className="lp-reveal mx-auto max-w-2xl text-center">
          <Eyebrow>{FINAL_CTA.eyebrow}</Eyebrow>
          <h2 id="cta-title" className="ol-display lp-gradient-text">
            {FINAL_CTA.title}
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">{FINAL_CTA.subtitle}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button variant="gradient" size="lg" asChild>
              <Link to={NAV.register}>
                {FINAL_CTA.cta}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href={contactHref}>Falar com a Origami Lab</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

const LandingPage = () => {
  const motion = useMotionEnabled();
  const revealRef = useRevealOnScroll<HTMLDivElement>(motion);
  const tiltRef = useTilt<HTMLElement>(motion);
  const { progress, scrolled } = useScrollProgress();

  return (
    <div ref={revealRef} data-motion={motion ? 'on' : 'off'} className="min-h-screen bg-background">
      <SkipLink />
      <ScrollProgress progress={progress} />
      <SiteHeader scrolled={scrolled} />
      <main id="conteudo" ref={tiltRef}>
        <HeroSection />
        <MarqueeSection />
        <DefinitionSection />
        <ProblemSection />
        <SpotlightsSection />
        <FeaturesSection />
        <AiConnectionSection />
        <ComparisonSection />
        <TrialSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default LandingPage;
