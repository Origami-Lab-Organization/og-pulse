import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  FolderInput,
  LayoutDashboard,
  Mail,
  PlugZap,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProductNewsArt } from '@/components/product-news/ProductNewsArt';
import { useProductNewsTracking } from '@/hooks/useProductNews';
import { PRODUCT_NEWS_ACTION, PRODUCT_NEWS_ORIGIN } from '@/lib/productNews.constants';
import type {
  ProductNewsAction,
  ProductNewsEdition,
  ProductNewsIcon,
  ProductNewsOrigin,
  ProductNewsTopic,
} from '@/types/productNews';

const ICONS: Record<ProductNewsIcon, LucideIcon> = {
  mail: Mail,
  'folder-input': FolderInput,
  calendar: CalendarDays,
  plug: PlugZap,
  dashboard: LayoutDashboard,
};

/** Grade técnica sobre o verde da marca — feita com o token, sem cor avulsa. A máscara só
 * usa o canal alfa: a cor dela não aparece. */
const GRID_MASK = 'radial-gradient(90% 100% at 75% 25%, hsl(var(--neutral-900)) 30%, transparent 85%)';
const GRID: CSSProperties = {
  backgroundImage:
    'linear-gradient(hsl(var(--neutral-0) / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--neutral-0) / 0.06) 1px, transparent 1px)',
  backgroundSize: '22px 22px',
  maskImage: GRID_MASK,
  WebkitMaskImage: GRID_MASK,
};

interface BannerProps {
  edition: ProductNewsEdition;
  onClose: () => void;
}

/** Banner da edição: fundo fixo na escala verde da marca, igual nos dois temas. */
function Banner(props: BannerProps) {
  const { edition, onClose } = props;
  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-br from-green-700 via-green-800 to-green-900 px-5 pb-6 pt-6 text-neutral-0 sm:grid sm:min-h-[200px] sm:grid-cols-[minmax(0,1fr)_240px] sm:gap-4 sm:px-6">
      <div aria-hidden="true" style={GRID} className="absolute inset-0 -z-10" />
      <DialogClose asChild>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-2.5 top-2.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md bg-neutral-0/10 text-neutral-0/85 transition-colors hover:bg-neutral-0/20 hover:text-neutral-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </DialogClose>
      <ProductNewsArt art={edition.art} />
      <div className="flex min-w-0 flex-col gap-2 self-end sm:col-start-1 sm:row-start-1">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-green-300">
          <span className="h-1.5 w-1.5 rounded-full bg-green-300" aria-hidden="true" />
          {edition.label}
        </p>
        <DialogTitle className="text-balance text-2xl font-bold leading-tight tracking-tight text-neutral-0">
          {edition.title}
        </DialogTitle>
        <DialogDescription className="text-sm text-neutral-0/80">{edition.summary}</DialogDescription>
      </div>
    </div>
  );
}

interface TopicProps {
  topic: ProductNewsTopic;
}

/** Cada tópico responde: por que existe, e o que dá para fazer. */
function Topic(props: TopicProps) {
  const { topic } = props;
  const Icon = ICONS[topic.icon];
  return (
    <AccordionItem value={topic.id} className="border-border last:border-b-0">
      <AccordionTrigger className="gap-3 rounded-md py-3 text-left text-sm hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">{topic.title}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-3 pl-11 pr-2">
        <div>
          <p className="ui-label mb-1">Por quê</p>
          <p className="text-sm leading-relaxed text-foreground/85">{topic.reason}</p>
        </div>
        <div>
          <p className="ui-label mb-1.5">O que dá para fazer</p>
          <ul className="space-y-1.5">
            {topic.features.map((feature) => (
              <li key={feature} className="flex gap-2 text-sm leading-snug text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

interface ActionsProps {
  edition: ProductNewsEdition;
  onAnswer: (action: ProductNewsAction) => void;
}

function Actions(props: ActionsProps) {
  const { edition, onAnswer } = props;
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
      <Button variant="ghost" onClick={() => onAnswer(PRODUCT_NEWS_ACTION.CONTINUE)}>
        {edition.call ? 'Agora não' : 'Continuar'}
      </Button>
      {edition.call && (
        <Button asChild>
          <Link to={edition.call.href} onClick={() => onAnswer(PRODUCT_NEWS_ACTION.CALL)}>
            {edition.call.label}
          </Link>
        </Button>
      )}
    </div>
  );
}

interface ProductNewsDialogProps {
  edition: ProductNewsEdition;
  open: boolean;
  /** Registra que a pessoa viu — qualquer saída conta. */
  onDone: () => void;
  /** Abriu sozinho na entrada (padrão) ou pela Central de Ajuda — vai no evento. */
  origin?: ProductNewsOrigin;
}

/**
 * Anúncio de novidade do produto (ADR-0048), no estilo do aviso do Projete: banner da
 * edição e tópicos fechados, que a pessoa abre se quiser. Qualquer saída registra a leitura.
 */
export function ProductNewsDialog(props: ProductNewsDialogProps) {
  const { edition, open, onDone, origin = PRODUCT_NEWS_ORIGIN.ENTRY } = props;
  const { openTopic, answer } = useProductNewsTracking(edition, open, origin);
  const exitAction = useRef<ProductNewsAction>(PRODUCT_NEWS_ACTION.CLOSE);
  const bodyRef = useRef<HTMLDivElement>(null);

  const finish = (action: ProductNewsAction) => {
    answer(action);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && finish(exitAction.current)}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px] [&>button:last-child]:hidden"
        onEscapeKeyDown={() => {
          exitAction.current = PRODUCT_NEWS_ACTION.CLOSE;
        }}
        onPointerDownOutside={() => {
          exitAction.current = PRODUCT_NEWS_ACTION.OUTSIDE;
        }}
        onOpenAutoFocus={(event) => {
          // Foco no primeiro tópico, não no X do banner: quem usa teclado começa pelo conteúdo.
          event.preventDefault();
          bodyRef.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
        }}
      >
        <Banner
          edition={edition}
          onClose={() => {
            exitAction.current = PRODUCT_NEWS_ACTION.CLOSE;
          }}
        />
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-1 sm:px-6">
          <Accordion type="single" collapsible onValueChange={(value) => value && openTopic(value)}>
            {edition.topics.map((topic) => (
              <Topic key={topic.id} topic={topic} />
            ))}
          </Accordion>
        </div>
        <Actions edition={edition} onAnswer={finish} />
      </DialogContent>
    </Dialog>
  );
}
