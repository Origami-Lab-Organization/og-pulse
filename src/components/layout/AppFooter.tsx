import { Link } from 'react-router-dom';
import { NAV, copyrightLine } from '@/landing/content';

const linkClass =
  'rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Rodapé de toda tela do app: copyright com o ano atual e os documentos legais, discreto e fora do caminho. */
export function AppFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-6">
      <span>{copyrightLine()}</span>
      <nav aria-label="Legal" className="flex items-center gap-4">
        <Link to={NAV.terms} className={linkClass}>
          Termos de uso
        </Link>
        <Link to={NAV.privacy} className={linkClass}>
          Privacidade
        </Link>
        <Link to="/ajuda" className={linkClass}>
          Ajuda
        </Link>
      </nav>
    </footer>
  );
}
