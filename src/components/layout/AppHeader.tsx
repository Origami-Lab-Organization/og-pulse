import type { ReactNode } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NotesButton } from '@/components/notes/NotesButton';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { UserMenu } from './UserMenu';

/** Título da página na própria barra, quando ela usa o cabeçalho compacto. */
interface AppHeaderPage {
  title: string;
  description?: string;
  actions?: ReactNode;
}

interface AppHeaderProps {
  /** Presente = cabeçalho compacto: título, descrição e ações sobem para esta barra. */
  page?: AppHeaderPage;
}

function PageTitle({ page }: { page: AppHeaderPage }) {
  return (
    <div className="flex min-w-0 items-baseline gap-3">
      <h1 className="shrink-0 font-semibold text-foreground">{page.title}</h1>
      {page.description && (
        <p className="hidden min-w-0 truncate text-sm text-muted-foreground lg:block">
          {page.description}
        </p>
      )}
    </div>
  );
}

/**
 * Cabeçalho do app, no desktop e no celular (ADR-0051): à direita, o sino, as notas e o
 * avatar com o menu da conta (saiu do rodapé da barra lateral em 21/10/2026), de
 * qualquer tela. No celular, à esquerda, o botão que abre o menu — o que a barra antiga fazia.
 * Com `page`, a barra também leva o título, a descrição e as ações da página — desde
 * 21/10/2026 é assim em todas as telas, que não têm mais bloco de cabeçalho próprio.
 */
export function AppHeader(props: AppHeaderProps) {
  const { page } = props;
  return (
    <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b bg-background px-4">
      <SidebarTrigger className="md:hidden" />
      {page ? (
        <PageTitle page={page} />
      ) : (
        <span className="font-semibold text-foreground md:hidden">Pulse</span>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {page?.actions && <div className="mr-2 flex items-center gap-2">{page.actions}</div>}
        <NotificationBell />
        <NotesButton />
        <UserMenu />
      </div>
    </header>
  );
}
