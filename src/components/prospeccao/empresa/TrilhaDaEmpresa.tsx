import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { OrigemDaPagina } from '@/types/paginaDaEmpresa';

/**
 * Trilha da página da empresa na barra do topo (US-0053): "Comercial › Empresas". "Empresas"
 * volta para a lista; vindo de uma lista do Pulse, pelo histórico, no mesmo ponto e na hora.
 */
export function TrilhaDaEmpresa() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: OrigemDaPagina | null };
  const voltar = () => (state?.de ? navigate(-1) : navigate('/comercial/empresas'));
  return (
    <nav aria-label="Trilha" className="flex min-w-0 items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">Comercial</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <button
        type="button"
        onClick={voltar}
        className="rounded-sm font-semibold text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Empresas
      </button>
    </nav>
  );
}
