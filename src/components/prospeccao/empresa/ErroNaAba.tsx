import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Estado {
  erro: Error | null;
}

/**
 * Um erro numa aba da página da empresa fica nela (26/11/2026): sem isto, a árvore inteira
 * desmonta e a tela fica em branco. A mensagem ajuda o time a achar a causa.
 */
export class ErroNaAba extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('[EmpresaPage] Erro na aba:', erro, info.componentStack);
  }

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;
    return (
      <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-[14px] font-semibold text-destructive">Esta aba não carregou.</p>
        <pre className="max-h-40 overflow-auto rounded-md bg-background p-2 text-xs">{erro.name}: {erro.message}</pre>
        <Button variant="outline" size="sm" onClick={() => this.setState({ erro: null })}>Tentar de novo</Button>
      </div>
    );
  }
}
