import { ReactNode } from 'react';

/**
 * Até 29/09/2026 o app instalado (PWA) abria só Timesheet e Meu Kanban e mandava o resto de
 * volta com "disponível apenas no navegador". Agora tudo funciona no celular (ADR-0043):
 * o guard não bloqueia mais rota nenhuma. O que continua restrito é o cache offline, que
 * segue só na allowlist do service worker (src/sw.ts, ADR-0004) — as outras telas
 * funcionam online, sem guardar resposta no aparelho.
 */
export function PwaRouteGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
