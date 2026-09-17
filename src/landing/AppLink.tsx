import type { ReactNode } from 'react';

/**
 * Link do site público para uma rota do app (entrar, cadastrar).
 *
 * É `<a>`, e não o `<Link>` do react-router, de propósito: o site público e o app
 * são dois bundles separados (`index.html` → `landing-main.tsx`, `app.html` →
 * `main.tsx`). Um `<Link>` aqui tentaria resolver `/login` dentro do roteador
 * público — que não conhece essa rota — e cairia na 404 sem sair da página.
 * A navegação de página inteira é o que carrega o app.
 */
export function AppLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return (
    <a href={to} className={className}>
      {children}
    </a>
  );
}
