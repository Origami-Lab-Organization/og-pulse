import { AlarmClock, Bell, NotebookPen, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductNewsArt as ProductNewsArtKey } from '@/types/productNews';

/**
 * Arte ilustrativa do banner: igual para todo mundo, sem nenhum dado real da empresa.
 * Cartões em `bg-card` para acompanharem o tema; o fundo do banner é fixo (escala green).
 */
const CARD = 'absolute rounded-lg bg-card text-card-foreground shadow-lg ring-1 ring-border';
const CAPTION = 'flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground';

function NoteCard() {
  return (
    <div className={cn(CARD, 'left-0 top-1 w-[146px] -rotate-3 px-3 py-2.5')}>
      <p className={CAPTION}>
        <NotebookPen className="h-2.5 w-2.5" />
        Nota
      </p>
      <p className="mt-1 flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold">
        <Pin className="h-3 w-3 shrink-0 text-primary" />
        Ata do kickoff
      </p>
      <p className="mt-0.5 whitespace-nowrap text-[10px] text-muted-foreground">Fase 2 aprovada</p>
      <p className="mt-1 whitespace-nowrap text-[9.5px] text-muted-foreground">Com 2 pessoas</p>
    </div>
  );
}

function BellCard() {
  return (
    <div className={cn(CARD, 'right-0 top-0 w-[112px] rotate-6 px-2.5 py-2')}>
      <p className={CAPTION}>
        <span className="relative">
          <Bell className="h-2.5 w-2.5" />
          <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
        </span>
        Agora
      </p>
      <p className="mt-1 text-[11px] font-semibold leading-tight">Nova nota para você</p>
    </div>
  );
}

function KanbanChip() {
  return (
    <div className={cn(CARD, 'bottom-0 left-10 flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-[10.5px] font-medium')}>
      <AlarmClock className="h-3 w-3 shrink-0 text-primary" />
      Reunião com cliente · hoje 15h
    </div>
  );
}

const ARTS: Record<ProductNewsArtKey, () => JSX.Element> = {
  'meu-espaco': () => (
    <>
      <NoteCard />
      <BellCard />
      <KanbanChip />
    </>
  ),
};

interface ProductNewsArtProps {
  art: ProductNewsArtKey;
}

export function ProductNewsArt(props: ProductNewsArtProps) {
  const { art } = props;
  const Art = ARTS[art];
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto mb-4 h-[132px] w-[240px] max-w-full max-sm:[@media(max-height:700px)]:hidden
                 sm:col-start-2 sm:row-start-1 sm:mb-0 sm:self-center sm:justify-self-end"
    >
      <Art />
    </div>
  );
}
