import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicPage } from '@/landing/chrome';
import { NAV, NOT_FOUND, SITE } from '@/landing/content';
import { OrigamiCrane } from '@/landing/OrigamiCrane';
import { focusRing } from '@/landing/styles';

/**
 * Página 404 (PUL-240). No build vira `dist/404.html`, que a Vercel serve com status
 * 404 para qualquer caminho fora das rotas conhecidas do app (ver vercel.json). Dentro
 * da SPA, é a rota `*`. Sem `console.error`: rota errada não é defeito do sistema.
 */

const enterDelay = (ms: number): CSSProperties => ({ ['--lp-delay' as string]: `${ms}ms` });

const NotFound = () => (
  <PublicPage mainClassName="dark relative isolate overflow-hidden bg-background text-foreground">
    <div aria-hidden="true" className="lp-grid absolute inset-0 -z-10" />
    <div aria-hidden="true" className="lp-orb lp-orb--primary -z-10 h-[32rem] w-[32rem] left-[-12%] top-[-25%]" />
    <div aria-hidden="true" className="lp-orb lp-orb--deep -z-10 h-[28rem] w-[28rem] bottom-[-20%] right-[-8%]" />
    <section className="container grid min-h-[calc(100vh-4rem)] items-center gap-10 py-12 md:grid-cols-2 md:gap-12 md:py-24">
      <div className="lp-enter max-w-xl">
        <p className="ol-label text-primary">{NOT_FOUND.eyebrow}</p>
        <h1 className="lp-gradient-text mt-4 text-5xl font-bold tracking-tight md:text-7xl">{NOT_FOUND.title}</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{NOT_FOUND.description}</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" variant="gradient" asChild>
            <Link to="/">
              {NOT_FOUND.primaryCta}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to={NAV.login}>
              <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
              {NOT_FOUND.secondaryCta}
            </Link>
          </Button>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          {NOT_FOUND.hint}{' '}
          <a href={`mailto:${SITE.contactEmail}`} className={`text-foreground underline-offset-4 hover:underline ${focusRing}`}>
            {SITE.contactEmail}
          </a>{' '}
          {NOT_FOUND.hintAfter}
        </p>
      </div>
      <div className="lp-enter order-first flex justify-center md:order-none" style={enterDelay(180)}>
        <OrigamiCrane className="lp-crane w-full max-w-[17rem] drop-shadow-[0_30px_60px_hsl(var(--primary)/0.25)] md:max-w-lg" />
      </div>
    </section>
  </PublicPage>
);

export default NotFound;
