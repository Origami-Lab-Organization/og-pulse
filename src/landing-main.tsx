import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';
import NotFound from '@/pages/NotFound';
import Privacy from '@/pages/Privacy';
import PublicContent from '@/pages/PublicContent';
import PublicGuides from '@/pages/PublicGuides';
import Terms from '@/pages/Terms';
import { NAV } from '@/landing/content';
import { startVisitorAnalytics } from '@/lib/analytics';
import { hasStoredSession } from '@/lib/session';
import './index.css';

/**
 * Entrada do site público — home, páginas de conteúdo, legais e 404.
 *
 * Existe separada de `main.tsx` porque a vitrine não pode carregar o app: `App.tsx`
 * importa as ~43 páginas do produto estaticamente, e enquanto os dois dividiam o mesmo
 * entry uma página de marketing baixava o ERP inteiro (4,98 MB / 1,33 MB gzip). Peso
 * assim derruba INP e LCP no celular, que são sinal de ranqueamento, e gasta o
 * rastreio do Google onde ele já é escasso.
 *
 * Aqui não entram Supabase, MSAL, TanStack Query, providers de tema/tooltip nem
 * service worker: nenhuma página pública usa. O espelho das rotas é
 * `src/landing/prerender-entry.tsx`, que pré-renderiza estas mesmas telas no build —
 * rota nova precisa entrar nos dois.
 */

/**
 * Quem tem sessão e abre a raiz vai para o app, como o `RootEntry` fazia quando `/`
 * era servida pelo bundle do produto. A checagem é no localStorage, sem rede: o
 * destino final por papel continua com o app.
 */
function redirecionaQuemTemSessao(): boolean {
  if (window.location.pathname !== '/' || !hasStoredSession()) return false;
  window.location.replace('/dashboard');
  return true;
}

if (!redirecionaQuemTemSessao()) {
  startVisitorAnalytics();

  createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path={NAV.terms} element={<Terms />} />
        <Route path={NAV.privacy} element={<Privacy />} />
        {/* Antes de `/:slug`: o hub tem página própria, não é uma página de conteúdo. */}
        <Route path={NAV.guides} element={<PublicGuides />} />
        <Route path="/:slug" element={<PublicContent />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>,
  );
}
