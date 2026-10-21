import { CalendarDays, Check, Folder, FolderInput, Mail, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductNewsArt as ProductNewsArtKey } from '@/types/productNews';

/**
 * Arte ilustrativa do banner: igual para todo mundo, sem nenhum dado real da empresa.
 * Cartões em `bg-card` para acompanharem o tema; o fundo do banner é fixo (escala green).
 */
const CARD = 'absolute rounded-lg bg-card text-card-foreground shadow-lg ring-1 ring-border';

function EmailCard() {
  return (
    <div className={cn(CARD, 'left-0 top-1 w-[146px] -rotate-3 px-3 py-2.5')}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Caixa de entrada
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold">
        <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
        Cliente Alfa
      </p>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">Aprovado o escopo da fase 2</p>
      <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[9.5px] font-medium text-primary-foreground">
        <FolderInput className="h-2.5 w-2.5" />
        Salvar no projeto
      </span>
    </div>
  );
}

function MeetingCard() {
  return (
    <div className={cn(CARD, 'right-0 top-0 w-[112px] rotate-6 px-2.5 py-2')}>
      <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        <CalendarDays className="h-2.5 w-2.5" />
        Hoje
      </p>
      <p className="mt-1 text-[11px] font-semibold tabular-nums">09:30 Daily</p>
      <p className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[9.5px] text-primary">
        <Video className="h-2.5 w-2.5" />
        Entrar no Teams
      </p>
    </div>
  );
}

function ProjectFolderChip() {
  return (
    <div className={cn(CARD, 'bottom-1 left-12 flex items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] font-medium')}>
      <Folder className="h-3 w-3 shrink-0 text-muted-foreground" />
      Projeto Alfa › E-mails
      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="h-2.5 w-2.5" />
      </span>
    </div>
  );
}

const ARTS: Record<ProductNewsArtKey, () => JSX.Element> = {
  outlook: () => (
    <>
      <EmailCard />
      <MeetingCard />
      <ProjectFolderChip />
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
