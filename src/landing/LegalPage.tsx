import type { LegalPageProps, LegalSection } from '@/types/landing';
import { PublicPage } from '@/landing/chrome';
import { SITE } from '@/landing/content';
import { focusRing } from '@/landing/styles';

/** `2026-09-09` → `09/09/2026`, sem passar por `Date` (fuso não interfere). */
function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function Section(props: LegalSection) {
  const { title, paragraphs = [], bullets = [] } = props;
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
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
    </section>
  );
}

/** Documento legal público (termos, privacidade): mesma moldura da home, leitura em coluna única. */
export function LegalPage(props: LegalPageProps) {
  const { document } = props;
  return (
    <PublicPage>
      <article className="container max-w-3xl py-16 md:py-24">
        <p className="ol-label text-primary">Documento legal</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground md:text-5xl">{document.title}</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{document.lead}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Atualizado em <time dateTime={document.updatedAt}>{formatIsoDate(document.updatedAt)}</time>
        </p>
        {document.sections.map((section) => (
          <Section key={section.title} {...section} />
        ))}
        <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          Dúvidas sobre este documento:{' '}
          <a href={`mailto:${SITE.contactEmail}`} className={`text-primary underline-offset-4 hover:underline ${focusRing}`}>
            {SITE.contactEmail}
          </a>
        </p>
      </article>
    </PublicPage>
  );
}
