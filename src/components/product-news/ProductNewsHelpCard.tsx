import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductNewsDialog } from '@/components/product-news/ProductNewsDialog';
import { CURRENT_PRODUCT_NEWS } from '@/content/productNews';
import { useAuth } from '@/contexts/AuthContext';
import { useProductNews } from '@/hooks/useProductNews';
import { PRODUCT_NEWS_ORIGIN } from '@/lib/productNews.constants';
import { editionForViewer } from '@/lib/productNews';

/**
 * Rever as novidades, na Central de Ajuda (ADR-0048) — o par do "Rever o tour".
 *
 * Abre a edição vigente a qualquer hora, para quem fechou rápido demais ou chegou depois da
 * publicação. Não depende da leitura no banco: a consulta só decide a abertura AUTOMÁTICA.
 * Os tópicos seguem recortados pela capacidade, como na entrada.
 */
export function ProductNewsHelpCard() {
  const { can } = useAuth();
  const { markRead } = useProductNews();
  const [open, setOpen] = useState(false);
  const edition = useMemo(() => editionForViewer(CURRENT_PRODUCT_NEWS, can), [can]);

  if (!edition) return null;

  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">Novidades do Pulse</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {edition.title}. Por que fizemos e o que dá para fazer, tópico a tópico.
          </p>
          <Button size="sm" variant="outline" className="mt-2.5" onClick={() => setOpen(true)}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Ver as novidades
          </Button>
        </div>
      </div>

      <ProductNewsDialog
        edition={edition}
        open={open}
        origin={PRODUCT_NEWS_ORIGIN.HELP}
        onDone={() => {
          setOpen(false);
          markRead();
        }}
      />
    </section>
  );
}
