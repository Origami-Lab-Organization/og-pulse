import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: React.ErrorInfo | null;
}

/**
 * Boundary de detalhe do projeto. Sem ela, um throw em qualquer aba ou hook
 * desmonta a árvore inteira e a página fica em branco sem stacktrace visível.
 */
export class ProjectDetailErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ProjectDetail] Erro capturado:', error);
    console.error('[ProjectDetail] Stack do componente:', info.componentStack);
    this.setState({ info });
  }

  handleReset = () => this.setState({ hasError: false, error: null, info: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, info } = this.state;
    return (
      <div className="mx-auto max-w-3xl space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-destructive">
            Erro ao renderizar o projeto
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Detalhes abaixo — copie e envie ao time se o problema persistir.
          </p>
        </div>

        <pre className="max-h-64 overflow-auto rounded-md bg-background p-3 text-xs text-foreground">
          {error?.name}: {error?.message}
          {error?.stack ? `\n\n${error.stack}` : ''}
          {info?.componentStack ? `\n\nComponente:${info.componentStack}` : ''}
        </pre>

        <div className="flex gap-2">
          <Button variant="outline" onClick={this.handleReset}>Tentar novamente</Button>
          <Button onClick={() => window.location.assign('/projetos')}>Voltar ao Portfólio</Button>
        </div>
      </div>
    );
  }
}
