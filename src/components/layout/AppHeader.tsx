import { SidebarTrigger } from '@/components/ui/sidebar';
import { NotesButton } from '@/components/notes/NotesButton';
import { NotificationBell } from '@/components/notifications/NotificationBell';

/**
 * Cabeçalho do app, no desktop e no celular (ADR-0051): à direita, o sino e as notas, de
 * qualquer tela. No celular, à esquerda, o botão que abre o menu — o que a barra antiga fazia.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b bg-background px-4">
      <SidebarTrigger className="md:hidden" />
      <span className="font-semibold text-foreground md:hidden">Pulse</span>
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <NotesButton />
      </div>
    </header>
  );
}
