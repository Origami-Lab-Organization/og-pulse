import { Construction } from 'lucide-react';
import logo from '@/assets/logo.png';

/**
 * Página pública "Em construção".
 * Exibida na raiz quando o acesso vem pelo domínio institucional
 * (origamipulse.com.br) — não exige autenticação.
 */
const SiteUnderConstruction = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <img src={logo} alt="Origami Lab" className="h-12 w-auto" />
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Construction className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Em construção</h1>
      </div>
    </div>
  );
};

export default SiteUnderConstruction;
